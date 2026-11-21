# Running EcoTrace on live data

Three ways to use real store data, from quickest to fully live. None of them need an account with EcoTrace or an API key.

| | Path | Time | What you get |
|---|---|---|---|
| A | Export orders → CLI | 5 min | One-off report of past orders, CSV for spreadsheets |
| B | Your own server + store webhooks | 20 min | Every new order audited automatically, live dashboard |
| C | CI carbon budget | 5 min | A pipeline step that fails if a batch exceeds a budget |

Before any of them, set your warehouse location. Store webhooks and exports do not say where a parcel ships from.

```bash
cp .env.example .env
# edit .env:
ECOTRACE_ORIGIN_CITY=Memphis
ECOTRACE_ORIGIN_COUNTRY=US
ECOTRACE_ORIGIN_LAT=35.0421       # exact coordinates give the best distances
ECOTRACE_ORIGIN_LNG=-89.9767
```

---

## A. Audit an order export with the CLI

### Shopify

**Option 1: Admin API (JSON, includes weights).**

1. Shopify admin → *Settings → Apps and sales channels → Develop apps → Create an app*.
2. *Configure Admin API scopes* → enable `read_orders` only → *Install app* → copy the Admin API access token.
3. Download orders (PowerShell shown; use `curl -H` the same way on macOS/Linux):

   ```powershell
   $env:SHOPIFY_TOKEN = "<paste token>"     # keep it out of files and shell scripts
   Invoke-RestMethod -Headers @{ "X-Shopify-Access-Token" = $env:SHOPIFY_TOKEN } `
     "https://<your-store>.myshopify.com/admin/api/2024-10/orders.json?status=any&limit=250" |
     ConvertTo-Json -Depth 20 | Out-File orders.json -Encoding utf8
   ```

4. Audit:

   ```bash
   npm run cli -- audit orders.json
   ```

**Option 2: Admin CSV export.** *Orders → Export*. The Shopify CSV has no per-order weight column, so add a `weight_kg` column (or use option 1), then rename the shipping city/country columns to `city` / `country`. See [examples/README.md](../examples/README.md) for accepted headers.

### WooCommerce

1. *WooCommerce → Settings → Advanced → REST API → Add key* with **Read** permission.
2. Download:

   ```bash
   curl -u "$WC_KEY:$WC_SECRET" "https://<your-shop>/wp-json/wc/v3/orders?per_page=100" -o orders.json
   ```

3. `npm run cli -- audit orders.json`

WooCommerce line items only carry weight if your products have a weight set. Orders without weights are still audited, flagged as **estimated**.

### Any other platform / spreadsheet

Make a CSV with at least a destination and a weight:

```csv
order_id,city,country,weight_kg,carrier
1001,Chicago,US,2.1,FedEx Ground
1002,London,GB,1.4,DHL Express Air
```

### Outputs

```bash
npm run cli -- audit orders.json                          # readable report: totals, top emitters
npm run cli -- audit orders.json --format csv > report.csv # one row per order for Excel / Sheets
npm run cli -- audit orders.json --format json > report.json
```

The CSV includes `weight_estimated` and `distance_precision` columns. Filter them before putting numbers in a report.

---

## B. Live webhooks into your own dashboard

### 1. Deploy the web app

Use the Render blueprint (`render.yaml`) or any Node host. For real data set these environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `ECOTRACE_DEMO_MODE` | `false` |
| `ECOTRACE_READ_TOKEN` | a long random string (dashboard login) |
| `ECOTRACE_ADMIN_TOKEN` | a different long random string |
| `ECOTRACE_LEDGER_FILE` | a path on a **persistent disk** (Render free instances lose files on restart) |
| `ECOTRACE_ORIGIN_*` | your warehouse |

Generate tokens with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Connect Shopify

1. *Settings → Notifications → Webhooks → Create webhook*.
2. Event **Order creation**, format **JSON**, URL `https://<your-app>/api/webhooks/shopify`.
3. Copy the signing secret shown on that page ("Your webhooks will be signed with …") into `SHOPIFY_WEBHOOK_SECRET` on the server and redeploy.
4. Click **Send test notification**. The dashboard's *Carbon Ledger* updates within 5 seconds.

### 3. Connect WooCommerce

1. *WooCommerce → Settings → Advanced → Webhooks → Add webhook*.
2. Topic **Order created**, Delivery URL `https://<your-app>/api/webhooks/woocommerce`, Secret: a long random string.
3. Put the same secret in `WOOCOMMERCE_WEBHOOK_SECRET` on the server.

### 4. Check the deployment before going live

From your machine, with the same secrets exported:

```bash
export SHOPIFY_WEBHOOK_SECRET=...        # PowerShell: $env:SHOPIFY_WEBHOOK_SECRET="..."
export WOOCOMMERCE_WEBHOOK_SECRET=...
npm run cli -- verify https://<your-app>
```

`verify` checks 17 things, including that unsigned and tampered webhooks are rejected, signed ones are accepted, retries are de-duplicated and the server's math matches the local engine. It exits non-zero if anything fails.

Send a realistic signed order whenever you like:

```bash
npm run cli -- send-webhook -u https://<your-app> --to London --country GB -w 3 -c "DHL Express Air"
```

> `verify` and `send-webhook` add test orders to the ledger. On a real ledger, run them before connecting the store, or reset afterwards with the admin token:
> `curl -X POST -H "Authorization: Bearer $ECOTRACE_ADMIN_TOKEN" https://<your-app>/api/audit/reset`

---

## C. Carbon budget in CI

```yaml
# .github/workflows/carbon-budget.yml (in your store's ops repo)
- run: npx tsx apps/ecotrace-cli/bin/ecotrace.ts audit exports/last-week.csv --fail-above 500
```

Exit codes: `0` within budget, `2` over budget, `1` input error.

---

## Accuracy notes

- **Distance** is great-circle × a routing factor (air 1.10, road/rail 1.20, sea 1.35). Cities in the built-in table use the city centre; unknown cities fall back to the country centre and are flagged `country_centroid`. Send coordinates (Shopify includes them) for best results.
- **Weight** comes from the platform. If products have no weight, EcoTrace assumes 0.45–0.5 kg per item and flags the order.
- **Mode** is inferred from the shipping service name ("Next Day Air" → air, "Ground" → truck). Check `npm run cli -- calculate -c "<your service name>"` for any service you offer.
- **Factors** are representative per-mode values for comparing options, not a certified methodology. For formal reporting, use the factors your auditor requires.
