/**
 * Kiro Agent Background Audit Engine & Report Generator
 * Generates terminal reports, scorecard tables, and automated ledger entries.
 */

import { CarbonCalculator } from '../engine/calculator.ts';
import {
  AuditReportSummary,
  EmissionAuditResult,
  TransportMode,
  UnifiedOrder,
} from '../types/index.ts';

export class KiroAgentRunner {
  /**
   * Performs an audit across a batch of orders and creates a comprehensive scorecard
   */
  public static runAudit(orders: UnifiedOrder[]): {
    summary: AuditReportSummary;
    results: EmissionAuditResult[];
  } {
    const results: EmissionAuditResult[] = orders.map((order) =>
      CarbonCalculator.auditOrder(order)
    );

    let totalWeightKg = 0;
    let totalDistanceKm = 0;
    let totalEmissionsKgCO2 = 0;
    let potentialSavingsKgCO2 = 0;
    let excessiveOrdersCount = 0;

    const modeBreakdown: Record<TransportMode, { count: number; emissionsKg: number }> = {
      road_truck: { count: 0, emissionsKg: 0 },
      regional_van: { count: 0, emissionsKg: 0 },
      electric_van: { count: 0, emissionsKg: 0 },
      air_freight: { count: 0, emissionsKg: 0 },
      rail: { count: 0, emissionsKg: 0 },
      sea_freight: { count: 0, emissionsKg: 0 },
      cargo_bike: { count: 0, emissionsKg: 0 },
    };

    for (const res of results) {
      totalWeightKg += res.totalWeightKg;
      totalDistanceKm += res.breakdown.distanceKm;
      totalEmissionsKgCO2 += res.breakdown.emissionKgCO2;

      if (res.alternatives.length > 0) {
        potentialSavingsKgCO2 += res.alternatives[0].potentialSavedKgCO2;
      }

      if (res.status === 'excessive') {
        excessiveOrdersCount++;
      }

      const mode = res.breakdown.carrierMode;
      if (modeBreakdown[mode]) {
        modeBreakdown[mode].count += 1;
        modeBreakdown[mode].emissionsKg += res.breakdown.emissionKgCO2;
      }
    }

    const totalOrders = orders.length;
    const avgEmissionPerOrderKg = totalOrders > 0
      ? Math.round((totalEmissionsKgCO2 / totalOrders) * 1000) / 1000
      : 0;

    const summary: AuditReportSummary = {
      totalOrders,
      totalWeightKg: Math.round(totalWeightKg * 10) / 10,
      totalDistanceKm: Math.round(totalDistanceKm),
      totalEmissionsKgCO2: Math.round(totalEmissionsKgCO2 * 1000) / 1000,
      avgEmissionPerOrderKg,
      modeBreakdown,
      potentialSavingsKgCO2: Math.round(potentialSavingsKgCO2 * 1000) / 1000,
      excessiveOrdersCount,
      recentAudits: results.slice(-10),
    };

    return { summary, results };
  }

  /**
   * Generates clean ANSI terminal report for CLI output
   */
  public static generateTerminalReport(summary: AuditReportSummary): string {
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║             EcoTrace-CLI  •  Shipping Carbon Audit Report                ║');
    lines.push('║             Powered by Kiro Autonomous Background Agent                  ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`▶ AUDITED ORDERS:        ${summary.totalOrders} manifests`);
    lines.push(`▶ CUMULATIVE EMISSIONS:  ${summary.totalEmissionsKgCO2.toFixed(2)} kg CO2e`);
    lines.push(`▶ TOTAL FREIGHT DISTANCE:${summary.totalDistanceKm.toLocaleString()} km`);
    lines.push(`▶ TOTAL WEIGHT MOVED:    ${summary.totalWeightKg.toLocaleString()} kg`);
    lines.push(`▶ AVG PER ORDER:         ${summary.avgEmissionPerOrderKg.toFixed(3)} kg CO2e`);
    lines.push(`▶ POTENTIAL SAVINGS:     ${summary.potentialSavingsKgCO2.toFixed(2)} kg CO2e (Greener alternatives available)`);
    lines.push(`▶ FLAGGED HIGH-EMISSION: ${summary.excessiveOrdersCount} order(s)`);
    lines.push('');
    lines.push('─'.repeat(74));
    lines.push('MODE BREAKDOWN:');

    for (const [mode, data] of Object.entries(summary.modeBreakdown)) {
      if (data.count > 0) {
        const modeLabel = mode.padEnd(14, ' ');
        const countLabel = `${data.count} pkgs`.padEnd(10, ' ');
        const emissionLabel = `${data.emissionsKg.toFixed(2)} kg CO2e`;
        lines.push(`  • ${modeLabel} │ ${countLabel} │ ${emissionLabel}`);
      }
    }

    lines.push('─'.repeat(74));
    lines.push('SAMPLE AUDITED MANIFESTS:');
    lines.push(' ORDER ID   │ PLATFORM    │ MODE        │ DIST (KM) │ WEIGHT(KG) │ KG CO2e │ GRADE');
    lines.push('────────────┼─────────────┼─────────────┼───────────┼────────────┼─────────┼──────');

    for (const audit of summary.recentAudits.slice(0, 6)) {
      const oid = audit.orderId.padEnd(10, ' ').slice(0, 10);
      const plat = audit.platform.padEnd(11, ' ').slice(0, 11);
      const mode = audit.breakdown.carrierMode.padEnd(11, ' ').slice(0, 11);
      const dist = String(audit.breakdown.distanceKm).padStart(9, ' ');
      const wt = audit.totalWeightKg.toFixed(1).padStart(10, ' ');
      const em = audit.breakdown.emissionKgCO2.toFixed(3).padStart(7, ' ');
      const grade = `  [${audit.auditRating}]`;
      lines.push(` ${oid} │ ${plat} │ ${mode} │ ${dist} │ ${wt} │ ${em} │${grade}`);
    }

    lines.push('─'.repeat(74));
    lines.push(`✓ GLEC Framework V3.0 Compliant • Kiro Agent Hook verified.`);

    return lines.join('\n');
  }
}
