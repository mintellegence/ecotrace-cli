---
inclusion: always
---

# Product: EcoTrace

EcoTrace gives small and mid-size online stores a per-order CO2e figure for shipping, says how reliable that figure is, and points to the orders where switching service level saves the most.

## Users

- **Store owner / ops lead**: wants to know which shipping options to offer or default to.
- **Sustainability lead**: needs Scope 3 transport numbers per order for a report, with estimates clearly marked.
- **Developer**: wires webhooks, runs the CLI in CI, builds new apps on `foundation/`.

## Principles for every change

1. **Never present a guess as a fact.** If weight or location is estimated, the result must say so (`dataQuality`).
2. **Advice must be actionable.** Only suggest modes a merchant can actually choose for that route (no ocean freight for domestic parcels, no trucks across oceans).
3. **Safe by default on a public URL.** Webhooks are signed, secrets come from env vars, nothing runs a shell.
4. **Same numbers everywhere.** CLI, dashboard and API all call `foundation/`; never duplicate calculation logic in an app.
5. **No overclaiming.** Do not describe the factors as certified or "GLEC compliant"; they are representative values for comparison.

## Out of scope

Payments, carbon-offset purchasing, user accounts, carrier rate shopping.
