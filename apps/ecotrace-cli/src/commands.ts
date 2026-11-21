/**
 * EcoTrace-CLI Command Handlers
 * Reusable command implementations for both Node CLI and the Web Terminal Simulator
 */

import { AdapterRegistry } from '../../../foundation/adapters/index.ts';
import { CarbonCalculator } from '../../../foundation/engine/calculator.ts';
import { DEFAULT_EMISSION_FACTORS, inferTransportMode } from '../../../foundation/engine/emissionFactors.ts';
import { getDefaultOrigin } from '../../../foundation/config/origin.ts';
import { parseDistanceKm, parseWeightKg } from '../../../foundation/engine/validation.ts';
import { KiroAgentRunner } from '../../../foundation/kiro/agentRunner.ts';
import { KIRO_AGENT_SPEC } from '../../../foundation/kiro/specs.ts';
import { EcoTraceConfig, TransportMode, UnifiedOrder } from '../../../foundation/types/index.ts';

export const DEFAULT_CONFIG: EcoTraceConfig = {
  version: '1.0.0',
  store: {
    name: 'My Eco-Commerce Store',
    platform: 'multi',
    defaultOrigin: getDefaultOrigin(),
    currency: 'USD',
  },
  emissionFactors: {
    air_freight: 0.602,
    road_truck: 0.082,
    regional_van: 0.145,
    electric_van: 0.018,
    rail: 0.024,
    sea_freight: 0.012,
    cargo_bike: 0.001,
  },
  thresholds: {
    excessiveEmissionKg: 8.0,
    alertOnAirFreight: true,
  },
  kiroAgent: {
    enabled: true,
    autoAuditOnWebhook: true,
    notifyOnExcessive: true,
    outputFormat: 'table',
    webhookPort: 3000,
  },
};

export class CliCommandHandler {
  /**
   * ecotrace init
   */
  public static handleInit(): { message: string; config: EcoTraceConfig } {
    return {
      message: `[OK] Generated ecotrace.config.json\n[OK] Origin set to ${DEFAULT_CONFIG.store.defaultOrigin.city} (override with ECOTRACE_ORIGIN_* environment variables)\nReady! Next: 'ecotrace audit <orders.json|orders.csv>' or 'ecotrace calculate -d 800 -w 3'`,
      config: DEFAULT_CONFIG,
    };
  }

  /**
   * ecotrace calculate --dist <km> --weight <kg> --carrier <mode>
   */
  public static handleCalculate(args: {
    distanceKm: number;
    weightKg: number;
    carrier?: string;
  }): string {
    // Throws ValidationError for NaN, zero, negative or absurd values.
    args = {
      ...args,
      distanceKm: parseDistanceKm(args.distanceKm),
      weightKg: parseWeightKg(args.weightKg),
    };
    const mode: TransportMode = inferTransportMode(args.carrier, '');
    const res = CarbonCalculator.calculateRaw(args.distanceKm, args.weightKg, mode);

    const lines: string[] = [
      `┌────────────────────────────────────────────────────────────┐`,
      `│            EcoTrace Shipping Emission Calculation           │`,
      `└────────────────────────────────────────────────────────────┘`,
      `  • Distance (d):      ${args.distanceKm} km`,
      `  • Package Weight (w):${args.weightKg} kg (${(args.weightKg / 1000).toFixed(4)} tonnes)`,
      `  • Transport Mode:    ${res.carrierName}`,
      `  • Emission Factor (f):${res.emissionFactor} kg CO2e / tonne-km`,
      `──────────────────────────────────────────────────────────────`,
      `  TOTAL FOOTPRINT (E): ${res.emissionKgCO2.toFixed(3)} kg CO2e`,
      `  Formula:             ${res.formulaApplied}`,
    ];

    if (mode === 'air_freight') {
      const roadAlt = CarbonCalculator.calculateRaw(args.distanceKm, args.weightKg, 'road_truck');
      const saved = Math.round((res.emissionKgCO2 - roadAlt.emissionKgCO2) * 1000) / 1000;
      const pct = Math.round((saved / res.emissionKgCO2) * 100);
      lines.push(`──────────────────────────────────────────────────────────────`);
      lines.push(`  [KIRO ADVICE] Ground Freight Alternative saves ${saved.toFixed(2)} kg CO2e (${pct}% reduction)`);
    } else if (mode === 'road_truck' && args.distanceKm < 450) {
      const evAlt = CarbonCalculator.calculateRaw(args.distanceKm, args.weightKg, 'electric_van');
      const saved = Math.round((res.emissionKgCO2 - evAlt.emissionKgCO2) * 1000) / 1000;
      lines.push(`──────────────────────────────────────────────────────────────`);
      lines.push(`  [KIRO ADVICE] Regional EV Fleet Alternative saves ${saved.toFixed(2)} kg CO2e`);
    }

    return lines.join('\n');
  }

  /**
   * ecotrace audit
   */
  public static handleAudit(orders: UnifiedOrder[]): string {
    const { summary } = KiroAgentRunner.runAudit(orders);
    return KiroAgentRunner.generateTerminalReport(summary);
  }

  /**
   * ecotrace audit --format json : machine-readable output for pipelines and spreadsheets
   */
  public static handleAuditJson(orders: UnifiedOrder[]): string {
    const { summary, results } = KiroAgentRunner.runAudit(orders);
    const { recentAudits: _recent, ...totals } = summary;
    return JSON.stringify({ summary: totals, results }, null, 2);
  }

  /**
   * ecotrace audit --format csv : one row per order, ready for ESG / Scope 3 reporting
   */
  public static handleAuditCsv(orders: UnifiedOrder[]): string {
    const { results } = KiroAgentRunner.runAudit(orders);
    const header = [
      'order_id', 'platform', 'date', 'origin', 'destination', 'mode', 'distance_km',
      'weight_kg', 'factor_kg_per_tkm', 'emission_kg_co2e', 'grade', 'best_alternative',
      'potential_saving_kg', 'weight_estimated', 'distance_precision',
    ];
    const rows = results.map((r) => [
      r.orderId, r.platform, r.timestamp, r.origin.city, r.destination.city, r.breakdown.carrierMode,
      r.breakdown.distanceKm, r.totalWeightKg, r.breakdown.emissionFactor, r.breakdown.emissionKgCO2,
      r.auditRating, r.alternatives[0]?.mode ?? '', r.alternatives[0]?.potentialSavedKgCO2 ?? 0,
      r.dataQuality?.weightEstimated ?? false, r.dataQuality?.distancePrecision ?? '',
    ]);
    return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  }

  /**
   * ecotrace kiro specs
   */
  public static handleKiroSpecs(): string {
    const s = KIRO_AGENT_SPEC;
    return [
      `[Kiro assets used to build ${s.project}: see /.kiro]`,
      `  Specs:    ${s.specs.join(', ')}`,
      `  Steering: ${s.steering.join(', ')}`,
      `  Hooks:`,
      ...s.hooks.map((h) => `    - ${h}`),
      `  Agents:   ${s.agents.join(', ')}`,
    ].join('\n');
  }

  /**
   * ecotrace webhook normalize test
   */
  public static handleNormalizeTest(payload: any): { order: UnifiedOrder; report: string } {
    const { order, matchedPlatform } = AdapterRegistry.normalize(payload);
    const audit = CarbonCalculator.auditOrder(order);

    const report = [
      `[OK] Matched Adapter: ${matchedPlatform.toUpperCase()}`,
      `  • Order ID:     ${order.orderId}`,

      `  • Origin:       ${order.origin.city}, ${order.origin.country}`,
      `  • Destination:  ${order.destination.city}, ${order.destination.country}`,
      `  • Total Weight: ${order.totalWeightKg} kg`,
      `  • Carrier:      ${order.carrier}`,
      `  • Calculated:   ${audit.breakdown.emissionKgCO2.toFixed(3)} kg CO2e (Rating: ${audit.auditRating})`,
      ...(audit.dataQuality?.weightEstimated ? ['  • [WARN] Weight was estimated (platform sent no product weights).'] : []),
      ...(audit.dataQuality && audit.dataQuality.distancePrecision !== 'coordinates'
        ? [`  • [WARN] Distance precision: ${audit.dataQuality.distancePrecision}`]
        : []),
    ].join('\n');

    return { order, report };
  }
}

/**
 * Quotes a CSV cell and neutralises spreadsheet formula injection
 * (cells starting with = + - @ are prefixed with an apostrophe).
 */
export function csvCell(value: unknown): string {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
