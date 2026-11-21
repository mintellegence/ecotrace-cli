# Requirements: Carbon engine (foundation)

## Introduction

The foundation turns a shipment (route, weight, carrier service) into a CO2e figure that a store owner can act on. It is shared by every EcoTrace app, so it must be pure, deterministic and impossible to crash with bad input. Requirement IDs (R1.1 …) are referenced by the property-based tests in `tests/engine.property.test.ts`.

## Requirement 1: Emission formula

**User story:** As a store owner, I want a per-order emission figure, so that I can see which shipments drive my footprint.

### Acceptance criteria

1. (R1.1) WHEN any distance, weight and transport mode within limits is calculated THE SYSTEM SHALL return a finite, non-negative emission.
2. (R1.2) WHEN an emission is calculated THE SYSTEM SHALL equal `distance_km × weight_kg / 1000 × factor` rounded to 3 decimal places.
3. (R1.3) WHEN distance or weight increases and everything else is unchanged THE SYSTEM SHALL NOT report a lower emission.
4. (R1.4) WHEN the same shipment is calculated for air freight and road freight THE SYSTEM SHALL report air as at least as high as road.

## Requirement 2: Realistic alternatives

**User story:** As a store owner, I want suggestions I can actually choose at checkout, so that I do not get advice like "ship Memphis to Chicago by container ship".

1. (R2.1) WHEN alternatives are suggested THE SYSTEM SHALL only include modes that emit less than the current mode, with savings between 0 and 100 %.
2. (R2.2) WHEN the route is overland THE SYSTEM SHALL NOT suggest ocean freight, AND WHEN the route crosses an ocean THE SYSTEM SHALL NOT suggest road, rail, van or bike.
3. (R2.3) WHEN alternatives are listed THE SYSTEM SHALL sort them by savings, largest first.
4. WHEN the distance exceeds a mode's practical range (bike > 30 km, EV van > 450 km, rail < 500 km) THE SYSTEM SHALL NOT suggest that mode.

## Requirement 3: Honest results for incomplete data

**User story:** As a sustainability lead, I want to know when a number is an estimate, so that I do not report guesses as facts.

1. (R3.1) WHEN an order has any coordinates or weight, including NaN, zero or negative values, THE SYSTEM SHALL return a finite result and SHALL NOT throw.
2. (R3.2) WHEN the order weight is missing or invalid THE SYSTEM SHALL use 1 kg AND SHALL set `dataQuality.weightEstimated = true`.
3. WHEN a location is resolved from a city table or a country centre instead of coordinates THE SYSTEM SHALL report that in `dataQuality.distancePrecision`.
4. (R3.3) WHEN great-circle distance is computed THE SYSTEM SHALL be symmetric and satisfy the triangle inequality.

## Requirement 4: Carrier service inference

1. (R4.1) WHEN any carrier string is given THE SYSTEM SHALL return one of the known transport modes.
2. (R4.2) WHEN a carrier string contains place or brand names such as "Seattle", "Level" or "Advance" THE SYSTEM SHALL NOT treat substrings ("sea", "ev", "van") as mode keywords.
3. (R4.3) WHEN a common service name is given ("UPS Next Day Air", "FedEx Ground", "UPS Worldwide Express") THE SYSTEM SHALL map it to the correct mode.

## Requirement 5: Input validation

1. (R5.1) WHEN a positive finite number within limits is given THE SYSTEM SHALL accept it unchanged.
2. (R5.2) WHEN NaN, ±Infinity, zero, a negative number or a non-numeric string is given THE SYSTEM SHALL reject it with a `ValidationError`.
3. (R5.3) WHEN a distance above 50 000 km or a weight above 1 000 000 kg is given THE SYSTEM SHALL reject it.
