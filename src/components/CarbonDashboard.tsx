import React, { useState } from 'react';
import {
  Leaf,
  Globe2,
  TrendingDown,
  AlertOctagon,
  Scale,
  Truck,
  Plane,
  Train,
  Zap,
  Info,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { DEFAULT_EMISSION_FACTORS } from '../engine/emissionFactors.ts';
import { AuditReportSummary, EmissionAuditResult, TransportMode } from '../types/index.ts';

interface CarbonDashboardProps {
  summary: AuditReportSummary | null;
  audits: EmissionAuditResult[];
  onRefresh: () => void;
  onResetLedger: () => void;
}

export const CarbonDashboard: React.FC<CarbonDashboardProps> = ({
  summary,
  audits,
  onRefresh,
  onResetLedger,
}) => {
  const [selectedAudit, setSelectedAudit] = useState<EmissionAuditResult | null>(null);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'shopify' | 'woocommerce'>('all');

  const filteredAudits = audits.filter((a) => {
    if (platformFilter === 'all') return true;
    return a.platform === platformFilter;
  });

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'air_freight':
        return <Plane className="w-4 h-4 text-rose-400" />;
      case 'road_truck':
      case 'regional_van':
        return <Truck className="w-4 h-4 text-blue-400" />;
      case 'rail':
        return <Train className="w-4 h-4 text-amber-400" />;
      case 'electric_van':
      case 'cargo_bike':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      default:
        return <Truck className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'A':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'B':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      case 'C':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'D':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      default:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-[#121816] border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Audited Carbon</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {summary ? summary.totalEmissionsKgCO2.toFixed(2) : '14.96'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">kg CO2e</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Across {summary?.totalOrders || audits.length} shipments via GLEC V3.0
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-[#121816] border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Freight Distance Audited</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Globe2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {summary ? summary.totalDistanceKm.toLocaleString() : '5,713'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">km</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Haversine calculated with spatial detours
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-[#121816] border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Potential Green Savings</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {summary ? summary.potentialSavingsKgCO2.toFixed(2) : '14.58'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">kg CO2e</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Via ground consolidation & EV routing
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-[#121816] border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">High-Emission Alerts</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {summary ? summary.excessiveOrdersCount : '1'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">order(s) flagged</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Air freight threshold (&gt; 8 kg CO2e)
          </p>
        </div>
      </div>

      {/* Environmental Equivalents Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#121a17] via-[#101815] to-[#121918] border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Ecological Offset Equivalents
            </h4>
            <p className="text-xs text-zinc-400">
              Real-world context for current audited store shipping carbon emissions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <span className="text-lg font-mono font-bold text-white">
              {summary ? Math.round(summary.totalEmissionsKgCO2 / 0.0602) : 248}
            </span>
            <span className="text-[10px] block text-zinc-400">Tree Absorption Days</span>
          </div>
          <div>
            <span className="text-lg font-mono font-bold text-white">
              {summary ? Math.round(summary.totalEmissionsKgCO2 / 0.17) : 88}
            </span>
            <span className="text-[10px] block text-zinc-400">Gas Car Km</span>
          </div>
          <div>
            <span className="text-lg font-mono font-bold text-emerald-400">
              ${summary ? Math.max(0.2, (summary.totalEmissionsKgCO2 / 1000) * 25).toFixed(2) : '0.37'}
            </span>
            <span className="text-[10px] block text-zinc-400">Suggested Offset ($25/t)</span>
          </div>
        </div>
      </div>

      {/* Carbon Ledger Table */}
      <div className="rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#141b19] border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              E-Commerce Shipping Carbon Ledger
            </h3>
            <span className="text-xs text-zinc-400">
              Normalized store manifests with GLEC audited footprints
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#0b0e0d] border border-zinc-800 text-xs">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`px-2.5 py-1 rounded transition ${
                  platformFilter === 'all' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                All ({audits.length})
              </button>
              <button
                onClick={() => setPlatformFilter('shopify')}
                className={`px-2.5 py-1 rounded transition ${
                  platformFilter === 'shopify' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                Shopify
              </button>
              <button
                onClick={() => setPlatformFilter('woocommerce')}
                className={`px-2.5 py-1 rounded transition ${
                  platformFilter === 'woocommerce' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                WooCommerce
              </button>
            </div>

            <button
              onClick={onResetLedger}
              title="Reset to default sample dataset"
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#121816] text-zinc-400 border-b border-zinc-800 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Carrier / Mode</th>
                <th className="py-3 px-4 text-right">Distance</th>
                <th className="py-3 px-4 text-right">Weight</th>
                <th className="py-3 px-4 text-right">Carbon (E)</th>
                <th className="py-3 px-4 text-center">ESG Grade</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredAudits.map((item) => (
                <tr
                  key={item.orderId}
                  className="hover:bg-emerald-950/20 transition cursor-pointer"
                  onClick={() => setSelectedAudit(item)}
                >
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    {item.orderId}
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-zinc-800/80 text-zinc-300">
                      {item.platform}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-zinc-200">{item.origin.city}</span>
                    <span className="text-zinc-500 mx-1.5">➔</span>
                    <span className="text-emerald-400">{item.destination.city}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getModeIcon(item.breakdown.carrierMode)}
                      <span className="truncate max-w-[140px] text-zinc-300">
                        {item.breakdown.carrierName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400">
                    {item.breakdown.distanceKm} km
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-zinc-200">
                    {item.totalWeightKg.toFixed(1)} kg
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">
                    {item.breakdown.emissionKgCO2.toFixed(3)} kg
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 font-bold rounded border text-[10px] ${getRatingBadge(
                        item.auditRating
                      )}`}
                    >
                      {item.auditRating}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAudit(item);
                      }}
                      className="p-1 text-zinc-400 hover:text-emerald-400 rounded transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#121917] border border-emerald-500/30 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Order {selectedAudit.orderId}</span>
                <span className={`px-2 py-0.5 rounded border ${getRatingBadge(selectedAudit.auditRating)}`}>
                  Rating {selectedAudit.auditRating}
                </span>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="text-zinc-400 hover:text-white text-base px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Formula Breakdown */}
            <div className="p-3 rounded-lg bg-[#0a0d0c] border border-zinc-800 space-y-2">
              <span className="text-zinc-500 block text-[10px] uppercase">Scientific Calculation (GLEC V3.0)</span>
              <div className="text-emerald-300 font-mono text-xs">{selectedAudit.breakdown.formulaApplied}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-zinc-300">
              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">ORIGIN HUB</span>
                <span className="text-white font-medium">{selectedAudit.origin.city}, {selectedAudit.origin.country}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">DESTINATION</span>
                <span className="text-white font-medium">{selectedAudit.destination.city}, {selectedAudit.destination.country}</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">EMISSION FACTOR</span>
                <span className="text-white font-medium">{selectedAudit.breakdown.emissionFactor} kg CO2e / t-km</span>
              </div>
              <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">PACKAGE WEIGHT</span>
                <span className="text-white font-medium">{selectedAudit.totalWeightKg} kg</span>
              </div>
            </div>

            {/* Greener Alternatives */}
            {selectedAudit.alternatives.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                <span className="text-emerald-400 font-bold uppercase text-[10px]">
                  Kiro Logistics Optimization Recommendation:
                </span>
                {selectedAudit.alternatives.map((alt, i) => (
                  <div key={i} className="p-2 rounded bg-[#0a0f0d] text-zinc-300">
                    <div className="flex justify-between font-bold text-white">
                      <span>{alt.name}</span>
                      <span className="text-emerald-400">Save {alt.potentialSavedKgCO2} kg ({alt.percentReduction}%)</span>
                    </div>
                    <p className="text-zinc-400 text-[10px] mt-0.5">{alt.recommendation}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLEC Standard Factor Reference Table */}
      <div className="p-4 rounded-xl bg-[#0f1413] border border-zinc-800">
        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400" />
          Standard GLEC & DEFRA Logistics Emission Factors Reference
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {Object.entries(DEFAULT_EMISSION_FACTORS).map(([key, data]) => (
            <div key={key} className="p-2.5 rounded-lg bg-[#141b19] border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-200 font-semibold mb-1">
                <span className="truncate pr-1">{data.name}</span>
                <span className="text-emerald-400 font-mono shrink-0">{data.factor} kg/t-km</span>
              </div>
              <p className="text-[10px] text-zinc-400">{data.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
