/**
 * EcoTrace-CLI Command Handlers
 * Reusable command implementations for both Node CLI and the Web Terminal Simulator
 */

import { AdapterRegistry } from '../adapters/index.ts';
import { CarbonCalculator } from '../engine/calculator.ts';
import { DEFAULT_EMISSION_FACTORS, inferTransportMode } from '../engine/emissionFactors.ts';
import { KiroAgentRunner } from '../kiro/agentRunner.ts';
import { KIRO_AGENT_SPEC } from '../kiro/specs.ts';
import { EcoTraceConfig, TransportMode, UnifiedOrder } from '../types/index.ts';

export const DEFAULT_CONFIG: EcoTraceConfig = {
  version: '1.0.0',
  store: {
    name: 'My Eco-Commerce Store',
    platform: 'multi',
    defaultOrigin: {
      city: 'Memphis',
      state: 'TN',
      country: 'US',
      postalCode: '38118',
    },
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
      message: `[OK] Generated ecotrace.config.json\n[OK] Kiro agent hooks synchronized (.kiro/hooks/audit-hook.json)\n[OK] Default logistics origin configured: Memphis, TN (US hub)\nReady! Next run: 'ecotrace audit' or 'ecotrace listen'`,
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
   * ecotrace kiro specs
   */
  public static handleKiroSpecs(): string {
    const jsonStr = JSON.stringify(KIRO_AGENT_SPEC, null, 2);
    return `[Kiro Agent Specification: ecotrace-auditor v1.0.0]\n${jsonStr}`;
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
      `  • Customer:     ${order.customer?.name} (${order.customer?.email})`,
      `  • Origin:       ${order.origin.city}, ${order.origin.country}`,
      `  • Destination:  ${order.destination.city}, ${order.destination.country}`,
      `  • Total Weight: ${order.totalWeightKg} kg`,
      `  • Carrier:      ${order.carrier}`,
      `  • Calculated:   ${audit.breakdown.emissionKgCO2.toFixed(3)} kg CO2e (Rating: ${audit.auditRating})`,
    ].join('\n');

    return { order, report };
  }
}
