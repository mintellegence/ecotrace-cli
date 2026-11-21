# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private reporting instead: *Security → Report a vulnerability* on this repository. Include steps to reproduce and the affected version or commit.

You can expect an acknowledgement within 5 working days. Fixes are released as soon as they are ready, and reporters are credited unless they ask not to be.

## Supported versions

Only the latest commit on `main` is supported.

## Security model

EcoTrace is designed to run on a public URL from a public repository.

| Area | Protection |
|---|---|
| Store webhooks | HMAC-SHA256 signature over the raw body (`X-Shopify-Hmac-Sha256`, `X-WC-Webhook-Signature`), constant-time compare, fail closed (503) when no secret is set. Unsigned mode is ignored in production. |
| Ledger data | Optional Bearer token (`ECOTRACE_READ_TOKEN`), kept in `sessionStorage` in the browser. Customer name, email, address and raw payloads are never stored. |
| Destructive actions | Ledger reset needs `ECOTRACE_ADMIN_TOKEN` (or demo mode). |
| Abuse | Per-IP rate limits (API 120/min, webhooks 600/min, sandbox 30/min), 1 MB body limit, string length caps. |
| Code execution | No endpoint runs shell commands, git, `eval` or dynamic code. The browser terminal is a fixed whitelist. |
| Browser | Strict CSP (`script-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, HSTS in production, no CORS. |
| Errors | Generic 500 responses; no stack traces. |
| Exports | CSV cells are protected against spreadsheet formula injection. |
| Supply chain | Exact dependency versions, lockfile committed, `npm audit` and Dependabot in CI. |
| Secrets in the repo | A Kiro `PreToolUse` hook blocks the agent from writing `.env` files or credential-like strings. `.env*` is git-ignored. |

Automated checks: `tests/server.security.test.ts` (CI) and `npm run cli -- verify <url>` (against a live deployment).

## Operator checklist for real data

- Set `ECOTRACE_DEMO_MODE=false`, `ECOTRACE_READ_TOKEN` and `ECOTRACE_ADMIN_TOKEN` (32+ random bytes each).
- Set the webhook secrets from your Shopify / WooCommerce admin.
- Serve over HTTPS only (Render does this by default).
- Put `ECOTRACE_LEDGER_FILE` on a persistent disk, and back it up.
- Rotate a webhook secret in the store admin and on the server together if it may have leaked.
