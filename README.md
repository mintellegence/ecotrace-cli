# EcoTrace

Shipping carbon auditor for e-commerce stores. It turns Shopify and WooCommerce orders (live webhooks, or CSV/JSON exports) into per-order CO2e figures using **E = distance × weight × emission factor**, grades them A–F, and shows which shipments could switch to a lower-carbon mode.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](./LICENSE)
[![Kiroween 2026: Skeleton Crew](https://img.shields.io/badge/Kiroween_2026-Skeleton_Crew-black.svg)](https://kiroween.devpost.com/)

**Live demo:** https://ecotrace-cli.onrender.com · [CI](https://github.com/mintellegence/ecotrace-cli/actions) · [How Kiro was used](./docs/KIRO_WRITEUP.md)

<!-- Screenshot: save a capture of the Overview tab as docs/screenshot.png, then uncomment the next line.
![EcoTrace Overview: footprint, avoidable emissions and the order to change first](./docs/screenshot.png)
-->

### Try it in 60 seconds

| You are… | Do this |
|---|---|
| **Just looking** | Open the [live demo](https://ecotrace-cli.onrender.com). The **Overview** shows the footprint, how much is avoidable and the order to change first. Click any order in **Carbon Ledger** for its formula and realistic alternatives. |
| **A store owner** | `git clone … && npm install && npm run cli -- audit your-orders.csv`. You get a report of your top emitters and a CSV for your spreadsheet ([accepted columns](./examples/README.md)). |
| **A developer** | `npm run cli -- send-webhook` sends a correctly signed Shopify order to a running server; `npm run cli -- verify <url>` runs 17 live security and correctness checks. |

**Tested against Shopify itself:** a webhook sent by Shopify from a development store (`orders/create`, HMAC-signed by Shopify) was received, normalized and audited by the live demo. Because Shopify's sample order has no product weights and a fictional city, EcoTrace flagged both as estimates instead of presenting a guess as fact.

---

## For judges: please read first

> **The live demo may take 30–60 seconds to load on the first visit.**
>
> It runs on Render's free plan, which puts the service to sleep after ~15 minutes without traffic. The first request shows a Render screen saying **"SERVICE WAKING UP … APPLICATION LOADING"**. That is Render starting the container, not an error. Keep the tab open and the dashboard appears on its own; after that every page responds normally.
>
> If it still shows that screen after ~90 seconds, refresh once.

- **No login is needed.** The public demo runs in demo mode with sample orders, so every tab works without credentials. Use the reset button on the Ledger tab to restore the sample data at any time.
- **Fastest path through the demo (about 2 minutes):**
  1. **CLI Terminal** tab: run `calculate -d 1200 -w 4.2 -c "UPS Next Day Air"`, then `audit`.
  2. **Webhook Normalizer** tab: send the sample Shopify or WooCommerce payload and see it normalized and graded.
  3. **Carbon Ledger** tab: click any order for the formula, data-quality flags and greener alternatives.
- **To test locally instead**, see [Run it locally](#run-it-locally). It needs Node 20+ and no accounts or API keys.
- **About the name:** this project is not published to npm. An unrelated package called `ecotrace-cli` already exists on npm, so do **not** `npm install ecotrace-cli`; clone this repo instead.
- **Skeleton Crew structure:** one shared foundation, two separate applications. See [Architecture](#architecture).
- **How Kiro was used:** see [`.kiro/`](./.kiro) (specs, steering, hooks) and [Built with Kiro](#built-with-kiro).

---

## What problem it solves

Shipping is often the largest Scope 3 emission source for small online stores, but stores have no per-order visibility. Carrier dashboards rarely report CO2e, and sustainability reports end up using a single average. EcoTrace gives each order a number, says how confident that number is, and points to the orders where changing the shipping mode would save the most.

## Architecture

```text
ecotrace-cli/
├── .kiro/                     Kiro specs, steering and hooks used to build this project
├── foundation/                THE SKELETON: shared by both apps, no app code in here
│   ├── engine/                E = d × w × f, emission factors, distance, input validation
│   ├── adapters/              Shopify + WooCommerce normalizers -> UnifiedOrder
│   ├── importers/             CSV / JSON order-export importer
│   ├── config/                Warehouse origin from environment variables
│   ├── kiro/                  Batch audit runner + report formatter
│   └── types/                 Shared schemas
├── apps/
│   ├── ecotrace-cli/          APP 1: terminal tool (audit exports, CI carbon gate)
│   └── ecotrace-web/          APP 2: signed webhook receiver + live dashboard
├── tests/                     Unit, property-based and HTTP security tests
├── examples/                  Sample CSV and Shopify JSON to try the CLI
├── docs/                      Live-data guide, demo video script, Kiro write-up draft
└── render.yaml                Render deployment blueprint
```

Both apps import only from `foundation/`. To build a third app (for example a Slack bot or a checkout widget), import `foundation/index.ts`.

## Run it locally

Requirements: Node.js 20 or newer. No API keys.

```bash
git clone https://github.com/mintellegence/ecotrace-cli.git
cd ecotrace-cli
npm install
cp .env.example .env     # optional: set your warehouse location
```

### App 1: CLI

```bash
# One shipment
npm run cli -- calculate -d 1200 -w 4.2 -c "UPS Next Day Air"

# Audit your own data (CSV, or JSON exported from Shopify/WooCommerce)
npm run cli -- audit ./examples/orders.csv
npm run cli -- audit ./examples/orders.csv --format csv > report.csv
npm run cli -- audit ./examples/orders.csv --format json

# Fail a CI job if a batch exceeds a carbon budget (exit code 2)
npm run cli -- audit ./examples/orders.csv --fail-above 50
```

### Live tests from the CLI

The CLI can drive a running server (local or the Render demo) end to end:

```bash
# Secrets come from env vars only (never flags). Use the same values as the server.
export SHOPIFY_WEBHOOK_SECRET=...          # PowerShell: $env:SHOPIFY_WEBHOOK_SECRET="..."
export WOOCOMMERCE_WEBHOOK_SECRET=...

# Send a realistic, correctly signed Shopify order; it appears on the dashboard within 5 s
npm run cli -- send-webhook -u http://127.0.0.1:3000 --to London --country GB -w 3 -c "DHL Express Air"

# 17 live checks: signatures enforced, tampering detected, retries de-duplicated,
# input validated, security headers present, server math == local engine
npm run cli -- verify http://127.0.0.1:3000
```

### App 2: Dashboard + webhook receiver

```bash
npm run dev              # http://127.0.0.1:3000; with the .env.example defaults it runs in demo mode
```

To accept local test webhooks, set `SHOPIFY_WEBHOOK_SECRET` / `WOOCOMMERCE_WEBHOOK_SECRET` in `.env` (any value) and export the same values in the terminal you run the CLI from.

Production build:

```bash
npm run build
npm start                # set NODE_ENV=production
```

### Checks

```bash
npm run lint             # TypeScript type check
npm test                 # unit + property-based tests
```

## Using live data

See **[docs/LIVE_DATA.md](./docs/LIVE_DATA.md)** for step-by-step instructions on:

- exporting orders from Shopify or WooCommerce and auditing them with the CLI,
- connecting real store webhooks to the dashboard with signature verification,
- setting your warehouse coordinates so distances are accurate.

## How the numbers are calculated

**E = d × (w / 1000) × f**

- **d**: great-circle distance between origin and destination, multiplied by a routing factor (1.10 air, 1.20 road/rail, 1.35 sea).
- **w**: shipment weight in kg.
- **f**: emission factor in kg CO2e per tonne-km for the inferred transport mode.

Every result includes a **data-quality** block. If the platform sent no product weights, or a destination could only be placed at country level, the result says so instead of presenting a guess as exact.

The factors are representative values for comparing modes. They are not a certified carbon accounting methodology; for formal reporting, replace them with the factors your auditor requires.

## Built with Kiro

| `/.kiro` | Contents |
|---|---|
| `specs/carbon-engine`, `specs/signed-webhooks` | EARS requirements → design → tasks. Requirement IDs are the property-test names. |
| `steering/` | `product`, `tech`, `structure` (always) and `emission-engine`, `security` (fileMatch) |
| `hooks/` | tests on save, type check on save, security-review prompt, pre-write secret guard |
| `agents/carbon-auditor.md` | read-only agent that audits an export via the CLI and explains it |

The dashboard's **Kiro** tab shows these files live. Open the `ecotrace-cli` folder itself as your Kiro workspace so the hooks and steering apply. Details: [docs/KIRO_WRITEUP.md](./docs/KIRO_WRITEUP.md).

## Security

Webhooks are verified with HMAC signatures, the dashboard ledger can be token-protected, and the server never runs shell commands. See [SECURITY.md](./SECURITY.md) to report a vulnerability.

## License

Apache-2.0. See [LICENSE](./LICENSE).
