---
inclusion: always
---

# Tech stack and commands

- Node.js ≥ 20.12, TypeScript (strict), ES modules, run with `tsx` (no compile step). Imports use explicit `.ts` extensions.
- CLI: `commander`. Web: `express` 4 + React 19 + Vite + Tailwind 4.
- Tests: `vitest` + `fast-check` for property-based tests.
- Dependencies are pinned to exact versions (`.npmrc` has `save-exact=true`). Do not add a dependency when a few lines of code will do; prefer Node built-ins (`node:crypto`, `fetch`, `process.loadEnvFile`).

## Commands

| Task | Command |
|---|---|
| Type check | `npm run lint` |
| Tests | `npm test` |
| Everything CI runs | `npm run check` |
| Dashboard (dev) | `npm run dev` |
| CLI | `npm run cli -- <command>` |
| Live checks | `npm run verify:local` / `npm run verify:live` |

Use `vitest run`, never watch mode, when running tests as an agent.

## Conventions

- Static-method classes for engine services (`CarbonCalculator`, `AdapterRegistry`, `KiroAgentRunner`).
- Validation errors are `ValidationError`; the web app maps them to 400, the CLI to exit code 1.
- CLI exit codes: 0 ok, 1 error, 2 carbon budget exceeded (`--fail-above`).
- Accessibility: every icon-only button has `aria-label`; dialogs have `role="dialog"` and close on Escape.
