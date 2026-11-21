# /foundation: the shared skeleton

Everything the EcoTrace apps have in common, and nothing app-specific. Import from `foundation/index.ts`.

| Module | Purpose |
|---|---|
| `engine/calculator.ts` | `CarbonCalculator.auditOrder()` / `calculateRaw()`: E = d × w / 1000 × f, A–F grade, realistic alternatives, `dataQuality` |
| `engine/emissionFactors.ts` | per-mode factors, `inferTransportMode()` from a service name |
| `engine/geocoding.ts` | coordinates, haversine, routing factor, `isOverlandRoute()` |
| `engine/validation.ts` | `parseDistanceKm()`, `parseWeightKg()`, `ValidationError` |
| `adapters/` | Shopify + WooCommerce → `UnifiedOrder`; `AdapterRegistry.register()` for new platforms |
| `importers/` | CSV and JSON order exports → `UnifiedOrder[]`, with per-row errors |
| `config/` | warehouse origin (`ECOTRACE_ORIGIN_*`), `.env` loader |
| `kiro/` | batch audit runner + text report, index of `/.kiro` assets |
| `types/` | shared types |

## Build a third app

```ts
import { importOrders, KiroAgentRunner } from '../foundation/index.ts';

const { orders } = importOrders(csvText, 'orders.csv');
const { summary } = KiroAgentRunner.runAudit(orders);
console.log(`${summary.totalEmissionsKgCO2} kg CO2e across ${summary.totalOrders} orders`);
```

Rules: no I/O except reading env vars, never throw on bad data (validators excepted), and flag every estimate. See `.kiro/steering/emission-engine.md`.
