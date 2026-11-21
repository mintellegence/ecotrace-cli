# App 1: EcoTrace CLI

Terminal tool built on [`/foundation`](../../foundation). Run from the repository root:

```bash
npm run cli -- <command>
```

| Command | What it does |
|---|---|
| `calculate -d <km> -w <kg> [-c <service>]` | Emissions for one shipment |
| `audit [file] [--format table\|json\|csv] [--fail-above <kg>]` | Audit a CSV or Shopify/WooCommerce JSON export. Exit 2 if over budget |
| `send-webhook [-u url] [-p shopify\|woocommerce] [--to city] [--country CC] [-w kg] [-c service] [--file payload.json]` | Send a signed order webhook to a running EcoTrace server |
| `verify [url]` | 17 live security and correctness checks against a deployment |
| `test-webhook [-p platform] [--file payload.json]` | Normalize a payload locally, without a server |
| `kiro specs` / `kiro run [file]` | Show the Kiro assets / run the audit report |
| `init [--force]` | Write an `ecotrace.config.json` template |

Exit codes: `0` ok, `1` error, `2` carbon budget exceeded.

`send-webhook` and `verify` read webhook secrets from `SHOPIFY_WEBHOOK_SECRET` / `WOOCOMMERCE_WEBHOOK_SECRET`. There are deliberately no `--secret` flags, so secrets never end up in shell history. The default URL comes from `ECOTRACE_URL`.

This package is not published to npm. The npm package named `ecotrace-cli` is an unrelated project.
