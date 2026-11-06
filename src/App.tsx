/**
 * EcoTrace-CLI Interactive Workbench
 * Built for Kiroween (Skeleton Crew Category)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Layers,
  BarChart3,
  Bot,
  BookOpen,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { EcoTraceLogo } from './components/EcoTraceLogo.tsx';
import { TerminalEmulator } from './components/TerminalEmulator.tsx';
import { WebhookWorkbench } from './components/WebhookWorkbench.tsx';
import { CarbonDashboard } from './components/CarbonDashboard.tsx';
import { KiroAgentView } from './components/KiroAgentView.tsx';
import { CliQuickstartDocs } from './components/CliQuickstartDocs.tsx';
import { RepoArchitectureView } from './components/RepoArchitectureView.tsx';
import { GitSyncModal } from './components/GitSyncModal.tsx';
import { AuditReportSummary, EmissionAuditResult, UnifiedOrder } from './types/index.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'webhook' | 'dashboard' | 'kiro' | 'arch' | 'docs'>('terminal');
  const [gitModalOpen, setGitModalOpen] = useState(false);
  const [summary, setSummary] = useState<AuditReportSummary | null>(null);
  const [audits, setAudits] = useState<EmissionAuditResult[]>([]);
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLedgerData = useCallback(async () => {
    try {
      const [sumRes, ordRes] = await Promise.all([
        fetch('/api/audit/summary'),
        fetch('/api/orders'),
      ]);

      if (sumRes.ok && ordRes.ok) {
        const sumData = await sumRes.json();
        const ordData = await ordRes.json();
        setSummary(sumData.summary);
        setAudits(ordData.audits || []);
        setOrders(ordData.orders || []);
      }
    } catch (err) {
      console.error('Failed to sync ledger data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  const handleResetLedger = async () => {
    try {
      await fetch('/api/audit/reset', { method: 'POST' });
      fetchLedgerData();
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e0d] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-[#0d1312]/95 backdrop-blur border-b border-emerald-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <EcoTraceLogo size="md" />

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-[#121917] rounded-xl border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'terminal'
                  ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>CLI Terminal</span>
            </button>
            <button
              onClick={() => setActiveTab('webhook')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'webhook'
                  ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Webhook Normalizer</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Carbon Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('kiro')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'kiro'
                  ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Kiro Agent</span>
            </button>
            <button
              onClick={() => setActiveTab('arch')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'arch'
                  ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dual-Apps & Git</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'docs'
                  ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Docs</span>
            </button>
          </nav>

          {/* Right Status Indicator & Git Sync */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setGitModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold transition shadow-sm"
              title="Push to sm.sharifhussain@gmail.com git repository"
            >
              <span>Push to Git</span>
            </button>
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#121816] border border-emerald-500/20 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-zinc-400">GLEC Engine:</span>
              <span className="text-emerald-300 font-bold">
                {summary ? `${summary.totalEmissionsKgCO2.toFixed(1)} kg CO2e` : '14.9 kg'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Kiroween
            </span>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex items-center justify-around px-2 py-1.5 bg-[#0e1412] border-t border-zinc-800 text-[11px] font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-2.5 py-1 rounded ${activeTab === 'terminal' ? 'bg-emerald-600 text-black font-bold' : 'text-zinc-400'}`}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`px-2.5 py-1 rounded ${activeTab === 'webhook' ? 'bg-emerald-600 text-black font-bold' : 'text-zinc-400'}`}
          >
            Webhooks
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded ${activeTab === 'dashboard' ? 'bg-emerald-600 text-black font-bold' : 'text-zinc-400'}`}
          >
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('kiro')}
            className={`px-2.5 py-1 rounded ${activeTab === 'kiro' ? 'bg-emerald-600 text-black font-bold' : 'text-zinc-400'}`}
          >
            Kiro Agent
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-2.5 py-1 rounded ${activeTab === 'docs' ? 'bg-emerald-600 text-black font-bold' : 'text-zinc-400'}`}
          >
            Docs
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'terminal' && (
          <div className="h-[calc(100vh-160px)] min-h-[550px]">
            <TerminalEmulator onOrderAudited={fetchLedgerData} />
          </div>
        )}

        {activeTab === 'webhook' && (
          <WebhookWorkbench onWebhookDispatched={fetchLedgerData} />
        )}

        {activeTab === 'dashboard' && (
          <CarbonDashboard
            summary={summary}
            audits={audits}
            onRefresh={fetchLedgerData}
            onResetLedger={handleResetLedger}
          />
        )}

        {activeTab === 'kiro' && (
          <KiroAgentView onAuditExecuted={fetchLedgerData} />
        )}

        {activeTab === 'arch' && (
          <RepoArchitectureView />
        )}

        {activeTab === 'docs' && (
          <CliQuickstartDocs />
        )}
      </main>

      <GitSyncModal isOpen={gitModalOpen} onClose={() => setGitModalOpen(false)} />

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-[#0a0e0d] py-4 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">🌿 EcoTrace-CLI</span>
            <span>•</span>
            <span>Kiroween Skeleton Crew Autonomous Logistics Agent</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
            <span>Formula: E = d * w * f</span>
            <span>•</span>
            <span>GLEC V3.0 Compliant</span>
            <span>•</span>
            <span>Apache-2.0 License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
