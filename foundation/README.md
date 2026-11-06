# @ecotrace/foundation

> **Shared Architecture Foundation** for Kiroween (Skeleton Crew Category).  
> Houses the core calculation engine ($E = d \cdot w \cdot f$), GLEC/DEFRA emission factors, spatial geocoding, and normalized adapters.

## Architecture
- `/engine`:
  - `calculator.ts`: Scientific calculation engine implementing $E = d \cdot w \cdot f$.
  - `emissionFactors.ts`: GLEC framework carrier emission factors (kg CO2e / tonne-km).
  - `geocoding.ts`: Haversine spatial distance with detour routing curvature factors.
- `/adapters`:
  - `shopify.ts`: Shopify webhook normalizer.
  - `woocommerce.ts`: WooCommerce REST v3 normalizer.
  - `index.ts`: Adapter registry.
- `/types`:
  - `index.ts`: UnifiedOrder and audit schemas.
