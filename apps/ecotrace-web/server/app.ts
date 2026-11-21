/**
 * HTTP API of the EcoTrace web app, as a factory so tests can create isolated instances.
 *
 * Security model (see SECURITY.md):
 *  - Platform webhooks are authenticated with HMAC-SHA256 signatures and fail closed.
 *  - Public sandbox endpoints are stateless (or add to a demo ledger in demo mode).
 *  - Reading the ledger can be protected with ECOTRACE_READ_TOKEN.
 *  - Destructive actions (reset) require ECOTRACE_ADMIN_TOKEN unless in demo mode.
 *  - No endpoint executes shell commands or touches git.
 */

import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { AdapterRegistry } from '../../../foundation/adapters/index.ts';
import { getDefaultOrigin } from '../../../foundation/config/origin.ts';
import { INITIAL_SAMPLE_ORDERS, SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from '../../../foundation/data/sampleOrders.ts';
import { CarbonCalculator } from '../../../foundation/engine/calculator.ts';
import { DEFAULT_EMISSION_FACTORS, inferTransportMode } from '../../../foundation/engine/emissionFactors.ts';
import { parseDistanceKm, parseWeightKg, ValidationError } from '../../../foundation/engine/validation.ts';
import { KiroAgentRunner } from '../../../foundation/kiro/agentRunner.ts';
import { KIRO_AGENT_SPEC, KIRO_FILES } from '../../../foundation/kiro/specs.ts';
import { TransportMode } from '../../../foundation/types/index.ts';
import { CliCommandHandler, DEFAULT_CONFIG } from '../../ecotrace-cli/src/commands.ts';
import { Ledger } from './ledger.ts';
import {
  hasValidBearerToken,
  RawBodyRequest,
  rateLimit,
  requireWebhookSignature,
  securityHeaders,
  WebhookAuthConfig,
} from './security.ts';

export interface AppConfig {
  isProduction: boolean;
  demoMode: boolean;
  readToken?: string;
  adminToken?: string;
  webhookAuth: WebhookAuthConfig;
  ledgerFile?: string;
  trustProxy: number;
  rateLimits: { api: number; webhooks: number; sandbox: number };
  /** Repository root, used to serve the whitelisted /.kiro files. */
  repoRoot?: string;
}

/** Builds the configuration from environment variables. */
export function configFromEnv(env: NodeJS.ProcessEnv, repoRoot: string): AppConfig {
  const isProduction = env.NODE_ENV === 'production';
  const demoMode = env.ECOTRACE_DEMO_MODE === 'true';
  return {
    isProduction,
    demoMode,
    readToken: env.ECOTRACE_READ_TOKEN?.trim() || undefined,
    adminToken: env.ECOTRACE_ADMIN_TOKEN?.trim() || undefined,
    webhookAuth: {
      shopifySecret: env.SHOPIFY_WEBHOOK_SECRET?.trim() || undefined,
      wooSecret: env.WOOCOMMERCE_WEBHOOK_SECRET?.trim() || undefined,
      // Never honoured in production.
      allowUnsigned: !isProduction && env.ECOTRACE_ALLOW_UNSIGNED_WEBHOOKS === 'true',
    },
    ledgerFile: demoMode ? undefined : path.resolve(repoRoot, env.ECOTRACE_LEDGER_FILE || '.ecotrace/ledger.json'),
    trustProxy: Number(env.TRUST_PROXY ?? (isProduction ? 1 : 0)),
    rateLimits: { api: 120, webhooks: 600, sandbox: 30 },
    repoRoot,
  };
}

const MAX_COMMAND_LENGTH = 300;

function readFlag(parts: string[], names: string[]): string | undefined {
  const i = parts.findIndex((p) => names.includes(p));
  return i !== -1 ? parts[i + 1] : undefined;
}

export function createApp(cfg: AppConfig): { app: Express; ledger: Ledger } {
  const ledger = new Ledger({ file: cfg.ledgerFile });
  if (cfg.demoMode && ledger.orders.length === 0) ledger.replaceAll(INITIAL_SAMPLE_ORDERS);

  const app = express();
  app.disable('x-powered-by');
  // Behind Render / other reverse proxies, trust the first hop so req.ip is the real client.
  app.set('trust proxy', cfg.trustProxy);
  app.use(securityHeaders(cfg.isProduction));

  // Keep the exact raw bytes for HMAC verification; cap body size.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = Buffer.from(buf);
      },
    })
  );

  const apiLimiter = rateLimit({ windowMs: 60_000, max: cfg.rateLimits.api });
  const webhookLimiter = rateLimit({ windowMs: 60_000, max: cfg.rateLimits.webhooks });
  const sandboxLimiter = rateLimit({
    windowMs: 60_000,
    max: cfg.rateLimits.sandbox,
    message: 'Sandbox rate limit reached. Try again in a minute.',
  });
  app.use('/api', (req, res, next) => (req.path.startsWith('/webhooks/') ? webhookLimiter : apiLimiter)(req, res, next));

  /** Wraps a handler so thrown errors reach the central error handler. */
  const route =
    (fn: (req: Request, res: Response) => unknown) =>
    (req: Request, res: Response, next: NextFunction) => {
      try {
        fn(req, res);
      } catch (err) {
        next(err);
      }
    };

  const canRead = (req: Request) =>
    !cfg.readToken || hasValidBearerToken(req, cfg.readToken) || hasValidBearerToken(req, cfg.adminToken);

  const requireRead = (req: Request, res: Response, next: NextFunction) => {
    if (canRead(req)) return next();
    res.status(401).json({ success: false, error: 'Dashboard token required.' });
  };

  const requireAdminOrDemo = (req: Request, res: Response, next: NextFunction) => {
    if (cfg.demoMode || hasValidBearerToken(req, cfg.adminToken)) return next();
    res.status(cfg.adminToken ? 401 : 403).json({
      success: false,
      error: cfg.adminToken ? 'Admin token required.' : 'This action is disabled. Set ECOTRACE_ADMIN_TOKEN to enable it.',
    });
  };

  // ==========================================
  // 1. Signed platform webhooks (real data)
  // ==========================================

  const webhookHandler = (platform: 'shopify' | 'woocommerce') =>
    route((req, res) => {
      // WooCommerce sends a small "ping" body ({ webhook_id }) when a webhook is first saved.
      if (platform === 'woocommerce' && req.body && typeof req.body === 'object' && 'webhook_id' in req.body && !('id' in req.body)) {
        return res.status(200).json({ success: true, message: 'ping acknowledged' });
      }
      const { order } = AdapterRegistry.normalize(req.body, req.headers as Record<string, string>, platform);
      const { audit, duplicate } = ledger.add(order);
      // Platforms only need a fast 2xx; return a minimal summary.
      res.status(200).json({
        success: true,
        duplicate,
        orderId: order.orderId,
        emissionKgCO2: audit.breakdown.emissionKgCO2,
        auditRating: audit.auditRating,
      });
    });

  app.post('/api/webhooks/shopify', requireWebhookSignature('shopify', cfg.webhookAuth), webhookHandler('shopify'));
  app.post('/api/webhooks/woocommerce', requireWebhookSignature('woocommerce', cfg.webhookAuth), webhookHandler('woocommerce'));

  // ==========================================
  // 2. Public sandbox (no secrets; stateless unless demo mode)
  // ==========================================

  app.post(
    '/api/sandbox/normalize',
    sandboxLimiter,
    route((req, res) => {
      const hint = req.query.platform;
      const platform = hint === 'shopify' || hint === 'woocommerce' ? hint : undefined;
      const { order, matchedPlatform } = AdapterRegistry.normalize(req.body, undefined, platform);
      const audit = cfg.demoMode ? ledger.add(order).audit : CarbonCalculator.auditOrder(order);
      const { rawPayload: _raw, ...normalizedOrder } = order;
      res.json({ success: true, matchedPlatform, persisted: cfg.demoMode, normalizedOrder, carbonAudit: audit });
    })
  );

  app.post(
    '/api/calculate',
    route((req, res) => {
      const { distanceKm, weightKg, carrier, mode } = req.body ?? {};
      const d = parseDistanceKm(distanceKm);
      const w = parseWeightKg(weightKg);
      const validModes = Object.keys(DEFAULT_EMISSION_FACTORS) as TransportMode[];
      const resolvedMode: TransportMode =
        typeof mode === 'string' && validModes.includes(mode as TransportMode)
          ? (mode as TransportMode)
          : inferTransportMode(typeof carrier === 'string' ? carrier.slice(0, 120) : '', '');
      res.json({ breakdown: CarbonCalculator.calculateRaw(d, w, resolvedMode) });
    })
  );

  // ==========================================
  // 3. Ledger & analytics
  // ==========================================

  app.get('/api/meta', (_req, res) => {
    res.json({
      demoMode: cfg.demoMode,
      readProtected: Boolean(cfg.readToken),
      adminEnabled: Boolean(cfg.adminToken) || cfg.demoMode,
      persistence: Boolean(cfg.ledgerFile),
      webhooks: {
        shopify: Boolean(cfg.webhookAuth.shopifySecret) || cfg.webhookAuth.allowUnsigned,
        woocommerce: Boolean(cfg.webhookAuth.wooSecret) || cfg.webhookAuth.allowUnsigned,
      },
      origin: getDefaultOrigin(),
    });
  });

  app.get(
    '/api/orders',
    requireRead,
    route((req, res) => {
      const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
      res.json({
        orders: ledger.orders.slice(0, limit),
        audits: ledger.audits.slice(0, limit),
        logs: ledger.logs.slice(0, 50),
        total: ledger.orders.length,
      });
    })
  );

  app.get(
    '/api/audit/summary',
    requireRead,
    route((_req, res) => {
      const { summary } = KiroAgentRunner.runAudit(ledger.orders);
      res.json({ summary, emissionFactors: DEFAULT_EMISSION_FACTORS });
    })
  );

  app.post(
    '/api/audit/reset',
    requireAdminOrDemo,
    route((_req, res) => {
      ledger.replaceAll(cfg.demoMode ? INITIAL_SAMPLE_ORDERS : []);
      res.json({ success: true, count: ledger.orders.length });
    })
  );

  // ==========================================
  // 4. Kiro agent views
  // ==========================================

  // Read the whitelisted /.kiro files once at startup (fixed list: no user-controlled paths).
  const kiroFiles = KIRO_FILES.map((f) => {
    let content: string | null = null;
    if (cfg.repoRoot) {
      try {
        const buf = fs.readFileSync(path.join(cfg.repoRoot, f.path));
        content = buf.length <= 64 * 1024 ? buf.toString('utf-8') : null;
      } catch {
        content = null;
      }
    }
    return { ...f, content };
  });

  app.get('/api/kiro/specs', (_req, res) => {
    res.json({ summary: KIRO_AGENT_SPEC, files: kiroFiles });
  });

  app.post(
    '/api/kiro/run',
    requireRead,
    route((_req, res) => {
      const { summary, results } = KiroAgentRunner.runAudit(ledger.orders);
      res.json({
        success: true,
        triggeredAt: new Date().toISOString(),
        auditedCount: results.length,
        summary,
        terminalReport: KiroAgentRunner.generateTerminalReport(summary),
      });
    })
  );

  // ==========================================
  // 5. Browser terminal: whitelisted commands only, never a shell
  // ==========================================

  app.post(
    '/api/cli/execute',
    sandboxLimiter,
    route((req, res) => {
      const raw = typeof req.body?.command === 'string' ? req.body.command : '';
      if (raw.length > MAX_COMMAND_LENGTH) {
        return res.json({ output: `Command too long (max ${MAX_COMMAND_LENGTH} characters).`, isError: true });
      }
      const parts = raw.trim().split(/\s+/).filter(Boolean);
      if (parts[0] === 'ecotrace') parts.shift();
      const cmd = parts[0] || 'help';

      switch (cmd) {
        case 'help':
        case '--help':
        case '-h':
          return res.json({
            output: `Usage: ecotrace <command> [options]

  calculate -d <km> -w <kg> [-c <carrier>]   Emissions for one shipment
  audit                                      Audit the dashboard ledger
  test-webhook <shopify|woocommerce>         Normalize a sample payload
  kiro <specs|run>                           Kiro agent spec / audit pass
  listen                                     Show webhook endpoints
  clear                                      Clear the screen

The full CLI (audit your own CSV/JSON, send signed webhooks, verify a deployment):
  git clone https://github.com/mintellegence/ecotrace-cli && cd ecotrace-cli && npm install
  npm run cli -- audit examples/orders.csv`,
          });

        case 'calculate':
        case 'calc': {
          const cIdx = parts.findIndex((p) => p === '-c' || p === '--carrier');
          const carrier = cIdx !== -1 ? parts.slice(cIdx + 1).join(' ').replace(/^["']|["']$/g, '') : 'Ground';
          try {
            const out = CliCommandHandler.handleCalculate({
              distanceKm: Number(readFlag(parts, ['-d', '--distance'])),
              weightKg: Number(readFlag(parts, ['-w', '--weight'])),
              carrier: carrier.slice(0, 120),
            });
            return res.json({ output: out });
          } catch (e) {
            if (e instanceof ValidationError) {
              return res.json({
                output: `[ERROR] ${e.message}\nExample: ecotrace calculate -d 1200 -w 4.2 -c "UPS Next Day Air"`,
                isError: true,
              });
            }
            throw e;
          }
        }

        case 'audit': {
          if (!canRead(req)) return res.json({ output: '[ERROR] Dashboard token required to audit this ledger.', isError: true });
          if (ledger.orders.length === 0) {
            return res.json({ output: '[INFO] Ledger is empty. Connect a store webhook or run "test-webhook shopify".' });
          }
          const { summary } = KiroAgentRunner.runAudit(ledger.orders);
          return res.json({ output: KiroAgentRunner.generateTerminalReport(summary) });
        }

        case 'listen':
          return res.json({
            output: `[WEBHOOK RECEIVER]
  Shopify:     POST /api/webhooks/shopify      (${cfg.webhookAuth.shopifySecret ? 'HMAC verified' : 'not configured'})
  WooCommerce: POST /api/webhooks/woocommerce  (${cfg.webhookAuth.wooSecret ? 'HMAC verified' : 'not configured'})
  Ledger:      ${cfg.ledgerFile ? 'persisted to disk' : 'in memory (demo)'}`,
          });

        case 'kiro': {
          const sub = parts[1] || 'specs';
          if (sub === 'specs') return res.json({ output: CliCommandHandler.handleKiroSpecs() });
          if (sub === 'run') {
            if (!canRead(req)) return res.json({ output: '[ERROR] Dashboard token required.', isError: true });
            const { summary } = KiroAgentRunner.runAudit(ledger.orders);
            return res.json({
              output: `[KIRO AGENT] Audit pass over ${ledger.orders.length} orders\n\n${KiroAgentRunner.generateTerminalReport(summary)}`,
            });
          }
          return res.json({ output: 'Usage: kiro <specs|run>', isError: true });
        }

        case 'test-webhook': {
          const platform = parts[1] === 'woocommerce' ? 'woocommerce' : 'shopify';
          const payload = platform === 'woocommerce' ? SAMPLE_WOOCOMMERCE_WEBHOOK : SAMPLE_SHOPIFY_WEBHOOK;
          const { order, report } = CliCommandHandler.handleNormalizeTest(payload);
          if (cfg.demoMode) ledger.add(order);
          return res.json({
            output: `[SAMPLE PAYLOAD]\n${report}\n\n${
              cfg.demoMode ? `[OK] ${order.orderId} is in the demo ledger.` : '[INFO] Sandbox only: not added to the ledger.'
            }`,
          });
        }

        default:
          return res.json({ output: `Unknown command "${cmd.slice(0, 40)}". Type "help".`, isError: true });
      }
    })
  );

  // Unknown API routes: JSON 404 instead of the SPA fallback.
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return { app, ledger };
}

/** Central error handler: client errors are 4xx; nothing else leaks internals. Register last. */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ValidationError) return res.status(400).json({ success: false, error: err.message });
  if (err?.type === 'entity.too.large') return res.status(413).json({ success: false, error: 'Payload too large.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: 'Invalid JSON body.' });
  if (err instanceof Error && /Payload must be a JSON object/.test(err.message)) {
    return res.status(400).json({ success: false, error: err.message });
  }
  console.error('[server] unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
}
