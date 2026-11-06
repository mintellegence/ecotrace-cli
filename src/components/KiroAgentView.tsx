import React, { useState } from 'react';
import { Bot, Play, CheckCircle2, FileCode, Cpu, ShieldAlert, Sparkles, Terminal } from 'lucide-react';
import { KIRO_AGENT_SPEC } from '../kiro/specs.ts';

interface KiroAgentViewProps {
  onAuditExecuted: () => void;
}

export const KiroAgentView: React.FC<KiroAgentViewProps> = ({ onAuditExecuted }) => {
  const [activeTab, setActiveTab] = useState<'manifest' | 'steering' | 'hook'>('manifest');
  const [running, setRunning] = useState(false);
  const [lastRunReport, setLastRunReport] = useState<string | null>(null);

  const handleRunKiro = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/kiro/run', { method: 'POST' });
      const data = await res.json();
      setLastRunReport(data.terminalReport);
      onAuditExecuted();
    } catch (err: any) {
      setLastRunReport(`Kiro agent execution error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const STEERING_DIRECTIVE = `# EcoTrace Kiro Agent Steering Directive
## Identity & Role
You are the **EcoTrace Background Logistics Auditor**, an autonomous background agent operating in the Kiroween Skeleton Crew architecture. Your duty is to inspect shipping manifests, quantify greenhouse gas emissions (E = d * w * f), and steer store merchants toward green fulfillment practices without disrupting order checkout latency.

## Principles of Execution
1. Zero-Latency Ingestion: Ingestion completes synchronously in < 20ms. Spatial route audits execute asynchronously.
2. GLEC Framework Compliance: Strictly enforce DEFRA/GLEC emission factors per tonne-km.
3. Actionable Green Interventions: Tag high emission shipments (>= 8.0 kg CO2e) and recommend ground/EV routes.
4. Clean Terminal Logging: Deterministic, high-signal ASCII ledger entries.`;

  const HOOK_SPEC = `{
  "$schema": "https://kiro.dev/schemas/hook-v1.json",
  "name": "post-order-carbon-audit",
  "eventType": "order.created",
  "platforms": ["shopify", "woocommerce", "custom"],
  "pipeline": [
    { "step": "normalize_payload", "adapter": "auto_detect", "target": "UnifiedOrder" },
    { "step": "compute_spatial_distance", "engine": "haversine_with_detour" },
    { "step": "calculate_glec_emissions", "formula": "E = d * w * f", "precision": 3 },
    { "step": "evaluate_greener_alternatives", "strategies": ["ground_consolidation", "last_mile_ev"] },
    { "step": "append_to_carbon_ledger", "destination": ".ecotrace/ledger.json" }
  ]
}`;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121917] via-[#0f1715] to-[#141d1a] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-mono">Kiro Autonomous Agent Spec</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Skeleton Crew Certified
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Configuration specs, steering directives, and background automation hooks for Kiro CLI to audit e-commerce emissions invisibly.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunKiro}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition shrink-0"
        >
          {running ? (
            <Cpu className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>Trigger Kiro Background Audit</span>
        </button>
      </div>

      {/* Architecture & Pipeline Visual */}
      <div className="p-4 rounded-xl bg-[#0f1413] border border-zinc-800">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-3 font-mono">
          Kiro Autonomous Background Pipeline
        </span>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#141b19] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">STEP 1</span>
            <span className="text-white font-bold block">Webhook Ingest</span>
            <span className="text-[10px] text-emerald-400 block">&lt; 20ms sync return</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141b19] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">STEP 2</span>
            <span className="text-white font-bold block">Adapter Normalizer</span>
            <span className="text-[10px] text-cyan-400 block">Shopify / Woo Unified</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141b19] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">STEP 3</span>
            <span className="text-white font-bold block">Haversine Spatial</span>
            <span className="text-[10px] text-amber-400 block">Distance + Detour</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141b19] border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 block">STEP 4</span>
            <span className="text-white font-bold block">GLEC Engine</span>
            <span className="text-[10px] text-emerald-400 block">E = d * w * f</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141b19] border border-emerald-500/20 space-y-1">
            <span className="text-[10px] text-zinc-500 block">STEP 5</span>
            <span className="text-white font-bold block">Ledger & Advisories</span>
            <span className="text-[10px] text-emerald-300 block">Auto-hook executed</span>
          </div>
        </div>
      </div>

      {/* Tabs for Spec Files */}
      <div className="rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 p-2 bg-[#141b19] border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'manifest'
                ? 'bg-emerald-600 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            .kiro/agent.json
          </button>
          <button
            onClick={() => setActiveTab('steering')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'steering'
                ? 'bg-emerald-600 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            .kiro/steering/eco-steering.md
          </button>
          <button
            onClick={() => setActiveTab('hook')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'hook'
                ? 'bg-emerald-600 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            .kiro/hooks/audit-hook.json
          </button>
        </div>

        <div className="p-4 bg-[#0a0d0c]">
          <pre className="p-4 rounded-lg bg-[#0e1412] border border-zinc-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-[360px] scrollbar-thin">
            {activeTab === 'manifest' && JSON.stringify(KIRO_AGENT_SPEC, null, 2)}
            {activeTab === 'steering' && STEERING_DIRECTIVE}
            {activeTab === 'hook' && HOOK_SPEC}
          </pre>
        </div>
      </div>

      {/* Live Kiro Execution Output */}
      {lastRunReport && (
        <div className="rounded-xl bg-[#0d1211] border border-emerald-500/30 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#131b19] border-b border-emerald-500/20 text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              Kiro Background Audit Terminal Execution Output
            </span>
            <span className="text-zinc-500">Exit Code: 0 (Success)</span>
          </div>
          <pre className="p-4 text-xs font-mono text-zinc-200 whitespace-pre-wrap overflow-x-auto bg-[#0a0f0d]">
            {lastRunReport}
          </pre>
        </div>
      )}
    </div>
  );
};
