import React from 'react';
import { ArrowRight, BarChart3, Bot, Layers, Leaf, PlugZap, Terminal, TrendingDown, TriangleAlert } from 'lucide-react';
import { DEFAULT_EMISSION_FACTORS } from '../../../../foundation/engine/emissionFactors.ts';
import { AuditReportSummary } from '../../../../foundation/types/index.ts';

type Target = 'dashboard' | 'webhook' | 'terminal' | 'kiro';

interface OverviewViewProps {
  summary: AuditReportSummary | null;
  demoMode: boolean;
  onNavigate: (tab: Target) => void;
}

const STEPS = [
  {
    icon: PlugZap,
    title: '1. Connect',
    text: 'Signed Shopify / WooCommerce webhooks, or a CSV / JSON order export.',
  },
  {
    icon: Leaf,
    title: '2. Calculate',
    text: 'E = distance × weight × factor for every order. Guessed weights or locations are flagged, never hidden.',
  },
  {
    icon: TrendingDown,
    title: '3. Act',
    text: 'Only alternatives a merchant can actually choose for that route: no ships to Chicago, no trucks to London.',
  },
];

const TRY: Array<{ tab: Target; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { tab: 'dashboard', label: 'Carbon Ledger', hint: 'Every order, its formula and greener options', icon: BarChart3 },
  { tab: 'webhook', label: 'Webhook Normalizer', hint: 'Paste a store payload, see it normalized', icon: Layers },
  { tab: 'terminal', label: 'CLI Terminal', hint: 'The same commands as the real CLI', icon: Terminal },
  { tab: 'kiro', label: 'Built with Kiro', hint: 'The specs, steering and hooks behind it', icon: Bot },
];

export const OverviewView: React.FC<OverviewViewProps> = ({ summary, demoMode, onNavigate }) => {
  const total = summary?.totalEmissionsKgCO2 ?? 0;
  const savingPct = summary && total > 0 ? Math.round((summary.potentialSavingsKgCO2 / total) * 100) : 0;
  const top = summary?.topEmitters?.[0];
  const topAlt = top?.alternatives[0];

  return (
    <div className="space-y-6">
      <section className="p-6 rounded-2xl bg-gradient-to-br from-[#121a17] via-[#0f1715] to-[#141d1a] border border-emerald-500/25">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Which shipping choices should your store change?</h1>
        <p className="mt-2 text-sm text-zinc-300 max-w-3xl">
          Shipping is often a small online store&apos;s largest Scope 3 emission, but carriers don&apos;t report it per order.
          EcoTrace gives every order a CO2e figure, says how reliable that figure is, and points to the orders where changing
          the service level saves the most.
        </p>
        {demoMode && (
          <p className="mt-3 text-xs text-amber-300">
            Showing sample orders plus anything sent to the live webhook. Real, signed Shopify webhooks land here too.
          </p>
        )}
      </section>

      <section aria-label="Ledger totals" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#121816] border border-zinc-800">
          <span className="text-xs text-zinc-400">Shipping footprint</span>
          <p className="mt-1 text-2xl font-mono font-bold text-white">
            {summary ? total.toFixed(2) : '--'} <span className="text-xs text-zinc-400">kg CO2e</span>
          </p>
          <p className="text-[11px] text-zinc-500">across {summary?.totalOrders ?? '--'} orders</p>
        </div>
        <div className="p-4 rounded-xl bg-[#121816] border border-emerald-500/20">
          <span className="text-xs text-zinc-400">Avoidable with realistic alternatives</span>
          <p className="mt-1 text-2xl font-mono font-bold text-emerald-400">
            {summary ? summary.potentialSavingsKgCO2.toFixed(2) : '--'} <span className="text-xs text-zinc-400">kg CO2e</span>
          </p>
          <p className="text-[11px] text-zinc-500">{summary ? `${savingPct}% of the footprint` : ''}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#121816] border border-amber-500/20">
          <span className="text-xs text-zinc-400">Orders with estimated inputs</span>
          <p className="mt-1 text-2xl font-mono font-bold text-amber-300">{summary ? summary.estimatedInputsCount ?? 0 : '--'}</p>
          <p className="text-[11px] text-zinc-500">missing product weight or an unrecognised city</p>
        </div>
      </section>

      {top && (
        <section className="p-5 rounded-xl bg-[#0f1413] border border-rose-500/25">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <TriangleAlert className="w-4 h-4" aria-hidden="true" /> Change this first
          </div>
          <p className="mt-2 text-sm text-zinc-200">
            Order <strong className="text-white">{top.orderId}</strong> ({top.origin.city} → {top.destination.city}) went by{' '}
            {DEFAULT_EMISSION_FACTORS[top.breakdown.carrierMode].name.toLowerCase()} and produced{' '}
            <strong className="text-white">{top.breakdown.emissionKgCO2.toFixed(2)} kg CO2e</strong> (grade {top.auditRating}).
          </p>
          {topAlt && <p className="mt-1 text-sm text-emerald-300">{topAlt.recommendation}</p>}
          <button
            onClick={() => onNavigate('dashboard')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            See all orders in the ledger <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </section>
      )}

      <section aria-label="How it works" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="p-4 rounded-xl bg-[#0f1413] border border-zinc-800">
            <Icon className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="mt-2 text-sm font-bold text-white">{title}</h2>
            <p className="mt-1 text-xs text-zinc-400">{text}</p>
          </div>
        ))}
      </section>

      <section aria-label="Try it">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Try it</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRY.map(({ tab, label, hint, icon: Icon }) => (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              className="text-left p-4 rounded-xl bg-[#121816] border border-zinc-800 hover:border-emerald-500/40 transition"
            >
              <Icon className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="mt-2 block text-sm font-semibold text-white">{label}</span>
              <span className="block text-[11px] text-zinc-400">{hint}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-zinc-500">
        Factors are representative per-mode values for comparing options, not a certified methodology.
      </p>
    </div>
  );
};
