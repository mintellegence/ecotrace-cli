import React, { useState } from 'react';
import { FolderTree, GitBranch, Terminal, Layers, Box, CheckCircle2, Copy, Check, Upload, ArrowRight, ShieldCheck } from 'lucide-react';
import { GitSyncModal } from './GitSyncModal.tsx';

export const RepoArchitectureView: React.FC = () => {
  const [gitModalOpen, setGitModalOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const copyPath = (pathText: string) => {
    navigator.clipboard.writeText(pathText);
    setCopiedPath(pathText);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#121917] via-[#0f1715] to-[#141d1a] border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Kiroween Official Monorepo Architecture</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Rules Verified ✓
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
            Features a clean folder structure containing the <strong>two distinct application implementations</strong> built from your foundation, alongside the required <strong>/.kiro</strong> configuration directory.
          </p>
        </div>

        <button
          onClick={() => setGitModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition shrink-0"
        >
          <GitBranch className="w-4 h-4" />
          <span>Push to My Git Account</span>
        </button>
      </div>

      {/* 3 Pillar Cards: App 1, App 2, Foundation, .kiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: .kiro Directory */}
        <div className="p-4 rounded-xl bg-[#0f1413] border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Required Spec</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <FolderTree className="w-4 h-4 text-emerald-400" />
            /.kiro
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans">
            Autonomous agent specifications, background hooks, and steering directives.
          </p>
          <ul className="text-[10px] text-zinc-300 space-y-1 bg-[#0a0d0c] p-2.5 rounded border border-zinc-800">
            <li>• <code>agent.json</code> (Skeleton Crew manifest)</li>
            <li>• <code>steering/eco-steering.md</code></li>
            <li>• <code>hooks/audit-hook.json</code></li>
          </ul>
        </div>

        {/* Card 2: Shared Foundation */}
        <div className="p-4 rounded-xl bg-[#0f1413] border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Core Engine</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Box className="w-4 h-4 text-cyan-400" />
            /foundation
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans">
            Shared GLEC calculation engine, Haversine routing, and unified adapters.
          </p>
          <ul className="text-[10px] text-zinc-300 space-y-1 bg-[#0a0d0c] p-2.5 rounded border border-zinc-800">
            <li>• <code>engine/calculator.ts</code> (E = d * w * f)</li>
            <li>• <code>adapters/shopify.ts</code></li>
            <li>• <code>adapters/woocommerce.ts</code></li>
          </ul>
        </div>

        {/* Card 3: App Implementation 1 */}
        <div className="p-4 rounded-xl bg-[#0f1413] border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Implementation 1</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-emerald-400" />
            apps/ecotrace-cli
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans">
            Standalone terminal application for audits, single parcel calculations, and Kiro scans.
          </p>
          <ul className="text-[10px] text-zinc-300 space-y-1 bg-[#0a0d0c] p-2.5 rounded border border-zinc-800">
            <li>• <code>bin/ecotrace.ts</code> (Executable)</li>
            <li>• <code>package.json</code> ("bin": "ecotrace")</li>
            <li>• <code>README.md</code></li>
          </ul>
        </div>

        {/* Card 4: App Implementation 2 */}
        <div className="p-4 rounded-xl bg-[#0f1413] border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Implementation 2</span>
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            apps/ecotrace-service
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans">
            Lightweight HTTP Webhook Listener Daemon that captures store order events.
          </p>
          <ul className="text-[10px] text-zinc-300 space-y-1 bg-[#0a0d0c] p-2.5 rounded border border-zinc-800">
            <li>• <code>src/server.ts</code> (Express daemon)</li>
            <li>• <code>POST /api/webhooks/shopify</code></li>
            <li>• <code>POST /api/webhooks/woocommerce</code></li>
          </ul>
        </div>
      </div>

      {/* Directory Hierarchy Tree */}
      <div className="rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-[#141b19] border-b border-zinc-800">
          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-400" />
            Clean Repository File Tree
          </span>
          <span className="text-[10px] text-zinc-500">
            Author: Sharif Hussain &lt;sm.sharifhussain@gmail.com&gt;
          </span>
        </div>
        <pre className="p-4 bg-[#0a0d0c] text-emerald-300 text-xs overflow-x-auto leading-relaxed select-text">
{`ecotrace-cli/
├── .kiro/                       # Required Kiro Configuration Directory
│   ├── agent.json               # Autonomous agent manifest & capabilities
│   ├── steering/
│   │   └── eco-steering.md      # Steering directives & GLEC guidelines
│   └── hooks/
│       └── audit-hook.json      # Post-order carbon audit automation hook
├── foundation/                  # Shared Foundation Engine
│   ├── engine/
│   │   ├── calculator.ts        # Formula engine (E = d * w * f)
│   │   ├── emissionFactors.ts   # GLEC V3.0 carrier emission factors
│   │   └── geocoding.ts         # Haversine distance & coordinate bounding
│   ├── adapters/
│   │   ├── base.ts              # PlatformAdapter interface
│   │   ├── shopify.ts           # Shopify orders normalizer
│   │   ├── woocommerce.ts       # WooCommerce REST v3 normalizer
│   │   └── index.ts             # AdapterRegistry with auto-detection
│   ├── types/
│   │   └── index.ts             # UnifiedOrder & audit schemas
│   ├── package.json
│   └── README.md
├── apps/
│   ├── ecotrace-cli/            # [Application Implementation 1: CLI Tool]
│   │   ├── bin/
│   │   │   ├── ecotrace.ts      # Command line executable
│   │   │   └── ecotrace.js      # Unix binary wrapper
│   │   ├── package.json         # "bin": { "ecotrace": "./bin/ecotrace.js" }
│   │   └── README.md
│   └── ecotrace-service/        # [Application Implementation 2: Webhook Daemon]
│       ├── src/
│       │   └── server.ts        # Express webhook listener daemon
│       ├── package.json
│       └── README.md
├── server.ts                    # Full-Stack Webhook Server & Interactive Workbench
├── README.md                    # Root project documentation
└── package.json                 # Monorepo workspace scripts (npm run cli, npm run service)`}
        </pre>
      </div>

      <GitSyncModal isOpen={gitModalOpen} onClose={() => setGitModalOpen(false)} />
    </div>
  );
};
