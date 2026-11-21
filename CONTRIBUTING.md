# Contributing

Thanks for helping. A typical change takes these steps:

```bash
git clone https://github.com/mintellegence/ecotrace-cli.git
cd ecotrace-cli
npm install
npm run check        # type check + tests + build: must pass before a PR
```

## Ground rules

- **Shared logic goes in `foundation/`**, never in an app. Apps may import from `foundation/`; `foundation/` never imports from `apps/`.
- **Every behaviour change needs a test.** Engine rules are tested as properties in `tests/engine.property.test.ts`; HTTP behaviour in `tests/server.security.test.ts`.
- **Never present an estimate as exact.** If you add a fallback, set a `dataQuality` flag.
- **No secrets, real customer data or personal emails** anywhere in code, fixtures or docs. Use `example.com`.
- **No new dependency** unless it saves a lot of code. Pin exact versions.
- New features start with a spec in `.kiro/specs/<feature>/` (requirements → design → tasks). Kiro users get this automatically; others can copy the existing specs' structure.

## Using Kiro on this repo

Open the `ecotrace-cli` folder itself as the workspace (not a parent folder) so the steering files and hooks in `.kiro/` apply. Hooks run the tests and type check after agent edits, and block writes that contain secrets.

## Adding a platform (e.g. BigCommerce)

1. Create `foundation/adapters/bigcommerce.ts` implementing `PlatformAdapter`.
2. Register it in `foundation/adapters/index.ts`.
3. Add its signature scheme to `apps/ecotrace-web/server/security.ts` and a route in `server/app.ts`.
4. Add sample payload tests and a signed-webhook integration test.

## Reporting security issues

See [SECURITY.md](./SECURITY.md). Please do not open public issues for vulnerabilities.
