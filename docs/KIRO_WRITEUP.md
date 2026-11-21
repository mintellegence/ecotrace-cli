# How Kiro was used (draft for the Devpost write-up)

> Edit this before submitting. Lines marked **[you]** need your own experience; judges read this to understand how *you* worked with Kiro. Everything else describes files that exist in this repo.

## Kiro tools used

- **Kiro IDE**, mainly Autopilot mode with supervised review of larger changes. **[you: mention Kiro CLI / Web / Crew if you tried them, and how they differed]**

## Spec-driven development

Two specs in `.kiro/specs/`:

- `carbon-engine`: 5 requirements written in EARS ("WHEN … THE SYSTEM SHALL …"), a design with a data-flow diagram, and a task list.
- `signed-webhooks`: the security requirements for a public webhook receiver, with a sequence diagram and the endpoint classes.

The requirement IDs (R1.1, R2.2, …) are the names of the property-based tests, so every acceptance criterion maps to an automated check. Writing "WHEN the route crosses an ocean THE SYSTEM SHALL NOT suggest road freight" as a requirement is what exposed the original bug of suggesting container ships for Memphis → Chicago.

**[you: how did specs compare with vibe coding for you? e.g. vibe coding for the first UI prototype, specs once correctness and security mattered]**

## Steering

`.kiro/steering/` has three always-included files (`product.md`, `tech.md`, `structure.md`) and two `fileMatch` files that only load when relevant code is touched:

- `emission-engine.md` (engine, adapters, tests) carries the formula rules and "never present a guess as a fact".
- `security.md` (web app, live CLI, env files, render.yaml) says "assume the attacker has read the repo", with must/must-not lists (no `child_process`, secrets only from env, tests for every endpoint).

The biggest effect came from the product principle **"no overclaiming"**. It stopped Kiro from writing "GLEC compliant" into UI and reports, and it is why every result carries a `dataQuality` block. **[you: anything you noticed]**

## Agent hooks

`.kiro/hooks/`:

| Hook | Trigger | Action |
|---|---|---|
| Run tests when engine code changes | `PostFileSave` on `foundation/` or `tests/` | `vitest run` |
| Type-check when app code changes | `PostFileSave` on `apps/` | `tsc --noEmit` |
| Security review of server changes | `PostFileSave` on `apps/ecotrace-web/server` | agent prompt: check the change against `security.md` and add a test |
| Block secrets in agent writes | `PreToolUse` on writes | `guard-secrets.mjs`: exit 2 if the agent tries to write a `.env` file or a token-shaped string |

The last one matters for a public repo: the agent physically cannot commit a secret through its own edits.

## Custom agent

`.kiro/agents/carbon-auditor.md` is a read-only agent for store owners. It may run only `npm run cli -- audit …` (other shell commands need approval, writes are denied). It explains the CLI's JSON output in plain language and never computes numbers itself.

## Property-based testing

`tests/engine.property.test.ts` uses fast-check for the engine's invariants: emission never negative or NaN, exact formula, monotonic in weight and distance, air never cleaner than road, alternatives always lower and geographically possible, distance symmetric and obeying the triangle inequality, and the importer round-tripping arbitrary CSV cells.

Things PBT caught that example tests did not: **[you: fill in what failed while you developed. Candidates from this codebase's history: substring matching ("Seattle" → sea freight), the 0.1 kg weight clamp altering real parcels, ocean freight suggested for domestic routes]**

## MCP / Powers

**[you: only list these if you actually used them for this project]**

## Live verification

`ecotrace verify <url>` turns the security spec into 17 live checks against the deployed app. The first run against a local production build found a real bug that the unit tests missed (trailing-slash URLs producing `//api/...` requests, and a check that passed on an HTML fallback page).
