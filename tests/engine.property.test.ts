/**
 * Property-based tests for the emission engine (fast-check).
 * Each property maps to a requirement in .kiro/specs/carbon-engine/requirements.md.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CarbonCalculator } from '../foundation/engine/calculator.ts';
import { DEFAULT_EMISSION_FACTORS, inferTransportMode } from '../foundation/engine/emissionFactors.ts';
import { haversineDistance } from '../foundation/engine/geocoding.ts';
import { parseDistanceKm, parseWeightKg, ValidationError } from '../foundation/engine/validation.ts';
import { TransportMode, UnifiedOrder } from '../foundation/types/index.ts';

const MODES = Object.keys(DEFAULT_EMISSION_FACTORS) as TransportMode[];
const mode = fc.constantFrom(...MODES);
const distance = fc.double({ min: 0.1, max: 40_000, noNaN: true });
const weight = fc.double({ min: 0.001, max: 50_000, noNaN: true });
const coord = fc.tuple(fc.double({ min: -89, max: 89, noNaN: true }), fc.double({ min: -179, max: 179, noNaN: true }));

const order = (o: Partial<UnifiedOrder>): UnifiedOrder => ({
  orderId: 'T-1',
  platform: 'manual',
  createdAt: '2026-11-01T00:00:00Z',
  origin: { city: 'Memphis', country: 'US' },
  destination: { city: 'Seattle', country: 'US' },
  items: [],
  totalWeightKg: 2,
  carrier: 'Ground',
  shippingMethod: '',
  ...o,
});

describe('emission formula E = d × w × f', () => {
  it('R1.1 is never negative and always finite', () => {
    fc.assert(
      fc.property(distance, weight, mode, (d, w, m) => {
        const e = CarbonCalculator.calculateRaw(d, w, m).emissionKgCO2;
        return Number.isFinite(e) && e >= 0;
      })
    );
  });

  it('R1.2 equals d × w/1000 × f within rounding (3 dp)', () => {
    fc.assert(
      fc.property(distance, weight, mode, (d, w, m) => {
        const e = CarbonCalculator.calculateRaw(d, w, m).emissionKgCO2;
        const exact = d * (w / 1000) * DEFAULT_EMISSION_FACTORS[m].factor;
        return Math.abs(e - exact) <= 0.0005 + 1e-9;
      })
    );
  });

  it('R1.3 is monotonic in weight and distance', () => {
    fc.assert(
      fc.property(distance, weight, mode, fc.double({ min: 1, max: 10, noNaN: true }), (d, w, m, k) => {
        const base = CarbonCalculator.calculateRaw(d, w, m).emissionKgCO2;
        return (
          CarbonCalculator.calculateRaw(d * k, w, m).emissionKgCO2 >= base &&
          CarbonCalculator.calculateRaw(d, w * k, m).emissionKgCO2 >= base
        );
      })
    );
  });

  it('R1.4 air freight is never cleaner than ground for the same shipment', () => {
    fc.assert(
      fc.property(distance, weight, (d, w) => {
        return (
          CarbonCalculator.calculateRaw(d, w, 'air_freight').emissionKgCO2 >=
          CarbonCalculator.calculateRaw(d, w, 'road_truck').emissionKgCO2
        );
      })
    );
  });
});

describe('greener alternatives', () => {
  it('R2.1 every alternative emits strictly less, with consistent savings', () => {
    fc.assert(
      fc.property(distance, weight, mode, fc.boolean(), (d, w, m, overland) => {
        const current = CarbonCalculator.calculateRaw(d, w, m).emissionKgCO2;
        return CarbonCalculator.computeAlternatives(d, w, m, current, overland).every(
          (a) =>
            a.emissionKgCO2 < current + 1e-9 &&
            a.potentialSavedKgCO2 >= 0 &&
            a.percentReduction >= 0 &&
            a.percentReduction <= 100 &&
            a.mode !== m
        );
      })
    );
  });

  it('R2.2 never suggests ocean freight overland, nor trucks across oceans', () => {
    fc.assert(
      fc.property(distance, weight, mode, (d, w, m) => {
        const current = CarbonCalculator.calculateRaw(d, w, m).emissionKgCO2;
        const over = CarbonCalculator.computeAlternatives(d, w, m, current, true);
        const sea = CarbonCalculator.computeAlternatives(d, w, m, current, false);
        return (
          over.every((a) => a.mode !== 'sea_freight') &&
          sea.every((a) => !['road_truck', 'rail', 'electric_van', 'cargo_bike'].includes(a.mode))
        );
      })
    );
  });

  it('R2.1 air-to-rail advice is phrased as a choice a merchant can make (no logistics jargon)', () => {
    const current = CarbonCalculator.calculateRaw(2832, 8.5, 'air_freight').emissionKgCO2;
    const rail = CarbonCalculator.computeAlternatives(2832, 8.5, 'air_freight', current, true).find((a) => a.mode === 'rail');
    expect(rail?.recommendation).toMatch(/^Offer ground shipping instead of air/);
    expect(rail?.recommendation).not.toMatch(/line-haul/);
  });

  it('R2.3 alternatives are sorted by savings, largest first', () => {
    fc.assert(
      fc.property(distance, weight, mode, (d, w, m) => {
        const current = CarbonCalculator.calculateRaw(d, w, m).emissionKgCO2;
        const alts = CarbonCalculator.computeAlternatives(d, w, m, current, true);
        return alts.every((a, i) => i === 0 || alts[i - 1].potentialSavedKgCO2 >= a.potentialSavedKgCO2);
      })
    );
  });
});

describe('order audit', () => {
  it('R3.1 never throws and never produces NaN for arbitrary coordinates and weights', () => {
    fc.assert(
      fc.property(coord, coord, fc.oneof(weight, fc.constant(NaN), fc.constant(-1), fc.constant(0)), mode, (o, d, w, m) => {
        const r = CarbonCalculator.auditOrder(order({ origin: { city: 'x', country: 'ZZ', coordinates: o }, destination: { city: 'y', country: 'ZZ', coordinates: d }, totalWeightKg: w }), { modeOverride: m });
        return Number.isFinite(r.breakdown.emissionKgCO2) && Number.isFinite(r.breakdown.distanceKm) && r.breakdown.emissionKgCO2 >= 0;
      })
    );
  });

  it('R3.2 flags estimated weight whenever the input weight is missing or invalid', () => {
    fc.assert(
      fc.property(fc.constantFrom(NaN, 0, -3, undefined as unknown as number), (w) => {
        return CarbonCalculator.auditOrder(order({ totalWeightKg: w })).dataQuality?.weightEstimated === true;
      })
    );
  });

  it('R3.3 distance is symmetric and satisfies the triangle inequality', () => {
    fc.assert(
      fc.property(coord, coord, coord, (a, b, c) => {
        const ab = haversineDistance(a, b);
        return Math.abs(ab - haversineDistance(b, a)) < 1e-6 && ab <= haversineDistance(a, c) + haversineDistance(c, b) + 1e-6;
      })
    );
  });
});

describe('carrier inference', () => {
  it('R4.1 always returns a known mode for any string', () => {
    fc.assert(fc.property(fc.string(), fc.string(), (a, b) => MODES.includes(inferTransportMode(a, b))));
  });

  it('R4.2 does not misread place or brand names as modes', () => {
    expect(inferTransportMode('Seattle Ground')).toBe('road_truck');
    expect(inferTransportMode('Level Ground Shipping')).toBe('road_truck');
    expect(inferTransportMode('Advance Freight')).toBe('road_truck');
    expect(inferTransportMode('Fair Trade Parcel')).toBe('road_truck');
  });

  it('R4.3 recognises common service names', () => {
    expect(inferTransportMode('UPS Next Day Air')).toBe('air_freight');
    expect(inferTransportMode('FedEx 2Day Air')).toBe('air_freight');
    expect(inferTransportMode('UPS Worldwide Express')).toBe('air_freight');
    expect(inferTransportMode('USPS Priority Mail Express')).toBe('air_freight');
    expect(inferTransportMode('FedEx Ground')).toBe('road_truck');
    expect(inferTransportMode('Local Courier')).toBe('regional_van');
    expect(inferTransportMode('Electric Van Same Day')).toBe('electric_van');
    expect(inferTransportMode('Ocean freight LCL')).toBe('sea_freight');
  });
});

describe('input validation', () => {
  it('R5.1 accepts every positive finite number within limits', () => {
    fc.assert(fc.property(fc.double({ min: 1e-6, max: 50_000, noNaN: true }), (n) => parseDistanceKm(n) === n));
  });

  it('R5.2 rejects NaN, infinities, zero, negatives and non-numeric strings', () => {
    for (const bad of [NaN, Infinity, -Infinity, 0, -1, '', 'abc', null, undefined, {}, [], '12abc']) {
      expect(() => parseWeightKg(bad)).toThrow(ValidationError);
    }
  });

  it('R5.3 rejects values above the maximum', () => {
    expect(() => parseDistanceKm(50_001)).toThrow(ValidationError);
    expect(() => parseWeightKg(1_000_001)).toThrow(ValidationError);
  });
});
