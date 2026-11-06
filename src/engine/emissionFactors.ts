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

  // Micro-mobility / zero-emission
  if (combined.includes('bike') || combined.includes('walker') || combined.includes('foot') || combined.includes('micro')) {
    return 'cargo_bike';
  }

  // Electric vehicles
  if (combined.includes('electric') || combined.includes('ev') || combined.includes('rivian') || combined.includes('zero emission') || combined.includes('eco-van')) {
    return 'electric_van';
  }

  // Air freight indicators
  if (
    combined.includes('air') ||
    combined.includes('plane') ||
    combined.includes('flight') ||
    combined.includes('overnight') ||
    combined.includes('next day') ||
    combined.includes('1-day') ||
    combined.includes('priority mail express') ||
    combined.includes('express saver') ||
    combined.includes('intl priority')
  ) {
    return 'air_freight';
  }

  // Rail indicators
  if (combined.includes('rail') || combined.includes('train') || combined.includes('intermodal')) {
    return 'rail';
  }

  // Sea / Ocean freight indicators
  if (combined.includes('ocean') || combined.includes('sea') || combined.includes('vessel') || combined.includes('maritime') || combined.includes('boat')) {
    return 'sea_freight';
  }

  // Regional van / local courier
  if (combined.includes('local') || combined.includes('same day') || combined.includes('courier') || combined.includes('van') || combined.includes('city')) {
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
