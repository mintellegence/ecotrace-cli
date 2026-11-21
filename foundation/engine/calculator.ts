/**
 * EcoTrace-CLI Carbon Calculation Engine
 * Core scientific formula: E = d * w * f
 * - d = shipping distance (km)
 * - w = package weight (tonnes, derived from weightKg / 1000)
 * - f = carrier emission factor (kg CO2-eq / tonne-km)
 */

import {
  EmissionAuditResult,
  EmissionBreakdown,
  GeoLocation,
  GreenerAlternative,
  TransportMode,
  UnifiedOrder,
} from '../types/index.ts';
import {
  DEFAULT_EMISSION_FACTORS,
  formatModeName,
  inferTransportMode,
} from './emissionFactors.ts';
import { estimateShippingDistance, isOverlandRoute } from './geocoding.ts';

export interface CalculationOptions {
  customDistanceKm?: number;
  customEmissionFactor?: number;
  originOverride?: GeoLocation;
  modeOverride?: TransportMode;
}

export class CarbonCalculator {
  /**
   * Main audit calculation for a unified order
   */
  public static auditOrder(
    order: UnifiedOrder,
    options?: CalculationOptions
  ): EmissionAuditResult {
    const origin = options?.originOverride || order.origin;
    const destination = order.destination;

    // 1. Resolve Transport Mode
    const carrierMode: TransportMode =
      options?.modeOverride || inferTransportMode(order.carrier, order.shippingMethod);

    // 2. Compute Distance (d in km)
    const estimated =
      options?.customDistanceKm !== undefined
        ? null
        : estimateShippingDistance(origin, destination, carrierMode);
    const distanceKm = options?.customDistanceKm !== undefined ? options.customDistanceKm : estimated!.km;

    // 3. Package Weight (w in tonnes). Missing/invalid weights fall back to 1 kg and are flagged.
    const providedWeight = Number(order.totalWeightKg);
    const weightMissing = !Number.isFinite(providedWeight) || providedWeight <= 0;
    const weightKg = weightMissing ? 1.0 : Math.max(0.001, providedWeight);
    const weightTonnes = weightKg / 1000;

    // 4. Carrier Emission Factor (f in kg CO2-eq / tonne-km)
    const meta = DEFAULT_EMISSION_FACTORS[carrierMode];
    const emissionFactor = options?.customEmissionFactor ?? meta.factor;

    // 5. Core Formula: E = d * w * f
    // d (km) * (weightKg / 1000 tonnes) * f (kg CO2 / tonne-km)
    const rawEmissionKg = distanceKm * weightTonnes * emissionFactor;
    const emissionKgCO2 = Math.round(rawEmissionKg * 1000) / 1000;

    const breakdown: EmissionBreakdown = {
      distanceKm,
      packageWeightKg: weightKg,
      packageWeightTonnes: weightTonnes,
      carrierMode,
      carrierName: order.carrier || formatModeName(carrierMode),
      emissionFactor,
      emissionKgCO2,
      formulaApplied: `E = ${distanceKm} km * (${weightKg} kg / 1000) * ${emissionFactor} kg CO2e/t-km = ${emissionKgCO2.toFixed(3)} kg CO2e`,
    };

    // 6. Generate Greener Alternatives
    const alternatives = this.computeAlternatives(
      distanceKm,
      weightKg,
      carrierMode,
      emissionKgCO2,
      isOverlandRoute(origin, destination)
    );

    // 7. Determine Rating & Status
    const { auditRating, status } = this.evaluateRating(emissionKgCO2, carrierMode);

    // 8. Environmental Equivalents
    const environmentalEquivalents = {
      // 1 mature urban tree absorbs ~22 kg CO2 / year = ~0.0602 kg CO2 / day
      treesAbsorptionDays: Math.round((emissionKgCO2 / 0.0602) * 10) / 10,
      // Average gasoline passenger car emits ~0.170 kg CO2 / km
      gasCarKmEquivalent: Math.round((emissionKgCO2 / 0.170) * 10) / 10,
      // Smartphone full recharge emits ~0.0082 kg CO2
      smartphoneCharges: Math.round(emissionKgCO2 / 0.0082),
    };

    // 9. Carbon Offset Cost (based on $25/tonne voluntary carbon market credits)
    const suggestedOffsetCostUsd = Math.max(0.05, Math.round((emissionKgCO2 / 1000) * 25 * 100) / 100);

    return {
      orderId: order.orderId,
      orderNumber: order.orderId,
      platform: order.platform,
      timestamp: order.createdAt || new Date().toISOString(),
      origin,
      destination,
      itemsCount: order.items?.length || 1,
      totalWeightKg: weightKg,
      breakdown,
      alternatives,
      auditRating,
      status,
      environmentalEquivalents,
      suggestedOffsetCostUsd,
      dataQuality: {
        distancePrecision: estimated ? estimated.precision : 'coordinates',
        weightEstimated: weightMissing || order.weightEstimated === true,
      },
    };
  }

  /**
   * Fast calculation helper directly from numbers (CLI `ecotrace calculate`)
   */
  public static calculateRaw(
    distanceKm: number,
    weightKg: number,
    mode: TransportMode = 'road_truck',
    customFactor?: number
  ): EmissionBreakdown {
    const factor = customFactor ?? DEFAULT_EMISSION_FACTORS[mode]?.factor ?? 0.082;
    const weightTonnes = weightKg / 1000;
    const emissionKgCO2 = Math.round(distanceKm * weightTonnes * factor * 1000) / 1000;

    return {
      distanceKm,
      packageWeightKg: weightKg,
      packageWeightTonnes: weightTonnes,
      carrierMode: mode,
      carrierName: formatModeName(mode),
      emissionFactor: factor,
      emissionKgCO2,
      formulaApplied: `E = ${distanceKm} km * (${weightKg} kg / 1000) * ${factor} kg CO2e/t-km = ${emissionKgCO2.toFixed(3)} kg CO2e`,
    };
  }

  /**
   * Alternatives a merchant can actually choose for a parcel on this route.
   *  - Overland routes: ground service (truck), rail-intermodal ground (>= 500 km),
   *    EV van (<= 450 km), cargo bike (<= 30 km). Never sea freight.
   *  - Intercontinental / island routes: consolidated ocean freight only. Never truck.
   */
  public static computeAlternatives(
    distanceKm: number,
    weightKg: number,
    currentMode: TransportMode,
    currentEmissionKg: number,
    overland = true
  ): GreenerAlternative[] {
    const list: GreenerAlternative[] = [];
    const candidateModes: TransportMode[] = overland
      ? ['road_truck', 'rail', 'electric_van', 'cargo_bike']
      : ['sea_freight'];

    for (const altMode of candidateModes) {
      if (altMode === currentMode) continue;

      // Filter modes by realistic distance thresholds
      if (altMode === 'cargo_bike' && distanceKm > 30) continue;
      if (altMode === 'electric_van' && distanceKm > 450) continue;
      if (altMode === 'rail' && distanceKm < 500) continue;
      if (altMode === 'sea_freight' && distanceKm < 300) continue;

      const altFactor = DEFAULT_EMISSION_FACTORS[altMode].factor;
      const altEmissions = (distanceKm * (weightKg / 1000) * altFactor);

      if (altEmissions < currentEmissionKg) {
        const saved = Math.round((currentEmissionKg - altEmissions) * 1000) / 1000;
        const percent = Math.round(((currentEmissionKg - altEmissions) / currentEmissionKg) * 100);

        let recommendation = `Switch to ${DEFAULT_EMISSION_FACTORS[altMode].name} to cut ${saved.toFixed(2)} kg CO2e (${percent}%).`;
        if (currentMode === 'air_freight' && altMode === 'road_truck') {
          recommendation = `Offer a ground service (typically 2-5 days) instead of air: cuts ${saved.toFixed(2)} kg CO2e (${percent}%).`;
        } else if (altMode === 'rail') {
          recommendation = `Use a ground service that moves line-haul by rail (intermodal): cuts ${saved.toFixed(2)} kg CO2e (${percent}%).`;
        } else if (altMode === 'electric_van') {
          recommendation = `Regional EV delivery is viable at this distance: cuts ${saved.toFixed(2)} kg CO2e (${percent}%).`;
        } else if (altMode === 'sea_freight') {
          recommendation = `For non-urgent stock, consolidate into ocean freight: cuts ${saved.toFixed(2)} kg CO2e (${percent}%).`;
        }

        list.push({
          mode: altMode,
          name: DEFAULT_EMISSION_FACTORS[altMode].name,
          emissionKgCO2: Math.round(altEmissions * 1000) / 1000,
          potentialSavedKgCO2: saved,
          percentReduction: percent,
          recommendation,
        });
      }
    }

    return list.sort((a, b) => b.potentialSavedKgCO2 - a.potentialSavedKgCO2);
  }

  /**
   * Assigns ESG rating and emission severity status
   */
  private static evaluateRating(
    emissionKg: number,
    mode: TransportMode
  ): { auditRating: 'A' | 'B' | 'C' | 'D' | 'F'; status: 'optimal' | 'moderate' | 'excessive' } {
    if (mode === 'electric_van' || mode === 'cargo_bike') {
      return { auditRating: 'A', status: 'optimal' };
    }

    if (emissionKg < 0.25) {
      return { auditRating: 'A', status: 'optimal' };
    } else if (emissionKg < 1.5) {
      return { auditRating: 'B', status: 'optimal' };
    } else if (emissionKg < 5.0) {
      return { auditRating: 'C', status: 'moderate' };
    } else if (emissionKg < 12.0) {
      return { auditRating: 'D', status: 'excessive' };
    } else {
      return { auditRating: 'F', status: 'excessive' };
    }
  }
}
