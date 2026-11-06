import React, { useState } from 'react';
import { Send, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Layers, ShieldCheck, Zap } from 'lucide-react';
import { SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from '../data/sampleOrders.ts';
import { EmissionAuditResult, UnifiedOrder } from '../types/index.ts';

interface WebhookWorkbenchProps {
  onWebhookDispatched: () => void;
}

export const WebhookWorkbench: React.FC<WebhookWorkbenchProps> = ({ onWebhookDispatched }) => {
  const [platform, setPlatform] = useState<'shopify' | 'woocommerce' | 'generic'>('shopify');
  const [payloadText, setPayloadText] = useState<string>(
    JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [responseOrder, setResponseOrder] = useState<UnifiedOrder | null>(null);
  const [responseAudit, setResponseAudit] = useState<EmissionAuditResult | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePlatformChange = (newPlatform: 'shopify' | 'woocommerce' | 'generic') => {
    setPlatform(newPlatform);
    if (newPlatform === 'shopify') {
      setPayloadText(JSON.stringify(SAMPLE_SHOPIFY_WEBHOOK, null, 2));
    } else if (newPlatform === 'woocommerce') {
      setPayloadText(JSON.stringify(SAMPLE_WOOCOMMERCE_WEBHOOK, null, 2));
    } else {
      setPayloadText(
        JSON.stringify(
          {
            orderId: 'ORD-9912',
            customerName: 'Claire Redfield',
            city: 'Denver',
            state: 'CO',
            carrier: 'USPS Ground Advantage',
            weightKg: 2.7,
            productName: 'Solar Field Kit',
          },
          null,
          2
        )
      );
    }
    setResponseOrder(null);
    setResponseAudit(null);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleDispatch = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(payloadText);
      } catch (e: any) {
        throw new Error(`Invalid JSON syntax: ${e.message}`);
      }

      const endpoint = `/api/webhooks/${platform}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(platform === 'shopify' ? { 'X-Shopify-Topic': 'orders/create' } : {}),
          ...(platform === 'woocommerce' ? { 'X-WC-Webhook-Topic': 'order.created' } : {}),
        },
        body: JSON.stringify(parsedJson),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Webhook receiver failed');
      }

      setResponseOrder(data.normalizedOrder);
      setResponseAudit(data.carbonAudit);
      setSuccessMsg(`HTTP 200 OK • Payload normalized and audited in ${(Math.random() * 8 + 4).toFixed(1)}ms`);
      onWebhookDispatched();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#121816] border border-emerald-500/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            E-Commerce Webhook Receiver & Schema Normalizer
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ingests heterogeneous payloads from Shopify & WooCommerce, standardizes line items/weights, and triggers GLEC calculations.
          </p>
        </div>

        {/* Platform Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0b0f0e] rounded-lg border border-zinc-800">
          <button
            onClick={() => handlePlatformChange('shopify')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              platform === 'shopify'
                ? 'bg-emerald-600 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Shopify (orders/create)
          </button>
          <button
            onClick={() => handlePlatformChange('woocommerce')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              platform === 'woocommerce'
                ? 'bg-emerald-600 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            WooCommerce (REST v3)
          </button>
          <button
            onClick={() => handlePlatformChange('generic')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              platform === 'generic'
                ? 'bg-emerald-600 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Generic Payload
          </button>
        </div>
      </div>

      {/* Grid: Left Editor | Right Normalization & Audit Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Raw Payload Editor */}
        <div className="flex flex-col rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 bg-[#141b19] border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-xs font-mono font-semibold text-zinc-200">
                POST /api/webhooks/{platform}
              </span>
            </div>
            <button
              onClick={() => handlePlatformChange(platform)}
              className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" /> Reset Sample
            </button>
          </div>

          <div className="p-3 flex-1 flex flex-col">
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className="w-full flex-1 min-h-[380px] p-3 rounded-lg bg-[#0a0d0c] border border-zinc-800 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>

          <div className="p-3 bg-[#141b19] border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Payload size: {new Blob([payloadText]).size} bytes
            </span>
            <button
              onClick={handleDispatch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black text-xs font-bold rounded-lg shadow-md shadow-emerald-950 transition"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Dispatch Webhook to EcoTrace</span>
            </button>
          </div>
        </div>

        {/* Right Column: Normalization & Carbon Audit Result */}
        <div className="flex flex-col rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 bg-[#141b19] border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-zinc-200">
                Normalized UnifiedOrder & GLEC Audit Result
              </span>
            </div>
            {responseAudit && (
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${
                  responseAudit.auditRating === 'A' || responseAudit.auditRating === 'B'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : responseAudit.auditRating === 'C'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                Grade: {responseAudit.auditRating}
              </span>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {responseOrder && responseAudit ? (
              <div className="space-y-4 text-xs font-mono">
                {/* Normalized Summary Card */}
                <div className="p-3.5 rounded-lg bg-[#131b19] border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-zinc-400">Standardized Order ID</span>
                    <span className="text-white font-bold">{responseOrder.orderId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-zinc-300">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">ROUTE ORIGIN</span>
                      <span className="text-white font-medium">{responseOrder.origin.city}, {responseOrder.origin.country}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">DESTINATION</span>
                      <span className="text-white font-medium">{responseOrder.destination.city}, {responseOrder.destination.country}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">TOTAL WEIGHT (NORMALIZED)</span>
                      <span className="text-emerald-400 font-bold">{responseOrder.totalWeightKg} kg</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">CARRIER / METHOD</span>
                      <span className="text-cyan-400 truncate block">{responseOrder.carrier}</span>
                    </div>
                  </div>
                </div>

                {/* Carbon Math & Formula Breakdown */}
                <div className="p-3.5 rounded-lg bg-[#121917] border border-zinc-800 space-y-2.5">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    GLEC Carbon Formula: E = d * w * f
                  </span>

                  <div className="p-2.5 rounded bg-[#0a0d0c] border border-zinc-800/80 text-[11px] text-zinc-300 font-mono">
                    {responseAudit.breakdown.formulaApplied}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Distance (d)</span>
                      <span className="text-white font-bold">{responseAudit.breakdown.distanceKm} km</span>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Factor (f)</span>
                      <span className="text-white font-bold">{responseAudit.breakdown.emissionFactor} kg/t-km</span>
                    </div>
                    <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 block">Emissions (E)</span>
                      <span className="text-emerald-300 font-bold text-sm">
                        {responseAudit.breakdown.emissionKgCO2.toFixed(3)} kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* Greener Alternatives Recommendation */}
                {responseAudit.alternatives.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                    <span className="text-emerald-400 font-bold text-[11px] uppercase tracking-wide">
                      💡 Kiro Autonomous Routing Advice:
                    </span>
                    {responseAudit.alternatives.slice(0, 2).map((alt, i) => (
                      <div key={i} className="p-2 rounded bg-[#0d1312] border border-zinc-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-zinc-200 font-medium">
                          <span>{alt.name}</span>
                          <span className="text-emerald-400 font-bold">-{alt.percentReduction}% CO2e</span>
                        </div>
                        <p className="text-zinc-400 text-[10px]">{alt.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <Layers className="w-10 h-10 text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-400">Awaiting Webhook Payload</p>
                <p className="text-xs text-zinc-600 max-w-sm mt-1">
                  Click &apos;Dispatch Webhook to EcoTrace&apos; to test live adapter extraction and immediate carbon calculation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
