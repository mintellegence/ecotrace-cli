/**
 * EcoTrace-CLI Core Types
 * Unified schemas for e-commerce carbon auditing and normalization
 */

export type ECommercePlatform = 'shopify' | 'woocommerce' | 'manual' | 'generic';

export type TransportMode =
  | 'road_truck'
  | 'regional_van'
  | 'electric_van'
  | 'air_freight'
  | 'rail'
  | 'sea_freight'
  | 'cargo_bike';

export interface GeoLocation {
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: [number, number]; // [lat, lng]
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  weightKg: number;
  price?: number;
  sku?: string;
}

export interface UnifiedOrder {
  orderId: string;
  platform: ECommercePlatform;
  createdAt: string;
  customer?: {
    name?: string;
    email?: string;
  };
  origin: GeoLocation;
  destination: GeoLocation;
  items: OrderItem[];
  totalWeightKg: number;
  carrier: string;
  shippingMethod: string;
  trackingNumber?: string;
  currency?: string;
  totalPrice?: number;
  rawPayload?: any;
}

export interface EmissionBreakdown {
  distanceKm: number;
  packageWeightKg: number;
  packageWeightTonnes: number;
  carrierMode: TransportMode;
  carrierName: string;
  emissionFactor: number; // kg CO2-eq per tonne-km
  emissionKgCO2: number; // E = d * (w / 1000) * f
  formulaApplied: string;
}

export interface GreenerAlternative {
  mode: TransportMode;
  name: string;
  emissionKgCO2: number;
  potentialSavedKgCO2: number;
  percentReduction: number;
  recommendation: string;
}

export interface EmissionAuditResult {
  orderId: string;
  orderNumber?: string;
  platform: ECommercePlatform;
  timestamp: string;
  origin: GeoLocation;
  destination: GeoLocation;
  itemsCount: number;
  totalWeightKg: number;
  breakdown: EmissionBreakdown;
  alternatives: GreenerAlternative[];
  auditRating: 'A' | 'B' | 'C' | 'D' | 'F'; // A: minimal footprint / EV / rail, F: extreme air freight
  status: 'optimal' | 'moderate' | 'excessive';
  environmentalEquivalents: {
    treesAbsorptionDays: number;
    gasCarKmEquivalent: number;
    smartphoneCharges: number;
  };
  suggestedOffsetCostUsd: number; // e.g. ~$20/tonne CO2
}

export interface EcoTraceConfig {
  version: string;
  store: {
    name: string;
    platform: 'shopify' | 'woocommerce' | 'multi';
    defaultOrigin: GeoLocation;
    currency: string;
  };
  emissionFactors: Partial<Record<TransportMode, number>>;
  thresholds: {
    excessiveEmissionKg: number;
    alertOnAirFreight: boolean;
  };
  kiroAgent: {
    enabled: boolean;
    autoAuditOnWebhook: boolean;
    notifyOnExcessive: boolean;
    outputFormat: 'table' | 'json' | 'compact';
    webhookPort: number;
  };
}

export interface AuditReportSummary {
  totalOrders: number;
  totalWeightKg: number;
  totalDistanceKm: number;
  totalEmissionsKgCO2: number;
  avgEmissionPerOrderKg: number;
  modeBreakdown: Record<TransportMode, { count: number; emissionsKg: number }>;
  potentialSavingsKgCO2: number;
  excessiveOrdersCount: number;
  recentAudits: EmissionAuditResult[];
}
