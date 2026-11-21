/**
 * GLEC (Global Logistics Emissions Council) and DEFRA Standard Emission Factors
 * Values expressed in kg CO2-equivalent per tonne-kilometre (kg CO2e / t-km)
 */

import { TransportMode } from '../types/index.ts';

export interface ModeMetadata {
  name: string;
  factor: number; // kg CO2-eq per tonne-km
  description: string;
  icon: string;
  category: 'air' | 'ground' | 'sea' | 'rail' | 'green';
}

export const DEFAULT_EMISSION_FACTORS: Record<TransportMode, ModeMetadata> = {
  air_freight: {
    name: 'Air Freight (Dedicated / Belly Cargo)',
    factor: 0.602, // High altitude radiative forcing factor included
    description: 'Long-haul air courier transit (e.g. Next-Day Air, International Express)',
    icon: 'plane',
    category: 'air',
  },
  regional_van: {
    name: 'Regional Delivery Van (Diesel/Petrol)',
    factor: 0.145,
    description: 'Standard suburban / urban parcel delivery vans',
    icon: 'truck',
    category: 'ground',
  },
  road_truck: {
    name: 'Long-Haul Heavy Duty Truck',
    factor: 0.082,
    description: 'Interstate ground freight and articulated trailer transport',
    icon: 'truck',
    category: 'ground',
  },
  rail: {
    name: 'Electric / Diesel Rail Freight',
    factor: 0.024,
    description: 'Continental rail network bulk haulage',
    icon: 'train',
    category: 'rail',
  },
  electric_van: {
    name: 'Electric Commercial Van (EV)',
    factor: 0.018,
    description: 'Renewable-charged battery electric last-mile delivery fleet',
    icon: 'zap',
    category: 'green',
  },
  sea_freight: {
    name: 'Ocean Cargo Container Ship',
    factor: 0.012,
    description: 'Containerized maritime shipping lanes',
    icon: 'anchor',
    category: 'sea',
  },
  cargo_bike: {
    name: 'Cargo Bike / Walking Courier',
    factor: 0.001, // Near zero operational emissions
    description: 'Zero-emission micro-mobility urban courier',
    icon: 'bike',
    category: 'green',
  },
};

/**
 * Intelligent Carrier and Method classifier to infer TransportMode from raw carrier/shipping method strings
 */
export function inferTransportMode(carrierStr?: string, methodStr?: string): TransportMode {
  const combined = `${carrierStr || ''} ${methodStr || ''}`.toLowerCase();

  // Whole-word matching only: substring checks misclassify e.g. "Seattle" (sea),
  // "Level" (ev), "Advance" (van) or "Fair Trade" (air).

  // Micro-mobility / zero-emission
  if (/\b(bike|bicycle|walker|foot|micro)\b/.test(combined)) {
    return 'cargo_bike';
  }

  // Electric vehicles
  if (/\b(electric|ev|rivian|zero[- ]emission|eco[- ]van)\b/.test(combined)) {
    return 'electric_van';
  }

  // Air freight indicators
  if (
    /\b(air|airmail|plane|flight|overnight|next[- ]day|1[- ]day|priority mail express|express saver|intl priority|(worldwide|international|intl) express)\b/.test(
      combined
    )
  ) {
    return 'air_freight';
  }

  // Rail indicators
  if (/\b(rail|train|intermodal)\b/.test(combined)) {
    return 'rail';
  }

  // Sea / Ocean freight indicators
  if (/\b(ocean|sea|vessel|maritime|boat)\b/.test(combined)) {
    return 'sea_freight';
  }

  // Regional van / local courier
  if (/\b(local|same[- ]day|courier|van|city)\b/.test(combined)) {
    return 'regional_van';
  }

  // Default standard ground logistics (FedEx Ground, UPS Ground, DHL Freight, Standard Shipping)
  return 'road_truck';
}

/**
 * Returns human-readable carrier label
 */
export function formatModeName(mode: TransportMode): string {
  return DEFAULT_EMISSION_FACTORS[mode]?.name || mode;
}
