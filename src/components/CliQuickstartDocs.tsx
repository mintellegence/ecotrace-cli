import React, { useState } from 'react';
import { Terminal, Copy, Check, BookOpen, Code2, ShieldCheck, Zap } from 'lucide-react';

export const CliQuickstartDocs: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const INSTALL_SNIPPET = `# Clone or install globally
git clone https://github.com/ecotrace/ecotrace-cli.git
cd ecotrace-cli
npm install

# Link executable to your system path
npm link

# Verify installation
ecotrace --version`;

  const USAGE_SNIPPET = `# 1. Initialize store configuration and Kiro agent hooks
ecotrace init

# 2. Rapid calculation of a parcel footprint (E = d * w * f)
ecotrace calculate --distance 1250 --weight 4.5 --carrier "DHL Express Air"

# 3. Audit entire store manifest batch
ecotrace audit ./manifests/orders.json

# 4. Run autonomous background Kiro agent pass
ecotrace kiro run

# 5. Spin up lightweight webhook listener on port 3000
ecotrace listen`;

  const WEBHOOK_SHOPIFY = `# In Shopify Admin: Settings > Notifications > Webhooks
# Create webhook:
# Event: Order creation (orders/create)
# Format: JSON
# URL: https://your-server.com/api/webhooks/shopify`;

  const WEBHOOK_WOOCOMMERCE = `# In WooCommerce Admin: Settings > Advanced > Webhooks
# Add webhook:
# Topic: Order created
# Delivery URL: https://your-server.com/api/webhooks/woocommerce
# Secret: <your_secret>`;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-4 rounded-xl bg-[#121816] border border-emerald-500/20">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          EcoTrace-CLI Developer Documentation & Quickstart
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Open-source, modular automation tooling built for the Kiroween Skeleton Crew hackathon.
        </p>
      </div>

      {/* Installation Block */}
      <div className="rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-[#141b19] border-b border-zinc-800">
          <span className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            1. Installation & Linking
          </span>
          <button
            onClick={() => copyCode(INSTALL_SNIPPET, 'install')}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition"
          >
            {copiedSection === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'install' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-4 bg-[#0a0d0c] text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
          {INSTALL_SNIPPET}
        </pre>
      </div>

      {/* CLI Commands Reference */}
      <div className="rounded-xl bg-[#0f1413] border border-zinc-800 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-[#141b19] border-b border-zinc-800">
          <span className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            2. Core CLI Commands
          </span>
          <button
            onClick={() => copyCode(USAGE_SNIPPET, 'usage')}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition"
          >
            {copiedSection === 'usage' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'usage' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-4 bg-[#0a0d0c] text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed">
          {USAGE_SNIPPET}
        </pre>
      </div>

      {/* Webhook Connection Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shopify */}
        <div className="p-4 rounded-xl bg-[#0f1413] border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              Shopify Webhook Setup
            </span>
            <button
              onClick={() => copyCode(WEBHOOK_SHOPIFY, 'shopify')}
              className="text-zinc-400 hover:text-emerald-400 text-xs"
            >
              {copiedSection === 'shopify' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">
            Automatically intercepts <code className="text-emerald-400 font-mono">orders/create</code> payloads, converts grams to kilograms, maps line items, and audits transport footprint.
          </p>
          <pre className="p-2.5 rounded bg-[#0a0d0c] border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto">
            {WEBHOOK_SHOPIFY}
          </pre>
        </div>

        {/* WooCommerce */}
        <div className="p-4 rounded-xl bg-[#0f1413] border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              WooCommerce Webhook Setup
            </span>
            <button
              onClick={() => copyCode(WEBHOOK_WOOCOMMERCE, 'wc')}
              className="text-zinc-400 hover:text-cyan-400 text-xs"
            >
              {copiedSection === 'wc' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">
            Captures <code className="text-cyan-400 font-mono">order.created</code> events from WooCommerce REST API v3, extracts weight metadata, and standardizes carrier methods.
          </p>
          <pre className="p-2.5 rounded bg-[#0a0d0c] border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto">
            {WEBHOOK_WOOCOMMERCE}
          </pre>
        </div>
      </div>

      {/* Render Live Demo Deployment Guide */}
      <div className="rounded-xl bg-[#0f1413] border border-emerald-500/30 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-[#141b19] border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-white">
              3. Live Demo Deployment on Render (onrender.com)
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
            render.yaml Included ✓
          </span>
        </div>
        <div className="p-4 space-y-3 font-mono text-xs">
          <p className="text-zinc-300 font-sans text-xs">
            EcoTrace-CLI includes a production-ready <code>render.yaml</code> blueprint. Once your public GitHub repository is pushed, deploy live to <strong>onrender.com</strong> in 1 click:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-zinc-300">
            <div className="p-2.5 rounded-lg bg-[#0a0d0c] border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">1. CONNECT REPO</span>
              <span className="text-white font-bold text-[11px] block mt-0.5">dashboard.render.com</span>
              <p className="text-[10px] text-zinc-400 font-sans mt-1">Select New + &gt; Blueprint and connect your GitHub repo.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0a0d0c] border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">2. AUTO BUILD</span>
              <span className="text-emerald-400 font-bold text-[11px] block mt-0.5">npm run build</span>
              <p className="text-[10px] text-zinc-400 font-sans mt-1">Builds Vite static assets and bundles <code>server.js</code>.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0a0d0c] border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">3. LIVE URL</span>
              <span className="text-cyan-400 font-bold text-[11px] block mt-0.5">*.onrender.com</span>
              <p className="text-[10px] text-zinc-400 font-sans mt-1">Live webhook listeners &amp; dashboard with SSL.</p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#070a09] border border-zinc-800/80 text-[11px] text-zinc-400">
            <strong>Live Demo Target:</strong> <code className="text-emerald-400">https://ecotrace-cli.onrender.com</code>
          </div>
        </div>
      </div>
    </div>
  );
};
