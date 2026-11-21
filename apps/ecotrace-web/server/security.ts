/**
 * Security primitives shared by the web server and the webhook service.
 * Dependency-free on purpose: fewer packages means a smaller supply-chain surface.
 */

import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express request that retains the exact bytes of the body for HMAC verification. */
export type RawBodyRequest = Request & { rawBody?: Buffer };

/** Constant-time string comparison that tolerates different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn comparable time, then fail.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Verifies a base64 HMAC-SHA256 webhook signature over the raw request body.
 * Shopify (X-Shopify-Hmac-Sha256) and WooCommerce (X-WC-Webhook-Signature) both use this scheme.
 */
export function verifyHmacSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | string[] | undefined,
  secret: string
): boolean {
  if (!rawBody || !secret || typeof signatureHeader !== 'string' || !signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  return safeEqual(expected, signatureHeader.trim());
}

/** Bearer-token check against an expected secret. Returns false when no token is configured. */
export function hasValidBearerToken(req: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  return safeEqual(header.slice('Bearer '.length).trim(), expected);
}

/** Fixed-window, in-memory rate limiter keyed by client IP. */
export function rateLimit(opts: { windowMs: number; max: number; message?: string }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodic cleanup so the map cannot grow without bound.
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
  }, opts.windowMs);
  timer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    res.setHeader('RateLimit-Limit', String(opts.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, opts.max - entry.count)));

    if (entry.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ success: false, error: opts.message || 'Too many requests. Please slow down.' });
      return;
    }
    next();
  };
}

/** Baseline HTTP security headers (CSP relaxed in development so Vite HMR keeps working). */
export function securityHeaders(isProduction: boolean): RequestHandler {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (isProduction) {
      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  };
}

export interface WebhookAuthConfig {
  shopifySecret?: string;
  wooSecret?: string;
  /** Accept unsigned webhooks. Only for local development; never enable on a public host. */
  allowUnsigned: boolean;
}

/** Middleware that authenticates a platform webhook via its HMAC signature. Fails closed. */
export function requireWebhookSignature(
  platform: 'shopify' | 'woocommerce',
  cfg: WebhookAuthConfig
): RequestHandler {
  const secret = platform === 'shopify' ? cfg.shopifySecret : cfg.wooSecret;
  const header = platform === 'shopify' ? 'x-shopify-hmac-sha256' : 'x-wc-webhook-signature';
  const envName = platform === 'shopify' ? 'SHOPIFY_WEBHOOK_SECRET' : 'WOOCOMMERCE_WEBHOOK_SECRET';

  return (req, res, next) => {
    if (!secret) {
      if (cfg.allowUnsigned) return next();
      res.status(503).json({
        success: false,
        error: `${platform} webhooks are not configured. Set ${envName} on the server.`,
      });
      return;
    }
    if (!verifyHmacSignature((req as RawBodyRequest).rawBody, req.headers[header], secret)) {
      res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
      return;
    }
    next();
  };
}
