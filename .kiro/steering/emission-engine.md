---
inclusion: fileMatch
fileMatchPattern: ["foundation/engine/**", "foundation/adapters/**", "foundation/importers/**", "tests/**"]
---

# Emission engine rules

Spec: #[[file:.kiro/specs/carbon-engine/requirements.md]]

- Formula: `E = distance_km × weight_kg / 1000 × factor`, rounded to 3 dp. Do not add hidden multipliers.
- Factors live only in `DEFAULT_EMISSION_FACTORS`. Changing one is a product decision: update the spec and the README table in the same change.
- Every function must accept garbage (NaN, negatives, missing fields, non-objects) without throwing or returning NaN, except the explicit validators which throw `ValidationError`.
- When a value is estimated, set the matching `dataQuality` flag. Never silently clamp a real value (the old `Math.max(0.1, weight)` changed genuine light parcels).
- Carrier inference uses whole-word regexes; add a test case to R4.2/R4.3 for every new keyword.
- When you change behaviour, add or update a property in `tests/engine.property.test.ts` and reference the requirement ID (R1.1 …) in the test name.
