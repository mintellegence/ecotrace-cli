---
inclusion: fileMatch
fileMatchPattern: ["apps/ecotrace-web/**", "apps/ecotrace-cli/src/live.ts", ".env*", "render.yaml"]
---

# Security rules (public repo, public URL)

Assume an attacker has read every line of this repository.

## Must

- Authenticate every state-changing endpoint: HMAC for webhooks, Bearer token for admin. Fail closed when a secret is missing.
- Compare secrets with `crypto.timingSafeEqual` (`safeEqual` in `server/security.ts`).
- Read secrets only from environment variables. CLI commands must not accept secrets as flags (shell history, process lists).
- Validate all numeric input with `foundation/engine/validation.ts`; cap string lengths; cap body size (1 MB).
- Strip PII (customer name, email, address) and `rawPayload` before anything is stored (`minimiseOrder`).
- Return generic 500 messages; never send stack traces or internal paths.
- Neutralise spreadsheet formula injection in CSV exports (`csvCell`).
- Add an integration test in `tests/server.security.test.ts` for every new endpoint.

## Must not

- No `child_process`, `exec`, `eval`, `new Function`, or shell strings built from input. The browser terminal is a whitelist, not a shell.
- No secrets, tokens, personal emails or real customer data in code, fixtures, docs or commits. Use `example.com`.
- No `dangerouslySetInnerHTML`.
- No CORS `*` on authenticated endpoints. (The app is same-origin; it sets no CORS headers.)
- Never weaken CSP to allow inline scripts or third-party script hosts.
