# Implementation plan: Signed webhook ingestion

- [x] 1. Remove `/api/git/*` endpoints and the Git push UI
  - _Requirements: 3.3_

- [x] 2. Security module (`apps/ecotrace-web/server/security.ts`)
  - [x] 2.1 `verifyHmacSignature` with constant-time comparison
  - [x] 2.2 `requireWebhookSignature` middleware that fails closed
  - [x] 2.3 Fixed-window rate limiter with `Retry-After`
  - [x] 2.4 Security headers (CSP + HSTS in production)
  - [x] 2.5 Bearer token check for read/admin access
  - _Requirements: 1.1–1.6, 3.1, 3.2, 3.5, 3.7_

- [x] 3. Capture raw body and cap size at 1 MB
  - _Requirements: 1.1, 3.4_

- [x] 4. Ledger with de-duplication, PII minimisation and atomic persistence
  - _Requirements: 2.1, 2.3_

- [x] 5. Separate public sandbox from authenticated webhooks; the dashboard uses the sandbox
  - _Requirements: 1.3, 4.1_

- [x] 6. Central error handler (400 / 413 / generic 500)
  - _Requirements: 3.6_

- [x] 7. Split `createApp(config)` from `server.ts` and add HTTP integration tests
  - _Requirements: all_

- [x] 8. CLI `send-webhook` and `verify` for live end-to-end checks of a deployment
  - _Requirements: 1.1–1.4, 2.1, 3.3, 3.4_

- [ ] 9. Optional: Shopify `orders/updated` and refunds to adjust the ledger
- [ ] 10. Optional: store the ledger in a database (Postgres) for multi-instance deployments
