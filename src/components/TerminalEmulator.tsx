import React, { useState, useRef, useEffect } from 'react';
import { Terminal, CornerDownLeft, Copy, Check, Trash2, Sparkles, Play } from 'lucide-react';

interface TerminalEmulatorProps {
  onOrderAudited?: () => void;
}

interface CommandHistoryItem {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  isError?: boolean;
}

export const TerminalEmulator: React.FC<TerminalEmulatorProps> = ({ onOrderAudited }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([
    {
      id: 'init-0',
      command: 'ecotrace --help',
      output: `🌿 EcoTrace-CLI v1.0.0 (Kiroween Skeleton Crew)
Autonomous shipping carbon emissions auditor for e-commerce.

Available Commands:
  ecotrace init                          Initialize config & register Kiro hooks
  ecotrace audit                         Audit orders & generate carbon scorecard
  ecotrace calc -d <km> -w <kg> -c <opt> Calculate E = d * w * f for a single parcel
  ecotrace listen                        Display active webhook receiver status
  ecotrace kiro run                      Trigger autonomous Kiro agent background audit
  ecotrace kiro specs                    Inspect .kiro/agent.json specifications
  ecotrace test-webhook <shopify|wc>     Simulate mock e-commerce webhook ingestion
  clear                                  Clear terminal screen

Try clicking one of the quick test chips above or type a command!`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [cmdIndex, setCmdIndex] = useState<number>(-1);
  const [cmdList, setCmdList] = useState<string[]>(['ecotrace --help']);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const executeCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    if (cmd === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    setCmdList((prev) => [...prev, cmd]);
    setCmdIndex(-1);
    setLoading(true);

    try {
      const res = await fetch('/api/cli/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });

      const data = await res.json();
      setHistory((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          command: cmd,
          output: data.output || 'Done.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      if (cmd.includes('audit') || cmd.includes('test-webhook') || cmd.includes('kiro run')) {
        onOrderAudited?.();
      }
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}`,
          command: cmd,
          output: `Error executing command: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdList.length === 0) return;
      const nextIndex = cmdIndex === -1 ? cmdList.length - 1 : Math.max(0, cmdIndex - 1);
      setCmdIndex(nextIndex);
      setInput(cmdList[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdIndex === -1) return;
      const nextIndex = cmdIndex + 1;
      if (nextIndex >= cmdList.length) {
        setCmdIndex(-1);
        setInput('');
      } else {
        setCmdIndex(nextIndex);
        setInput(cmdList[nextIndex]);
      }
    }
  };

  const handleCopyLogs = () => {
    const text = history.map((h) => `$ ${h.command}\n${h.output}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const QUICK_COMMANDS = [
    { label: 'ecotrace audit', cmd: 'ecotrace audit' },
    { label: 'ecotrace calc (Air)', cmd: 'ecotrace calc -d 1450 -w 5.2 -c "FedEx Express 2-Day Air"' },
    { label: 'ecotrace calc (EV)', cmd: 'ecotrace calc -d 85 -w 2.0 -c "Electric Van"' },
    { label: 'ecotrace kiro run', cmd: 'ecotrace kiro run' },
    { label: 'simulate shopify hook', cmd: 'ecotrace test-webhook shopify' },
    { label: 'simulate woocommerce hook', cmd: 'ecotrace test-webhook woocommerce' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d1211] rounded-2xl border border-emerald-500/20 shadow-2xl overflow-hidden font-mono text-sm">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#131a18] border-b border-emerald-500/15">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block border border-rose-600/40"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-600/40"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/40"></span>
          </div>
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-300">ecotrace-cli • zsh (interactive node runtime)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            title="Copy terminal session"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-400 hover:text-emerald-300 bg-zinc-800/60 hover:bg-zinc-800 rounded transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setHistory([])}
            title="Clear terminal"
            className="p-1.5 text-zinc-400 hover:text-rose-400 bg-zinc-800/60 hover:bg-zinc-800 rounded transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Interactive Command Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-[#101614] border-b border-emerald-950/60 overflow-x-auto scrollbar-none">
        <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-emerald-400" /> Quick Run:
        </span>
        {QUICK_COMMANDS.map((item, i) => (
          <button
            key={i}
            onClick={() => executeCommand(item.cmd)}
            disabled={loading}
            className="px-2.5 py-0.5 text-xs text-emerald-300/90 hover:text-emerald-200 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/20 rounded-md transition whitespace-nowrap flex items-center gap-1"
          >
            <Play className="w-2.5 h-2.5 fill-current opacity-70" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 select-text scrollbar-thin scrollbar-thumb-zinc-800">
        {history.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <span className="text-emerald-400 font-bold">➜</span>
              <span className="text-cyan-400 font-semibold">~/store</span>
              <span className="text-zinc-500">git:(main)</span>
              <span className="text-zinc-200 font-semibold">$ {item.command}</span>
              <span className="ml-auto text-[10px] text-zinc-600">{item.timestamp}</span>
            </div>
            <pre
              className={`p-3 rounded-lg text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap ${
                item.isError
                  ? 'bg-rose-950/30 text-rose-300 border border-rose-900/40'
                  : 'bg-[#121917]/90 text-zinc-200 border border-emerald-950/50'
              }`}
            >
              {item.output}
            </pre>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Kiro agent auditing route footprint...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Terminal Input Line */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-[#131b19] border-t border-emerald-500/20">
        <span className="text-emerald-400 font-bold pl-1 text-sm">➜</span>
        <span className="text-cyan-400 text-xs font-semibold">ecotrace</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type an ecotrace command (e.g. 'ecotrace audit', 'ecotrace calc -d 850 -w 4 -c air')..."
          className="flex-1 bg-transparent border-none text-emerald-300 placeholder-zinc-600 text-xs focus:outline-none focus:ring-0 font-mono"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-black text-xs font-bold rounded transition"
        >
          <span>Run</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
