# 3-minute demo video script

Goal: show a real problem, the product working end to end on a live URL, and how Kiro was used. Everything below is real; nothing is mocked.

## Before recording (5 minutes)

1. **Wake the Render instance**: open https://ecotrace-cli.onrender.com about 2 minutes before you record, so the cold-start screen is not in the video.
2. In the Render dashboard, set `SHOPIFY_WEBHOOK_SECRET` and `WOOCOMMERCE_WEBHOOK_SECRET` (any long random strings) and wait for the redeploy.
3. In your terminal, export the same values (PowerShell):

   ```powershell
   $env:SHOPIFY_WEBHOOK_SECRET="<same as Render>"
   $env:WOOCOMMERCE_WEBHOOK_SECRET="<same as Render>"
   $env:ECOTRACE_URL="https://ecotrace-cli.onrender.com"
   ```

   Do not show these values on screen. Set them before you start recording.
4. Dashboard: click reset on the Ledger tab so the demo data is clean. Arrange the terminal on the left and the browser (Carbon Ledger tab) on the right.
5. Terminal font size ≥ 18 pt.
6. **On Windows use Windows Terminal** (or run `chcp 65001` first). The old console window uses a legacy code page and shows the report's box-drawing characters as garbage like `Γò░ΓöÇ`.
7. Do a full dry run once: the numbers in the script (15 orders, 43.54 kg CO2e, 7 air orders ≈ 94 % of emissions, 17/17 checks) are what the current code produces.

## Script

| Time | On screen | Say (roughly) |
|---|---|---|
| 0:00–0:20 | README title, then the dashboard | "Online stores ship thousands of parcels and have no idea what each one emits. Carrier dashboards don't tell you, so sustainability reports use a single average. EcoTrace gives every order a number, says how reliable it is, and shows the shipments where changing service saves the most." |
| 0:20–0:50 | Terminal: `npm run cli -- audit examples/orders.csv` | "This is App 1, the CLI, on a real-shaped order export. Total footprint, and the top emitters. Air freight is 7 of 15 orders but over 90 % of the emissions. Notice the warning: one order's city wasn't recognised, so the tool says its distance is an estimate instead of pretending." |
| 0:50–1:05 | `npm run cli -- audit examples/orders.csv --format csv > report.csv`, open in Excel briefly | "Same data as a spreadsheet for a Scope 3 report, with the estimate flags as columns." |
| 1:05–1:45 | `npm run cli -- send-webhook --to London --country GB -w 3 -c "DHL Express Air"`, then within 5 s the order appears on the dashboard (right) | "App 2 is a webhook receiver on a public URL. The CLI builds a real Shopify order and signs it exactly the way Shopify does. Here it lands on the live dashboard. Click it: the formula, and the only realistic alternative for London is ocean freight. For a domestic order it would never suggest a ship." Click the order to open the details. |
| 1:45–2:20 | `npm run cli -- verify` (17 PASS lines scroll) | "Because this is a public URL from a public repo, the CLI can verify the deployment live: unsigned webhooks rejected, a tampered body rejected, retries de-duplicated, invalid input rejected, and the server's math matches the local engine. 17 out of 17." |
| 2:20–2:50 | Dashboard → Kiro tab (spec, steering, hooks); then the editor with `.kiro/` open | "Both apps sit on one shared foundation. That's the Skeleton Crew template. Kiro built it from these specs. The requirement IDs here are the names of the property-based tests. Steering keeps it from overclaiming and enforces the security rules. Hooks run the tests on every save and block secrets from ever being written into the repo." |
| 2:50–3:00 | Architecture tab or README | "EcoTrace: open source, signed webhooks, honest numbers. Link in the description." |

## If something goes wrong while recording

- **Render shows "SERVICE WAKING UP"**: wait about 60 s and record again. `verify` and `send-webhook` wait up to 90 s and print a note while they wait.
- **`send-webhook` says HTTP 503**: the secrets are not set on Render yet, or the deploy is still running.
- **HTTP 401**: the secret in your terminal differs from the one on Render.

## Upload checklist

- Under 3:00, uploaded to YouTube as **Public**.
- No copyrighted music. No third-party logos beyond what appears naturally in the Shopify/WooCommerce names.
- Put the video link, the repo URL and the live URL in the Devpost form. Paste the cold-start note from the README into the testing instructions.
