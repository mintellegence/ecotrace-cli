/**
 * HTTP integration tests for the web app's security behaviour.
 * Each test starts an isolated server on a random port.
 */
import crypto from 'node:crypto';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from '../foundation/data/sampleOrders.ts';
import { AppConfig, createApp, errorHandler } from '../apps/ecotrace-web/server/app.ts';
import { baseString, buildPayload, parseBaseUrl, sign } from '../apps/ecotrace-cli/src/live.ts';

const SHOP_SECRET = 'test-shopify-secret';
const WOO_SECRET = 'test-woo-secret';

const servers: http.Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

function baseConfig(over: Partial<AppConfig> = {}): AppConfig {
  return {
    isProduction: true,
    demoMode: false,
    webhookAuth: { shopifySecret: SHOP_SECRET, wooSecret: WOO_SECRET, allowUnsigned: false },
    ledgerFile: undefined,
    trustProxy: 0,
    rateLimits: { api: 1000, webhooks: 1000, sandbox: 1000 },
    ...over,
  };
}

async function start(cfg: AppConfig) {
  const { app, ledger } = createApp(cfg);
  app.use(errorHandler);
  const server = http.createServer(app);
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(base + path, init);
    const text = await res.text();
    return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
  };
  return { call, ledger };
}

const post = (body: string, headers: Record<string, string> = {}): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body,
});

describe('webhook signature verification', () => {
  it('accepts a correctly signed Shopify webhook and stores it', async () => {
    const { call, ledger } = await start(baseConfig());
    const body = JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK);
    const r = await call('/api/webhooks/shopify', post(body, { 'X-Shopify-Hmac-Sha256': sign(body, SHOP_SECRET) }));
    expect(r.status).toBe(200);
    expect(r.json.orderId).toBe('#SH-1042');
    expect(ledger.orders).toHaveLength(1);
  });

  it('accepts a correctly signed WooCommerce webhook', async () => {
    const { call } = await start(baseConfig());
    const body = JSON.stringify(SAMPLE_WOOCOMMERCE_WEBHOOK);
    const r = await call('/api/webhooks/woocommerce', post(body, { 'X-WC-Webhook-Signature': sign(body, WOO_SECRET) }));
    expect(r.status).toBe(200);
  });

  it('rejects missing, wrong and cross-platform signatures', async () => {
    const { call, ledger } = await start(baseConfig());
    const body = JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK);
    expect((await call('/api/webhooks/shopify', post(body))).status).toBe(401);
    expect((await call('/api/webhooks/shopify', post(body, { 'X-Shopify-Hmac-Sha256': sign(body, 'wrong') }))).status).toBe(401);
    expect((await call('/api/webhooks/shopify', post(body, { 'X-Shopify-Hmac-Sha256': sign(body, WOO_SECRET) }))).status).toBe(401);
    expect(ledger.orders).toHaveLength(0);
  });

  it('rejects a body that was modified after signing', async () => {
    const { call } = await start(baseConfig());
    const body = JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK);
    const tampered = body.replace('"total_weight":4200', '"total_weight":1');
    expect(tampered).not.toBe(body);
    const r = await call('/api/webhooks/shopify', post(tampered, { 'X-Shopify-Hmac-Sha256': sign(body, SHOP_SECRET) }));
    expect(r.status).toBe(401);
  });

  it('fails closed (503) when no secret is configured', async () => {
    const { call } = await start(baseConfig({ webhookAuth: { allowUnsigned: false } }));
    const r = await call('/api/webhooks/shopify', post(JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK)));
    expect(r.status).toBe(503);
  });

  it('de-duplicates retried deliveries', async () => {
    const { call, ledger } = await start(baseConfig());
    const body = JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK);
    const headers = { 'X-Shopify-Hmac-Sha256': sign(body, SHOP_SECRET) };
    await call('/api/webhooks/shopify', post(body, headers));
    const again = await call('/api/webhooks/shopify', post(body, headers));
    expect(again.json.duplicate).toBe(true);
    expect(ledger.orders).toHaveLength(1);
  });

  it('does not store customer PII or raw payloads in the ledger', async () => {
    const { call, ledger } = await start(baseConfig());
    const body = JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK);
    await call('/api/webhooks/shopify', post(body, { 'X-Shopify-Hmac-Sha256': sign(body, SHOP_SECRET) }));
    const stored = JSON.stringify(ledger.orders);
    expect(stored).not.toContain('@example.com');
    expect(stored).not.toContain('742 Evergreen Terrace');
    expect(ledger.orders[0].rawPayload).toBeUndefined();
  });
});

describe('access control', () => {
  it('requires the read token for ledger data when configured', async () => {
    const { call } = await start(baseConfig({ readToken: 'r'.repeat(32) }));
    expect((await call('/api/orders')).status).toBe(401);
    expect((await call('/api/orders', { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
    expect((await call('/api/orders', { headers: { Authorization: `Bearer ${'r'.repeat(32)}` } })).status).toBe(200);
  });

  it('blocks ledger reset outside demo mode unless the admin token is sent', async () => {
    const noAdmin = await start(baseConfig());
    expect((await noAdmin.call('/api/audit/reset', { method: 'POST' })).status).toBe(403);

    const withAdmin = await start(baseConfig({ adminToken: 'a'.repeat(32) }));
    expect((await withAdmin.call('/api/audit/reset', { method: 'POST' })).status).toBe(401);
    const ok = await withAdmin.call('/api/audit/reset', { method: 'POST', headers: { Authorization: `Bearer ${'a'.repeat(32)}` } });
    expect(ok.status).toBe(200);
  });

  it('allows reset in demo mode and restores the sample orders', async () => {
    const { call, ledger } = await start(baseConfig({ demoMode: true }));
    const r = await call('/api/audit/reset', { method: 'POST' });
    expect(r.status).toBe(200);
    expect(ledger.orders.length).toBeGreaterThan(0);
  });

  it('serves only the whitelisted /.kiro files, with real content', async () => {
    const { call } = await start(baseConfig({ repoRoot: process.cwd() }));
    const r = await call('/api/kiro/specs');
    expect(r.status).toBe(200);
    const paths: string[] = r.json.files.map((f: any) => f.path);
    expect(paths.every((p) => p.startsWith('.kiro/'))).toBe(true);
    expect(r.json.files.every((f: any) => typeof f.content === 'string' && f.content.length > 0)).toBe(true);
  });

  it('has no git or shell endpoints', async () => {
    const { call } = await start(baseConfig());
    for (const path of ['/api/git/status', '/api/git/push']) {
      expect((await call(path, { method: 'POST' })).status).toBe(404);
      expect((await call(path)).status).toBe(404);
    }
  });
});

describe('input handling and hardening', () => {
  it('validates /api/calculate input', async () => {
    const { call } = await start(baseConfig());
    for (const body of [{ distanceKm: -1, weightKg: 1 }, { distanceKm: 'abc', weightKg: 1 }, { distanceKm: 10 }, {}]) {
      expect((await call('/api/calculate', post(JSON.stringify(body)))).status).toBe(400);
    }
    const ok = await call('/api/calculate', post(JSON.stringify({ distanceKm: 1200, weightKg: 4.2, mode: 'air_freight' })));
    expect(ok.json.breakdown.emissionKgCO2).toBe(3.034);
  });

  it('returns 400 for malformed JSON and 413 for oversized bodies', async () => {
    const { call } = await start(baseConfig());
    expect((await call('/api/calculate', post('{bad'))).status).toBe(400);
    expect((await call('/api/sandbox/normalize', post(JSON.stringify({ pad: 'x'.repeat(1_100_000) })))).status).toBe(413);
  });

  it('never leaks stack traces', async () => {
    const { call } = await start(baseConfig());
    const r = await call('/api/sandbox/normalize', post('[1,2,3]'));
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.json)).not.toMatch(/at .*\.ts:\d+/);
  });

  it('sends security headers and hides the framework', async () => {
    const { call } = await start(baseConfig());
    const r = await call('/healthz');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(r.headers.get('x-powered-by')).toBeNull();
  });

  it('rate limits the sandbox', async () => {
    const { call } = await start(baseConfig({ rateLimits: { api: 1000, webhooks: 1000, sandbox: 3 } }));
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await call('/api/cli/execute', post('{"command":"help"}'))).status);
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });

  it('browser terminal only runs whitelisted commands', async () => {
    const { call } = await start(baseConfig());
    for (const command of ['rm -rf /', 'ecotrace $(whoami)', '; cat /etc/passwd', 'node -e "1"']) {
      const r = await call('/api/cli/execute', post(JSON.stringify({ command })));
      expect(r.json.isError).toBe(true);
      expect(r.json.output).toMatch(/Unknown command/);
    }
  });
});

describe('CLI live helpers', () => {
  it('signs exactly like Shopify (base64 HMAC-SHA256 of the raw body)', () => {
    const body = '{"a":1}';
    expect(sign(body, 'k')).toBe(crypto.createHmac('sha256', 'k').update(body).digest('base64'));
  });

  it('refuses plain http to remote hosts and credentials in URLs', () => {
    expect(() => parseBaseUrl('http://example.com')).toThrow(/https/);
    expect(() => parseBaseUrl('https://user:pw@example.com')).toThrow(/credentials/);
    expect(() => parseBaseUrl('ftp://example.com')).toThrow();
    // Regression: trailing slashes must not produce "//api/..." request paths.
    expect(baseString(parseBaseUrl('http://127.0.0.1:3000/'))).toBe('http://127.0.0.1:3000');
    expect(baseString(parseBaseUrl('https://ecotrace-cli.onrender.com'))).toBe('https://ecotrace-cli.onrender.com');
    expect(baseString(parseBaseUrl('https://host.example/prefix/'))).toBe('https://host.example/prefix');
  });

  it('generated payloads are accepted end-to-end and produce unique orders', async () => {
    const { call, ledger } = await start(baseConfig());
    for (const [platform, secret, header] of [
      ['shopify', SHOP_SECRET, 'X-Shopify-Hmac-Sha256'],
      ['woocommerce', WOO_SECRET, 'X-WC-Webhook-Signature'],
    ] as const) {
      const body = JSON.stringify(buildPayload(platform, { to: 'London', country: 'GB', weightKg: 3, carrier: 'DHL Express Air' }));
      const r = await call(`/api/webhooks/${platform}`, post(body, { [header]: sign(body, secret) }));
      expect(r.status).toBe(200);
      expect(r.json.auditRating).toMatch(/[A-F]/);
    }
    expect(ledger.orders).toHaveLength(2);
    // Intercontinental: no truck/rail suggestions
    expect(ledger.audits[0].alternatives.every((a) => a.mode === 'sea_freight')).toBe(true);
  });
});
