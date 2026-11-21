import React from 'react';
import { Box, FolderTree, Layers, Terminal } from 'lucide-react';

const PILLARS = [
  {
    title: '/foundation',
    tag: 'The skeleton',
    icon: Box,
    color: 'cyan',
    text: 'Everything both apps share. Contains no app code, so it can be reused for new apps.',
    items: ['engine/: E = d × w × f, factors, validation', 'adapters/: Shopify, WooCommerce', 'importers/: CSV + JSON exports'],
  },
  {
    title: 'apps/ecotrace-cli',
    tag: 'App 1',
    icon: Terminal,
    color: 'emerald',
    text: 'Terminal tool for audits of order exports, CI carbon gates, and live webhook tests.',
    items: ['audit orders.csv --format csv', 'audit --fail-above 50 (exit 2)', 'send-webhook / verify <url>'],
  },
  {
    title: 'apps/ecotrace-web',
    tag: 'App 2',
    icon: Layers,
    color: 'purple',
    text: 'Signed webhook receiver plus this live dashboard.',
    items: ['POST /api/webhooks/shopify (HMAC)', 'POST /api/webhooks/woocommerce (HMAC)', 'Ledger, sandbox, browser terminal'],
  },
  {
    title: '/.kiro',
    tag: 'Built with Kiro',
    icon: FolderTree,
    color: 'emerald',
    text: 'Specs, steering and hooks that guided Kiro while building the project.',
    items: ['specs/: requirements, design, tasks', 'steering/: project rules for Kiro', 'hooks/: automated checks'],
  },
] as const;

const BORDER: Record<string, string> = {
  cyan: 'border-cyan-500/30 text-cyan-400',
  emerald: 'border-emerald-500/30 text-emerald-400',
  purple: 'border-purple-500/30 text-purple-400',
};

export const RepoArchitectureView: React.FC = () => (
  <div className="space-y-6 font-mono">
    <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121917] via-[#0f1715] to-[#141d1a] border border-emerald-500/30 shadow-xl">
      <h2 className="text-base font-bold text-white">One foundation, two applications</h2>
      <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
        Both apps import only from <code>/foundation</code>. A third app (a Slack bot, a checkout badge, a Lambda) would do the same.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {PILLARS.map(({ title, tag, icon: Icon, color, text, items }) => (
        <div key={title} className={`p-4 rounded-xl bg-[#0f1413] border space-y-3 ${BORDER[color].split(' ')[0]}`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${BORDER[color].split(' ')[1]}`}>{tag}</span>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${BORDER[color].split(' ')[1]}`} />
            {title}
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans">{text}</p>
          <ul className="text-[10px] text-zinc-300 space-y-1 bg-[#0a0d0c] p-2.5 rounded border border-zinc-800">
            {items.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
      <div className="px-4 py-3 bg-[#141b19] border-b border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-emerald-400" />
        Repository layout
      </div>
      <pre className="p-4 bg-[#0a0d0c] text-emerald-300 text-xs overflow-x-auto leading-relaxed select-text">
{`ecotrace-cli/
├── .kiro/
│   ├── specs/                 requirements → design → tasks
│   ├── steering/              rules Kiro follows in this repo
│   └── hooks/                 automated checks during development
├── foundation/                shared skeleton (no app code)
│   ├── engine/                calculator, factors, distance, validation
│   ├── adapters/              Shopify + WooCommerce → UnifiedOrder
│   ├── importers/             CSV / JSON order exports
│   ├── config/                warehouse origin from env vars
│   ├── kiro/                  batch audit runner + report
│   └── types/
├── apps/
│   ├── ecotrace-cli/          App 1: terminal tool
│   └── ecotrace-web/          App 2: webhook receiver + dashboard
├── tests/                     unit + property-based tests
├── examples/                  sample CSV / JSON to try the CLI
└── docs/                      live-data guide, demo script`}
      </pre>
    </div>
  </div>
);
