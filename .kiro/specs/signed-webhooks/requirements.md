# Requirements: Signed webhook ingestion (apps/ecotrace-web)

## Introduction

The web app receives live order webhooks from Shopify and WooCommerce. It is deployed on a public URL from a public repository, so every endpoint must be safe even when an attacker reads the source.

## Requirement 1: Authenticate webhooks

**User story:** As a store owner, I want only my store to be able to add orders to my ledger, so that my figures cannot be faked.

1. WHEN a Shopify webhook arrives THE SYSTEM SHALL verify `X-Shopify-Hmac-Sha256` as base64 HMAC-SHA256 of the raw body using `SHOPIFY_WEBHOOK_SECRET`.
2. WHEN a WooCommerce webhook arrives THE SYSTEM SHALL verify `X-WC-Webhook-Signature` the same way using `WOOCOMMERCE_WEBHOOK_SECRET`.
3. WHEN the signature is missing, wrong, or the body was changed after signing THE SYSTEM SHALL respond 401 and store nothing.
4. WHEN no secret is configured THE SYSTEM SHALL respond 503 (fail closed).
5. WHEN signatures are compared THE SYSTEM SHALL use a constant-time comparison.
6. WHERE `NODE_ENV=production` THE SYSTEM SHALL ignore `ECOTRACE_ALLOW_UNSIGNED_WEBHOOKS`.

## Requirement 2: Reliable ingestion

1. WHEN a platform retries a delivery for an order already recorded THE SYSTEM SHALL respond 200 with `duplicate: true` and SHALL NOT count it twice.
2. WHEN WooCommerce sends its setup ping THE SYSTEM SHALL respond 200 without creating an order.
3. WHEN an order is stored THE SYSTEM SHALL drop customer name, email, street address and the raw payload.

## Requirement 3: Protect the ledger and the host

1. WHERE `ECOTRACE_READ_TOKEN` is set THE SYSTEM SHALL require it as a Bearer token to read orders, summaries and audits.
2. WHEN a reset is requested outside demo mode THE SYSTEM SHALL require `ECOTRACE_ADMIN_TOKEN`.
3. THE SYSTEM SHALL NOT expose any endpoint that runs shell commands or git.
4. WHEN a request body exceeds 1 MB THE SYSTEM SHALL respond 413.
5. WHEN a client exceeds the rate limit THE SYSTEM SHALL respond 429 with `Retry-After`.
6. WHEN an unexpected error occurs THE SYSTEM SHALL respond with a generic message and SHALL NOT include stack traces.
7. THE SYSTEM SHALL send `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and, in production, a restrictive CSP and HSTS.

## Requirement 4: Browser terminal

1. WHEN a command is submitted from the browser terminal THE SYSTEM SHALL only run commands from a fixed whitelist AND SHALL NOT pass input to a shell.
