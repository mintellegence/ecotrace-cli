/**
 * EcoTrace-CLI Full-Stack Express Server & Webhook Receiver
 * Listens on port 3000, handles e-commerce webhooks, runs GLEC audits, and mounts Vite.
 */

import express, { Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { AdapterRegistry } from './src/adapters/index.ts';
import { CliCommandHandler, DEFAULT_CONFIG } from './src/cli/commands.ts';
import { INITIAL_SAMPLE_ORDERS, SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from './src/data/sampleOrders.ts';
import { CarbonCalculator } from './src/engine/calculator.ts';
import { DEFAULT_EMISSION_FACTORS } from './src/engine/emissionFactors.ts';
import { KiroAgentRunner } from './src/kiro/agentRunner.ts';
import { KIRO_AGENT_SPEC } from './src/kiro/specs.ts';
import { EmissionAuditResult, UnifiedOrder } from './src/types/index.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware for parsing JSON and raw bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory Carbon Ledger and Ingested Order Store
let ledgerOrders: UnifiedOrder[] = [...INITIAL_SAMPLE_ORDERS];
let auditHistory: EmissionAuditResult[] = ledgerOrders.map((o) => CarbonCalculator.auditOrder(o));
const webhookLogs: Array<{
  id: string;
  timestamp: string;
  platform: string;
  orderId: string;
  status: 'received' | 'normalized' | 'audited' | 'error';
  emissionKgCO2?: number;
  rating?: string;
  summary: string;
}> = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    platform: 'shopify',
    orderId: '#SH-1040',
    status: 'audited',
    emissionKgCO2: 14.49,
    rating: 'F',
    summary: 'Shopify order #SH-1040 ingested. High emission air freight detected (14.49 kg CO2e).',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    platform: 'woocommerce',
    orderId: 'WC-28488',
    status: 'audited',
    emissionKgCO2: 0.06,
    rating: 'A',
    summary: 'WooCommerce order WC-28488 normalized to UnifiedOrder. Low emission rail freight verified.',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
    platform: 'shopify',
    orderId: '#SH-1041',
    status: 'audited',
    emissionKgCO2: 0.0,
    rating: 'A',
    summary: 'Shopify local delivery #SH-1041 processed. Zero-emission Electric Van validated.',
  },
];

// Helper to audit and store
function ingestAndAudit(order: UnifiedOrder) {
  const audit = CarbonCalculator.auditOrder(order);
  ledgerOrders.unshift(order);
  auditHistory.unshift(audit);

  webhookLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    platform: order.platform,
    orderId: order.orderId,
    status: 'audited',
    emissionKgCO2: audit.breakdown.emissionKgCO2,
    rating: audit.auditRating,
    summary: `${order.platform.toUpperCase()} order ${order.orderId} normalized: ${order.totalWeightKg}kg via ${order.carrier} (${audit.breakdown.distanceKm}km). Emission: ${audit.breakdown.emissionKgCO2} kg CO2e [Grade ${audit.auditRating}].`,
  });

  return audit;
}

// ==========================================
// 1. E-Commerce Webhook Endpoints
// ==========================================

// Shopify Webhook Listener
app.post('/api/webhooks/shopify', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const { order } = AdapterRegistry.normalize(payload, req.headers as any, 'shopify');
    const audit = ingestAndAudit(order);

    res.status(200).json({
      success: true,
      message: 'Shopify webhook processed successfully',
      normalizedOrder: order,
      carbonAudit: audit,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// WooCommerce Webhook Listener
app.post('/api/webhooks/woocommerce', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const { order } = AdapterRegistry.normalize(payload, req.headers as any, 'woocommerce');
    const audit = ingestAndAudit(order);

    res.status(200).json({
      success: true,
      message: 'WooCommerce webhook processed successfully',
      normalizedOrder: order,
      carbonAudit: audit,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Generic / Direct Order Ingestion
app.post('/api/webhooks/generic', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const { order } = AdapterRegistry.normalize(payload, req.headers as any);
    const audit = ingestAndAudit(order);

    res.status(200).json({
      success: true,
      normalizedOrder: order,
      carbonAudit: audit,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. Audit & Analytics API Routes
// ==========================================

app.get('/api/orders', (_req: Request, res: Response) => {
  res.json({
    orders: ledgerOrders,
    audits: auditHistory,
    logs: webhookLogs,
  });
});

app.get('/api/audit/summary', (_req: Request, res: Response) => {
  const { summary } = KiroAgentRunner.runAudit(ledgerOrders);
  res.json({
    summary,
    emissionFactors: DEFAULT_EMISSION_FACTORS,
  });
});

app.post('/api/audit/reset', (_req: Request, res: Response) => {
  ledgerOrders = [...INITIAL_SAMPLE_ORDERS];
  auditHistory = ledgerOrders.map((o) => CarbonCalculator.auditOrder(o));
  res.json({ success: true, count: ledgerOrders.length });
});

// Raw Calculation Endpoint
app.post('/api/calculate', (req: Request, res: Response) => {
  const { distanceKm, weightKg, carrier, mode } = req.body;
  if (!distanceKm || !weightKg) {
    return res.status(400).json({ error: 'distanceKm and weightKg are required' });
  }

  const breakdown = CarbonCalculator.calculateRaw(
    Number(distanceKm),
    Number(weightKg),
    mode || (carrier ? undefined : 'road_truck')
  );

  res.json({ breakdown });
});

// ==========================================
// 3. Git Repository & Remote Synchronization
// ==========================================

import { execSync } from 'child_process';

app.get('/api/git/status', (_req: Request, res: Response) => {
  try {
    const lastCommit = execSync('git log -1 --format="%h|%s|%an|%ae|%cd"', { encoding: 'utf-8' }).trim();
    const [hash, msg, author, email, date] = lastCommit.split('|');
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim() || 'main';
    const remotes = execSync('git remote -v', { encoding: 'utf-8' }).trim();

    res.json({
      success: true,
      branch,
      configuredUser: { name: author || 'Sharif Hussain', email: email || 'sm.sharifhussain@gmail.com' },
      lastCommit: { hash, message: msg, author, email, date },
      remotes: remotes ? remotes.split('\n') : [],
      hasRemote: remotes.length > 0,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/git/push', (req: Request, res: Response) => {
  const { remoteUrl, token, branch = 'main' } = req.body;

  if (!remoteUrl || typeof remoteUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'Repository URL is required.' });
  }

  const cleanUrl = remoteUrl.trim();

  // Safeguard: Ensure user target is specifically GitHub (NO GitLab or BitBucket per official rules)
  if (!cleanUrl.includes('github.com')) {
    return res.status(400).json({
      success: false,
      error: 'Official rule violation: Only Public GitHub repositories are permitted (NO GitLab or BitBucket).'
    });
  }

  try {
    // 1. Ensure git config author is strictly the user's account
    execSync('git config user.name "Sharif Hussain"', { stdio: 'pipe' });
    execSync('git config user.email "sm.sharifhussain@gmail.com"', { stdio: 'pipe' });

    // 2. Stage and commit any pending changes
    try {
      execSync('git add -A', { stdio: 'pipe' });
      execSync('git commit -m "feat: sync EcoTrace-CLI updates" --author="Sharif Hussain <sm.sharifhussain@gmail.com>"', { stdio: 'pipe' });
    } catch {
      // Nothing new to commit, which is fine
    }

    // 3. Prepare authenticated remote URL if Personal Access Token is supplied
    let targetPushUrl = cleanUrl;
    if (token && cleanUrl.startsWith('https://')) {
      const stripped = cleanUrl.replace(/^https:\/\//, '');
      // Format: https://<token>@github.com/<owner>/<repo>.git
      targetPushUrl = `https://${token.trim()}@${stripped}`;
    }

    // 4. Update git remote
    try {
      execSync('git remote remove origin', { stdio: 'pipe' });
    } catch {
      // Origin might not exist yet
    }
    execSync(`git remote add origin ${targetPushUrl}`, { stdio: 'pipe' });

    // 5. Push to user's remote repository (using --force to replace any initial repo placeholder on GitHub)
    const pushOutput = execSync(`git push -u origin ${branch} --force`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    res.json({
      success: true,
      message: `Successfully pushed repository to ${cleanUrl} on branch ${branch}!`,
      output: pushOutput || 'Everything up-to-date',
    });
  } catch (err: any) {
    const errorText = err.stderr?.toString() || err.message || 'Push failed';
    res.status(500).json({
      success: false,
      error: errorText,
      hint: errorText.includes('Authentication') || errorText.includes('Permission')
        ? 'Authentication required. Ensure your GitHub Personal Access Token has "repo" scope, or run "git push" from your authenticated terminal.'
        : undefined,
    });
  }
});

// ==========================================
// 4. Kiro Autonomous Agent Specs & Hooks
// ==========================================

app.get('/api/kiro/specs', (_req: Request, res: Response) => {
  res.json({
    spec: KIRO_AGENT_SPEC,
    config: DEFAULT_CONFIG,
    steeringDirectivePath: '.kiro/steering/eco-steering.md',
    hookPath: '.kiro/hooks/audit-hook.json',
  });
});

app.post('/api/kiro/run', (_req: Request, res: Response) => {
  const { summary, results } = KiroAgentRunner.runAudit(ledgerOrders);
  const terminalText = KiroAgentRunner.generateTerminalReport(summary);

  res.json({
    success: true,
    triggeredAt: new Date().toISOString(),
    auditedCount: results.length,
    summary,
    terminalReport: terminalText,
  });
});


// Simulated CLI Command Execution for the in-browser Terminal Emulator
app.post('/api/cli/execute', (req: Request, res: Response) => {
  const { command } = req.body;
  const trimmed = (command || '').trim();

  if (!trimmed) {
    return res.json({ output: '' });
  }

  const parts = trimmed.split(/\s+/);
  const baseCmd = parts[0] === 'ecotrace' ? parts[1] || '' : parts[0];

  switch (baseCmd) {
    case '':
    case 'help':
    case '--help':
    case '-h':
      return res.json({
        output: `Usage: ecotrace [command] [options]

Commands:
  init                     Initialize EcoTrace configuration and Kiro agent hooks
  calculate, calc          Calculate emissions: E = d * w * f
  audit                    Scan ingested store orders and generate audit scorecard
  listen                   Inspect active webhook listener on port ${PORT}
  kiro <specs|run|status>  Kiro autonomous agent background routines
  test-webhook <shopify|woocommerce> Simulate mock e-commerce payload
  clear                    Clear the terminal screen`,
      });

    case 'init': {
      const { message } = CliCommandHandler.handleInit();
      return res.json({ output: message });
    }

    case 'calculate':
    case 'calc': {
      let dist = 850;
      let wt = 3.5;
      let carrier = 'FedEx Ground';

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '-d' || parts[i] === '--distance') dist = parseFloat(parts[i + 1]) || dist;
        if (parts[i] === '-w' || parts[i] === '--weight') wt = parseFloat(parts[i + 1]) || wt;
        if (parts[i] === '-c' || parts[i] === '--carrier') carrier = parts.slice(i + 1).join(' ') || carrier;
      }

      const out = CliCommandHandler.handleCalculate({ distanceKm: dist, weightKg: wt, carrier });
      return res.json({ output: out });
    }

    case 'audit': {
      const { summary } = KiroAgentRunner.runAudit(ledgerOrders);
      return res.json({ output: KiroAgentRunner.generateTerminalReport(summary) });
    }

    case 'listen': {
      return res.json({
        output: `[WEBHOOK LISTENER ACTIVE]
  • Shopify Endpoint:     http://localhost:${PORT}/api/webhooks/shopify
  • WooCommerce Endpoint: http://localhost:${PORT}/api/webhooks/woocommerce
  • Generic Endpoint:     http://localhost:${PORT}/api/webhooks/generic
  • Mode:                 Normalized GLEC V3 Ingestion
  • Background Hooks:     Kiro Auto-Audit enabled`,
      });
    }

    case 'kiro': {
      const sub = parts[2] || 'specs';
      if (sub === 'run') {
        const { summary } = KiroAgentRunner.runAudit(ledgerOrders);
        return res.json({
          output: `[KIRO AGENT] Triggering autonomous background carbon audit pass...\n\n${KiroAgentRunner.generateTerminalReport(summary)}\n\n[KIRO AGENT] Ledger synchronized with 0 errors.`,
        });
      } else if (sub === 'specs') {
        return res.json({ output: CliCommandHandler.handleKiroSpecs() });
      } else {
        return res.json({
          output: `[KIRO AGENT STATUS]
  • Agent ID:      ecotrace-auditor v1.0.0
  • Category:      Skeleton Crew
  • Webhook Hook:  .kiro/hooks/audit-hook.json [ACTIVE]
  • Steering:      .kiro/steering/eco-steering.md [LOADED]
  • Auto-Audit:    ENABLED (Trigger on order.created)`,
        });
      }
    }

    case 'test-webhook': {
      const platform = parts[2] === 'woocommerce' ? 'woocommerce' : 'shopify';
      const payload = platform === 'woocommerce' ? SAMPLE_WOOCOMMERCE_WEBHOOK : SAMPLE_SHOPIFY_WEBHOOK;
      const { order, report } = CliCommandHandler.handleNormalizeTest(payload);
      ingestAndAudit(order);
      return res.json({
        output: `[SIMULATION DISPATCHED]\n${report}\n\n[OK] Order ${order.orderId} appended to active ledger.`,
      });
    }

    default:
      return res.json({
        output: `ecotrace: command not recognized: "${trimmed}". Type "ecotrace help" for list of commands.`,
      });
  }
});

// ==========================================
// 4. Vite Mounting for Frontend Development
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[EcoTrace-CLI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
