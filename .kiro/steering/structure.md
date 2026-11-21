---
inclusion: always
---

# Repository structure (Kiroween Skeleton Crew)

```
foundation/            the skeleton: shared by all apps, contains NO app code
apps/ecotrace-cli/     App 1: terminal tool
apps/ecotrace-web/     App 2: webhook receiver + dashboard
tests/                 vitest + fast-check
examples/              sample CSV / JSON
.kiro/                 specs, steering, hooks, agents (must stay committed)
```

## Rules

- Apps may import from `foundation/`. `foundation/` must never import from `apps/`.
- `apps/ecotrace-web` may reuse `apps/ecotrace-cli/src/commands.ts` for the browser terminal, so both terminals print identical output.
- New platform integrations go in `foundation/adapters/` and register in `AdapterRegistry`.
- New features start as a spec in `.kiro/specs/<feature>/` (requirements → design → tasks).
- `.kiro/` must never be added to `.gitignore` (hackathon rule).

Design references: #[[file:.kiro/specs/carbon-engine/design.md]] and #[[file:.kiro/specs/signed-webhooks/design.md]]
