# Implementation plan: Carbon engine

- [x] 1. Move shared code into `foundation/` and delete the duplicated copies
  - One source of truth for types, engine, adapters, Kiro runner and sample data
  - _Requirements: all_

- [x] 2. Add input validation module
  - [x] 2.1 `parsePositiveNumber`, `parseDistanceKm`, `parseWeightKg`, `ValidationError`
  - [x] 2.2 Use it in the CLI `calculate` command and `/api/calculate`
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Replace substring carrier matching with whole-word regexes
  - Add "Worldwide/International Express" as air services
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Add the data-quality block
  - [x] 4.1 `resolveCoordinatesDetailed` reports coordinates / city_hub / country_centroid / unknown
  - [x] 4.2 Adapters set `weightEstimated` when the platform sent no weights
  - [x] 4.3 Show warnings in CLI output, dashboard and CSV export
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Make alternatives geography-aware
  - [x] 5.1 `isOverlandRoute` (land masses + island countries)
  - [x] 5.2 Overland: truck, rail (≥ 500 km), EV (≤ 450 km), bike (≤ 30 km). Ocean routes: sea freight only
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Configurable warehouse origin via `ECOTRACE_ORIGIN_*` instead of hard-coded Memphis/Chicago
  - _Requirements: 3.3_

- [x] 7. Property-based tests (`tests/engine.property.test.ts`)
  - [x] 7.1 Formula properties R1.1–R1.4
  - [x] 7.2 Alternative properties R2.1–R2.3
  - [x] 7.3 Robustness R3.1–R3.3, inference R4.x, validation R5.x

- [ ] 8. Optional: replace representative factors with a configurable, cited factor set (e.g. per-carrier GLEC values)
- [ ] 9. Optional: postcode-level geocoding for non-hub cities
