/**
 * Live commands: talk to a running EcoTrace web app over HTTP.
 *
 *   send-webhook  builds a realistic Shopify/WooCommerce order, signs it exactly like the
 *                 platform does (HMAC-SHA256, base64) and POSTs it. Useful for checking a
 *                 deployment before connecting a real store.
 *   verify        end-to-end checks of a deployment: health, signature enforcement,
 *                 tamper detection, de-duplication, input validation, security headers.
 *
 * Secrets are read from environment variables only, never from command-line flags,
 * so they do not end up in shell history or process listings.
 */

import crypto from 'node:crypto';
import { SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from '../../../foundation/data/sampleOrders.ts';
import { CarbonCalculator } from '../../../foundation/engine/calculator.ts';

export type Platform = 'shopify' | 'woocommerce';

const SECRET_ENV: Record<Platform, string> = {
  shopify: 'SHOPIFY_WEBHOOK_SECRET',
  woocommerce: 'WOOCOMMERCE_WEBHOOK_SECRET',
};

const REQUEST_TIMEOUT_MS = 90_000; // Render free instances can take ~60 s to wake up

export function secretFor(platform: Platform): string | undefined {
  return process.env[SECRET_ENV[platform]]?.trim() || undefined;
}

export function secretEnvName(platform: Platform): string {
  return SECRET_ENV[platform];
}

/** Validates and normalises a base URL; only http(s) is allowed. */
export function parseBaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('URL must start with http:// or https://');
  if (url.username || url.password) throw new Error('Do not put credentials in the URL.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol === 'http:' && !local) {
    throw new Error('Refusing to send signed webhooks over plain http to a remote host. Use https://');
  }
  url.search = '';
  url.hash = '';
  return url;
}

/** Base URL as a string with no trailing slash, safe to append "/api/...". (URL.href always ends in "/".) */
export function baseString(url: URL): string {
  return url.origin + url.pathname.replace(/\/+$/, '');
}

export function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

export interface OrderOptions {
  orderId?: string;
  to?: string; // destination city
  country?: string; // destination ISO country code
  weightKg?: number;
  carrier?: string;
}

/** Builds a realistic platform payload with a unique order id (so repeated sends are new orders). */
export function buildPayload(platform: Platform, opts: OrderOptions = {}): Record<string, any> {
  const unique = opts.orderId || String(Date.now()).slice(-7);

  if (platform === 'shopify') {
    const p: Record<string, any> = structuredClone(SAMPLE_SHOPIFY_WEBHOOK);
    p.id = Number(unique.replace(/\D/g, '')) || Date.now();
    p.order_number = p.id;
    p.name = `#SH-${unique}`;
    p.created_at = new Date().toISOString();
    if (opts.to) {
      p.shipping_address = { ...p.shipping_address, city: opts.to, province: '', province_code: '', country_code: opts.country || 'US' };
      delete p.shipping_address.latitude;
      delete p.shipping_address.longitude;
    }
    if (opts.weightKg) p.total_weight = Math.round(opts.weightKg * 1000);
    if (opts.carrier) p.shipping_lines = [{ ...p.shipping_lines[0], title: opts.carrier, carrier_identifier: null, source: null }];
    return p;
  }

  const p: Record<string, any> = structuredClone(SAMPLE_WOOCOMMERCE_WEBHOOK);
  p.id = Number(unique.replace(/\D/g, '')) || Date.now();
  p.number = String(p.id);
  p.date_created = new Date().toISOString();
  if (opts.to) p.shipping = { ...p.shipping, city: opts.to, state: '', country: opts.country || 'US' };
  if (opts.weightKg) p.line_items = [{ ...p.line_items[0], quantity: 1, meta_data: [{ key: '_weight', value: String(opts.weightKg) }] }];
  if (opts.carrier) p.shipping_lines = [{ ...p.shipping_lines[0], method_title: opts.carrier, method_id: 'custom' }];
  return p;
}

export function webhookHeaders(platform: Platform, body: string, secret?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'ecotrace-cli/1.1' };
  if (platform === 'shopify') {
    headers['X-Shopify-Topic'] = 'orders/create';
    headers['X-Shopify-Shop-Domain'] = 'ecotrace-demo.myshopify.com';
    headers['X-Shopify-Webhook-Id'] = crypto.randomUUID();
    if (secret) headers['X-Shopify-Hmac-Sha256'] = sign(body, secret);
  } else {
    headers['X-WC-Webhook-Topic'] = 'order.created';
    headers['X-WC-Webhook-Source'] = 'https://ecotrace-demo.example/';
    headers['X-WC-Webhook-Delivery-ID'] = crypto.randomUUID();
    if (secret) headers['X-WC-Webhook-Signature'] = sign(body, secret);
  }
  return headers;
}

export interface HttpResult {
  status: number;
  ms: number;
  json: any;
  headers: Headers;
}

/** fetch with a long timeout and a friendly note while a sleeping server wakes up. */
export async function http(url: string, init: RequestInit = {}, opts: { quiet?: boolean } = {}): Promise<HttpResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const wakeNote = opts.quiet
    ? undefined
    : setTimeout(() => console.error('       ...waiting for the server (a sleeping Render instance takes up to ~60 s to wake)'), 4000);
  const started = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, redirect: 'error' });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 200) };
    }
    return { status: res.status, ms: Math.round(performance.now() - started), json, headers: res.headers };
  } catch (e) {
    const err = e as Error;
    throw new Error(err.name === 'AbortError' ? `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${url}` : `Could not reach ${url} (${err.message})`);
  } finally {
    clearTimeout(timeout);
    if (wakeNote) clearTimeout(wakeNote);
  }
}

// --------------------------------------------------------------------------
// send-webhook
// --------------------------------------------------------------------------

export async function sendWebhook(baseUrl: URL, platform: Platform, payload: unknown): Promise<HttpResult> {
  const secret = secretFor(platform);
  if (!secret) {
    throw new Error(
      `${secretEnvName(platform)} is not set. Export the same secret the server uses, e.g.\n` +
        `  PowerShell: $env:${secretEnvName(platform)}="..."\n  bash:       export ${secretEnvName(platform)}=...`
    );
  }
  const body = JSON.stringify(payload);
  return http(`${baseString(baseUrl)}/api/webhooks/${platform}`, {
    method: 'POST',
    headers: webhookHeaders(platform, body, secret),
    body,
  });
}

// --------------------------------------------------------------------------
// verify
// --------------------------------------------------------------------------

type Outcome = 'PASS' | 'FAIL' | 'SKIP';
interface Check {
  name: string;
  outcome: Outcome;
  detail: string;
}

export async function verifyDeployment(baseUrl: URL, log: (line: string) => void): Promise<{ checks: Check[]; failed: number }> {
  const checks: Check[] = [];
  const base = baseString(baseUrl);
  const record = (name: string, outcome: Outcome, detail: string) => {
    checks.push({ name, outcome, detail });
    const badge = outcome === 'PASS' ? '[PASS]' : outcome === 'FAIL' ? '[FAIL]' : '[SKIP]';
    log(`  ${badge} ${name.padEnd(46)} ${detail}`);
  };
  const run = async (name: string, fn: () => Promise<[Outcome, string]>) => {
    try {
      const [o, d] = await fn();
      record(name, o, d);
    } catch (e) {
      record(name, 'FAIL', (e as Error).message);
    }
  };

  log(`\n  Target: ${base}\n`);

  // 1. Reachability (first call may wake a sleeping instance)
  await run('Server is up (GET /healthz)', async () => {
    const r = await http(`${base}/healthz`);
    return [r.status === 200 ? 'PASS' : 'FAIL', `HTTP ${r.status} in ${r.ms} ms`];
  });

  let meta: any = null;
  await run('Reports its configuration (GET /api/meta)', async () => {
    const r = await http(`${base}/api/meta`, {}, { quiet: true });
    meta = r.json;
    // An HTML page with 200 (SPA fallback) must not count as success.
    if (r.status !== 200 || typeof meta?.demoMode !== 'boolean') return ['FAIL', `HTTP ${r.status}, not an EcoTrace API response`];
    const hooks = Object.entries(meta.webhooks ?? {}).filter(([, on]) => on).map(([k]) => k);
    return ['PASS', `demo=${meta.demoMode} persistence=${meta.persistence} webhooks=${hooks.join('+') || 'none'}`];
  });

  // 2. Security headers
  await run('Sends security headers', async () => {
    const r = await http(`${base}/healthz`, {}, { quiet: true });
    const missing = ['x-content-type-options', 'x-frame-options', 'referrer-policy'].filter((h) => !r.headers.get(h));
    return [missing.length === 0 ? 'PASS' : 'FAIL', missing.length ? `missing: ${missing.join(', ')}` : 'nosniff, DENY, no-referrer'];
  });

  // 3. Removed attack surface stays removed
  await run('No shell/git endpoints exposed', async () => {
    const r = await http(`${base}/api/git/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, { quiet: true });
    return [r.status === 404 ? 'PASS' : 'FAIL', `POST /api/git/push -> HTTP ${r.status}`];
  });

  // 4. Webhook authentication
  for (const platform of ['shopify', 'woocommerce'] as Platform[]) {
    const label = platform === 'shopify' ? 'Shopify' : 'WooCommerce';
    const payload = buildPayload(platform);
    const body = JSON.stringify(payload);
    const url = `${base}/api/webhooks/${platform}`;

    await run(`${label}: rejects unsigned webhook`, async () => {
      const r = await http(url, { method: 'POST', headers: webhookHeaders(platform, body), body }, { quiet: true });
      if (r.status === 401) return ['PASS', 'HTTP 401'];
      if (r.status === 503) return ['PASS', 'HTTP 503 (webhooks not configured on server)'];
      if (r.status >= 200 && r.status < 300) return ['FAIL', `HTTP ${r.status}: unsigned request was ACCEPTED`];
      return ['FAIL', `HTTP ${r.status} (expected 401)`];
    });

    await run(`${label}: rejects wrong signature`, async () => {
      const r = await http(url, { method: 'POST', headers: webhookHeaders(platform, body, 'not-the-secret'), body }, { quiet: true });
      return [r.status === 401 || r.status === 503 ? 'PASS' : 'FAIL', `HTTP ${r.status}${r.status === 401 ? '' : ' (expected 401)'}`];
    });

    const secret = secretFor(platform);
    if (!secret) {
      record(`${label}: accepts signed webhook`, 'SKIP', `set ${secretEnvName(platform)} to test`);
      continue;
    }

    await run(`${label}: accepts signed webhook`, async () => {
      const r = await http(url, { method: 'POST', headers: webhookHeaders(platform, body, secret), body }, { quiet: true });
      if (r.status !== 200) return ['FAIL', `HTTP ${r.status} ${r.json?.error ?? ''}`];
      return ['PASS', `${r.json.orderId}: ${r.json.emissionKgCO2} kg CO2e, grade ${r.json.auditRating} (${r.ms} ms)`];
    });

    await run(`${label}: ignores duplicate delivery (retry)`, async () => {
      const r = await http(url, { method: 'POST', headers: webhookHeaders(platform, body, secret), body }, { quiet: true });
      return [r.status === 200 && r.json?.duplicate === true ? 'PASS' : 'FAIL', `HTTP ${r.status}, duplicate=${r.json?.duplicate}`];
    });

    await run(`${label}: detects tampered body`, async () => {
      const tampered = body.replace(/"total_weight":\d+|"_weight","value":"[^"]*"/, (m) => m.replace(/\d+(\.\d+)?/, '1'));
      const headers = webhookHeaders(platform, body, secret); // signature of the ORIGINAL body
      const r = await http(url, { method: 'POST', headers, body: tampered === body ? body + ' ' : tampered }, { quiet: true });
      return [r.status === 401 ? 'PASS' : 'FAIL', `HTTP ${r.status}`];
    });
  }

  // 5. Input validation + engine parity
  await run('Rejects invalid input (negative weight)', async () => {
    const r = await http(`${base}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distanceKm: 100, weightKg: -5 }),
    }, { quiet: true });
    return [r.status === 400 ? 'PASS' : 'FAIL', `HTTP ${r.status} ${r.json?.error ?? ''}`];
  });

  await run('Rejects oversized payload (> 1 MB)', async () => {
    const big = JSON.stringify({ pad: 'x'.repeat(1_100_000) });
    const r = await http(`${base}/api/sandbox/normalize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: big }, { quiet: true });
    return [r.status === 413 ? 'PASS' : 'FAIL', `HTTP ${r.status}`];
  });

  await run('Server math matches local engine', async () => {
    const r = await http(`${base}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distanceKm: 1200, weightKg: 4.2, mode: 'air_freight' }),
    }, { quiet: true });
    const local = CarbonCalculator.calculateRaw(1200, 4.2, 'air_freight').emissionKgCO2;
    const remote = r.json?.breakdown?.emissionKgCO2;
    return [remote === local ? 'PASS' : 'FAIL', `server ${remote} vs local ${local} kg CO2e`];
  });

  const failed = checks.filter((c) => c.outcome === 'FAIL').length;
  const passed = checks.filter((c) => c.outcome === 'PASS').length;
  const skipped = checks.filter((c) => c.outcome === 'SKIP').length;
  log(`\n  ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
  return { checks, failed };
}
