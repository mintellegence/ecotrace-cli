# 🌿 EcoTrace-CLI

> **Kiroween (Skeleton Crew Category)**  
> Autonomous Shipping Carbon Emission Auditor and E-Commerce Webhook Normalizer directly from the terminal.

![EcoTrace-CLI Logo](./src/assets/logo.svg)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-emerald.svg)](./LICENSE)
[![Kiroween: Skeleton Crew](https://img.shields.io/badge/Kiroween-Skeleton_Crew-black.svg?logo=ghost)]()

**🌐 Live Demo on Render:** `https://ecotrace-cli.onrender.com`

---

## ⚡ 1-Click Deployment on Render (`onrender.com`)

You can host EcoTrace-CLI live on Render with automatic HTTPS and continuous deployment:

### Option 1: Automatic Blueprint (Recommended)
1. Fork or push this repository to your **Public GitHub** account.
2. Go to **[dashboard.render.com](https://dashboard.render.com/)** and click **New + > Blueprint**.
3. Select your repository `ecotrace-cli`. Render will automatically detect `render.yaml` and configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/audit/summary`
4. Click **Apply**. Your live demo will be live at `https://ecotrace-cli.onrender.com`.

### Option 2: Standard Web Service
1. In Render, select **New + > Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:** `NODE_ENV=production`, `PORT=3000`
4. Deploy! Render will build the Vite assets, bundle `server.js`, and host the service live.

---

## 🏛 Repository Architecture (Official Dual-App Structure)

This repository features a clean monorepo architecture featuring **two distinct application implementations** built from a unified shared foundation, alongside the required `/.kiro` configuration directory:

```text
ecotrace-cli/
├── .kiro/                       # Required Kiro Agent Specification Directory
│   ├── agent.json               # Autonomous agent manifest & capabilities
│   ├── steering/
│   │   └── eco-steering.md      # Steering directives & GLEC guidelines
│   └── hooks/
│       └── audit-hook.json      # Post-order carbon audit automation hook
├── foundation/                  # Shared Core Foundation
│   ├── engine/                  # Calculation engine (E = d * w * f) & GLEC factors
│   ├── adapters/                # E-commerce normalizers (Shopify & WooCommerce)
│   ├── types/                   # Unified schemas (UnifiedOrder, EmissionBreakdown)
│   └── index.ts                 # Unified foundation export
├── apps/
│   ├── ecotrace-cli/            # [Implementation 1] Standalone CLI Terminal Application
│   │   ├── bin/ecotrace.ts      # Commander.js executable
│   │   ├── src/commands.ts      # Command handlers (init, calculate, audit, kiro)
│   │   └── package.json
│   └── ecotrace-service/        # [Implementation 2] Webhook Listener & Server Daemon
│       ├── src/server.ts        # Express webhook ingestion daemon
│       └── package.json
├── server.ts                    # Full-Stack Webhook Server & Interactive Workbench
└── package.json
```

---

## 🚀 Quickstart & Commands

### Application 1: Command-Line Interface (`apps/ecotrace-cli`)
```bash
# Run single shipment emission calculation (E = d * w * f)
npm run cli -- calculate -d 1200 -w 4.2 -c "FedEx Express 2-Day Air"

# Ingest store manifests and produce ASCII audit scorecard
npm run cli -- audit

# Execute Kiro autonomous agent background pass
npm run cli -- kiro run

# Initialize store configuration & register Kiro hooks
npm run cli -- init
```

### Application 2: Webhook Daemon (`apps/ecotrace-service`)
```bash
# Start the lightweight webhook receiver daemon
npm run service
```
Endpoints:
- `POST /api/webhooks/shopify`
- `POST /api/webhooks/woocommerce`

---

## 🌿 Scientific Carbon Calculation Formula
$$E = d \times w \times f$$
- $d$: Shipping distance in kilometers calculated via Haversine distance with transport detour factors (1.10x for air corridors, 1.20x for roads).
- $w$: Package weight in tonnes ($w_{\text{kg}} / 1000$).
- $f$: Standardized carrier emission factors in kg $\text{CO}_2\text{e}$ per tonne-km (GLEC V3.0 & DEFRA guidelines).

---

## 🔒 License
Apache-2.0 © EcoTrace Community & Kiroween 2026.
