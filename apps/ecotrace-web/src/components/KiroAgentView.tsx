import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Cpu, FileCode, Play, ShieldAlert, Sparkles, Terminal, Users } from 'lucide-react';
import { apiFetch } from '../api.ts';

interface KiroAgentViewProps {
  onAuditExecuted: () => void;
}

interface KiroFile {
  path: string;
  kind: 'spec' | 'steering' | 'hook' | 'agent';
  title: string;
  content: string | null;
}

const KIND_META: Record<KiroFile['kind'], { label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }> = {
  spec: { label: 'Specs', icon: FileCode, blurb: 'Requirements (EARS) → design → tasks. The property-based tests reference these requirement IDs.' },
  steering: { label: 'Steering', icon: Sparkles, blurb: 'Rules Kiro follows in this repo: always-on product/tech/structure, plus fileMatch rules for the engine and security.' },
  hook: { label: 'Hooks', icon: ShieldAlert, blurb: 'Automations: tests and type checks on save, a security-review prompt, and a pre-write secret guard.' },
  agent: { label: 'Agent', icon: Users, blurb: 'A read-only custom agent that audits an order export with the CLI and explains the result.' },
};

export const KiroAgentView: React.FC<KiroAgentViewProps> = ({ onAuditExecuted }) => {
  const [files, setFiles] = useState<KiroFile[]>([]);
  const [kind, setKind] = useState<KiroFile['kind']>('spec');
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRunReport, setLastRunReport] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/kiro/specs')
      .then((r) => r.json())
      .then((d) => setFiles(d.files || []))
      .catch(() => setFiles([]));
  }, []);

  const ofKind = useMemo(() => files.filter((f) => f.kind === kind), [files, kind]);
  const current = ofKind.find((f) => f.path === selected) ?? ofKind[0];

  const handleRunKiro = async () => {
    setRunning(true);
    try {
      const res = await apiFetch('/api/kiro/run', { method: 'POST' });
      const data = await res.json();
      setLastRunReport(res.ok ? data.terminalReport : `Error: ${data.error || res.status}`);
      onAuditExecuted();
    } catch (err: any) {
      setLastRunReport(`Request failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121917] via-[#0f1715] to-[#141d1a] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Bot className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Built with Kiro</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              These are the actual files in this repository&apos;s <code>/.kiro</code> directory, served read-only. They guided Kiro
              while EcoTrace was built.
            </p>
          </div>
        </div>
        <button
          onClick={handleRunKiro}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition shrink-0"
        >
          {running ? <Cpu className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Play className="w-4 h-4 fill-current" aria-hidden="true" />}
          <span>Run audit over ledger</span>
        </button>
      </div>

      <div className="rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
        <div role="tablist" aria-label="Kiro asset type" className="flex flex-wrap items-center gap-2 p-2 bg-[#141b19] border-b border-zinc-800">
          {(Object.keys(KIND_META) as KiroFile['kind'][]).map((k) => {
            const { label, icon: Icon } = KIND_META[k];
            const count = files.filter((f) => f.kind === k).length;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => {
                  setKind(k);
                  setSelected(null);
                }}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  kind === k ? 'bg-emerald-600 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label} ({count})
              </button>
            );
          })}
        </div>

        <p className="px-4 pt-3 text-[11px] text-zinc-400">{KIND_META[kind].blurb}</p>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0">
          <ul className="p-3 space-y-1 border-r border-zinc-800">
            {ofKind.map((f) => (
              <li key={f.path}>
                <button
                  onClick={() => setSelected(f.path)}
                  aria-current={current?.path === f.path ? 'true' : undefined}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-mono transition ${
                    current?.path === f.path ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f.title}
                  <span className="block text-[10px] text-zinc-500 truncate">{f.path}</span>
                </button>
              </li>
            ))}
            {ofKind.length === 0 && <li className="text-[11px] text-zinc-500 px-2">Loading…</li>}
          </ul>
          <div className="p-4 bg-[#0a0d0c]">
            <pre className="p-4 rounded-lg bg-[#0e1412] border border-zinc-800 text-xs font-mono text-emerald-300 overflow-auto leading-relaxed max-h-[460px] whitespace-pre-wrap">
              {current ? current.content ?? `File not available on this server: ${current.path}` : ''}
            </pre>
          </div>
        </div>
      </div>

      {lastRunReport && (
        <div className="rounded-xl bg-[#0d1211] border border-emerald-500/30 overflow-hidden shadow-2xl">
          <div className="flex items-center px-4 py-2.5 bg-[#131b19] border-b border-emerald-500/20 text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Terminal className="w-4 h-4" aria-hidden="true" />
              Audit report
            </span>
          </div>
          <pre className="p-4 text-xs font-mono text-zinc-200 whitespace-pre-wrap overflow-x-auto bg-[#0a0f0d]">{lastRunReport}</pre>
        </div>
      )}
    </div>
  );
};
