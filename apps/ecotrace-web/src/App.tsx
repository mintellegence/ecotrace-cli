/**
 * EcoTrace dashboard: App 2 of 2 built on the shared /foundation skeleton.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, BookOpen, Bot, Layers, ShieldCheck, Terminal as TerminalIcon } from 'lucide-react';
import { EcoTraceLogo } from './components/EcoTraceLogo.tsx';
import { TerminalEmulator } from './components/TerminalEmulator.tsx';
import { WebhookWorkbench } from './components/WebhookWorkbench.tsx';
import { CarbonDashboard } from './components/CarbonDashboard.tsx';
import { KiroAgentView } from './components/KiroAgentView.tsx';
import { CliQuickstartDocs } from './components/CliQuickstartDocs.tsx';
import { RepoArchitectureView } from './components/RepoArchitectureView.tsx';
import { apiFetch, clearToken, getToken, setToken } from './api.ts';
import { AuditReportSummary, EmissionAuditResult } from '../../../foundation/types/index.ts';

type Tab = 'terminal' | 'webhook' | 'dashboard' | 'kiro' | 'arch' | 'docs';

interface ServerMeta {
  demoMode: boolean;
  readProtected: boolean;
  adminEnabled: boolean;
  persistence: boolean;
  webhooks: { shopify: boolean; woocommerce: boolean };
}

const TABS: Array<{ id: Tab; label: string; short: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'terminal', label: 'CLI Terminal', short: 'Terminal', icon: TerminalIcon },
  { id: 'webhook', label: 'Webhook Normalizer', short: 'Webhooks', icon: Layers },
  { id: 'dashboard', label: 'Carbon Ledger', short: 'Ledger', icon: BarChart3 },
  { id: 'kiro', label: 'Kiro Agent', short: 'Kiro', icon: Bot },
  { id: 'arch', label: 'Architecture', short: 'Architecture', icon: ShieldCheck },
  { id: 'docs', label: 'Docs', short: 'Docs', icon: BookOpen },
];

const POLL_MS = 5000;

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('terminal');
  const [summary, setSummary] = useState<AuditReportSummary | null>(null);
  const [audits, setAudits] = useState<EmissionAuditResult[]>([]);
  const [meta, setMeta] = useState<ServerMeta | null>(null);
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchLedgerData = useCallback(async () => {
    try {
      const [sumRes, ordRes] = await Promise.all([apiFetch('/api/audit/summary'), apiFetch('/api/orders')]);
      if (sumRes.status === 401 || ordRes.status === 401) {
        setNeedsToken(true);
        return;
      }
      if (!sumRes.ok || !ordRes.ok) throw new Error(`HTTP ${sumRes.status}`);
      const sumData = await sumRes.json();
      const ordData = await ordRes.json();
      setSummary(sumData.summary);
      setAudits(ordData.audits || []);
      setNeedsToken(false);
      setLoadError(null);
    } catch (err) {
      setLoadError('Could not reach the EcoTrace server. Retrying...');
    }
  }, []);

  useEffect(() => {
    apiFetch('/api/meta')
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => setMeta(null));
    fetchLedgerData();
  }, [fetchLedgerData]);

  // Live refresh so orders arriving by webhook (or from the CLI) appear without reloading.
  useEffect(() => {
    if (needsToken) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchLedgerData();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchLedgerData, needsToken]);

  const handleResetLedger = async () => {
    if (!window.confirm('Reset the demo ledger to the sample orders?')) return;
    const res = await apiFetch('/api/audit/reset', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || 'Reset failed.');
    }
    fetchLedgerData();
  };

  const submitToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setToken(tokenInput.trim());
    setTokenInput('');
    fetchLedgerData();
  };

  return (
    <div className="min-h-screen bg-[#0a0e0d] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-emerald-600 focus:text-black">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 bg-[#0d1312]/95 backdrop-blur border-b border-emerald-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <EcoTraceLogo size="md" />

          <nav aria-label="Main" className="hidden md:flex items-center gap-1 p-1 bg-[#121917] rounded-xl border border-zinc-800 text-xs font-mono">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
                  activeTab === id ? 'bg-emerald-600 text-black font-bold shadow-md shadow-emerald-950/50' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#121816] border border-emerald-500/20 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
              <span className="text-zinc-400">Ledger:</span>
              <span className="text-emerald-300 font-bold">
                {summary ? `${summary.totalEmissionsKgCO2.toFixed(1)} kg CO2e` : '--'}
              </span>
            </div>
            {meta?.demoMode && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Demo data
              </span>
            )}
            {getToken() && (
              <button
                onClick={() => {
                  clearToken();
                  setNeedsToken(Boolean(meta?.readProtected));
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        <nav aria-label="Main (mobile)" className="md:hidden flex items-center justify-around px-2 py-1.5 bg-[#0e1412] border-t border-zinc-800 text-[11px] font-mono overflow-x-auto">
          {TABS.map(({ id, short }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${activeTab === id ? 'bg-emerald-600 text-black font-bold' : 'text-zinc-400'}`}
            >
              {short}
            </button>
          ))}
        </nav>
      </header>

      {meta?.demoMode && (
        <div className="bg-amber-950/30 border-b border-amber-500/20 text-amber-200 text-xs text-center px-4 py-2">
          Public demo: sample orders, nothing is stored permanently. Clone the repo to audit your own store data.
        </div>
      )}
      {loadError && (
        <div role="status" className="bg-rose-950/40 border-b border-rose-500/20 text-rose-200 text-xs text-center px-4 py-2">
          {loadError}
        </div>
      )}

      <main id="main" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {needsToken ? (
          <form onSubmit={submitToken} className="max-w-md mx-auto mt-16 p-6 rounded-xl bg-[#121816] border border-emerald-500/20 space-y-3">
            <h1 className="text-base font-bold text-white">Dashboard token required</h1>
            <p className="text-xs text-zinc-400">
              This ledger is protected. Enter the <code>ECOTRACE_READ_TOKEN</code> configured on the server. It is kept only for this
              browser tab.
            </p>
            <label htmlFor="token" className="sr-only">
              Dashboard token
            </label>
            <input
              id="token"
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0d0c] border border-zinc-700 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded-lg">
              Unlock dashboard
            </button>
          </form>
        ) : (
          <>
            {activeTab === 'terminal' && (
              <div className="h-[calc(100vh-200px)] min-h-[550px]">
                <TerminalEmulator onOrderAudited={fetchLedgerData} />
              </div>
            )}
            {activeTab === 'webhook' && <WebhookWorkbench onWebhookDispatched={fetchLedgerData} />}
            {activeTab === 'dashboard' && (
              <CarbonDashboard
                summary={summary}
                audits={audits}
                onRefresh={fetchLedgerData}
                onResetLedger={handleResetLedger}
                canReset={Boolean(meta?.demoMode)}
              />
            )}
            {activeTab === 'kiro' && <KiroAgentView onAuditExecuted={fetchLedgerData} />}
            {activeTab === 'arch' && <RepoArchitectureView />}
            {activeTab === 'docs' && <CliQuickstartDocs />}
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-zinc-800/80 bg-[#0a0e0d] py-4 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">EcoTrace</span>
            <span aria-hidden="true">•</span>
            <span>Built with Kiro for Kiroween 2026 (Skeleton Crew)</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
            <span>E = d × w × f</span>
            <span aria-hidden="true">•</span>
            <a className="hover:text-emerald-400 underline" href="https://github.com/mintellegence/ecotrace-cli" target="_blank" rel="noopener noreferrer">
              Source on GitHub
            </a>
            <span aria-hidden="true">•</span>
            <span>Apache-2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
