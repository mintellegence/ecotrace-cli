# Example data

| File | What it is |
|---|---|
| `orders.csv` | 15 shipments from a Memphis warehouse, in the simple CSV format the CLI accepts. Row 1015 (Springfield) is not a known city, so its distance is flagged as low precision. |
| `shopify-orders.json` | Two orders in the shape returned by the Shopify Admin REST API (`GET /admin/api/2024-10/orders.json`). |

```bash
npm run cli -- audit examples/orders.csv
npm run cli -- audit examples/orders.csv --format csv > carbon-report.csv
npm run cli -- audit examples/shopify-orders.json
```

All names and addresses are fictitious.

## CSV columns

Only a destination and a weight are required. Headers are case-insensitive.

| Column | Aliases | Notes |
|---|---|---|
| `destination_city` | `city`, `shipping_city`, `to_city` | or give `destination_lat` + `destination_lng` |
| `weight_kg` | `weight`, `total_weight_kg` | or `weight_g` / `grams` |
| `order_id` | `id`, `name`, `order` | |
| `carrier` | `shipping_method`, `method` | used to infer air / road / rail / sea / EV |
| `destination_state`, `destination_country` | `state`, `country` | |
| `origin_city`, `origin_country`, `origin_lat`, `origin_lng` | | defaults to `ECOTRACE_ORIGIN_*` |
| `date` | `created_at` | |
