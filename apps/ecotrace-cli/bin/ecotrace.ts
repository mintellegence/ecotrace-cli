#!/usr/bin/env node
/**
 * App 1 of 2 built on @ecotrace/foundation: the EcoTrace terminal application.
 *
 *   ecotrace calculate -d 1200 -w 4.2 -c "FedEx Express Air"
 *   ecotrace audit orders.csv --format csv > report.csv
 *   ecotrace audit shopify-orders.json --fail-above 50
 */

import '../../../foundation/config/load-env.ts';
import { Command, InvalidArgumentError } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { importOrders } from '../../../foundation/importers/index.ts';
import { INITIAL_SAMPLE_ORDERS, SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from '../../../foundation/data/sampleOrders.ts';
import { KiroAgentRunner } from '../../../foundation/kiro/agentRunner.ts';
import { UnifiedOrder } from '../../../foundation/types/index.ts';
import { CliCommandHandler } from '../src/commands.ts';
import { baseString, buildPayload, parseBaseUrl, Platform, sendWebhook, verifyDeployment } from '../src/live.ts';

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const BANNER = `
  EcoTrace  |  shipping carbon auditor  (E = distance x weight x factor)
`;

/** Prints a clean message and exits non-zero instead of dumping a stack trace. */
function fail(message: string, code = 1): never {
  console.error(`[ERROR] ${message}`);
  process.exit(code);
}

function numberArg(label: string) {
  return (value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw new InvalidArgumentError(`${label} must be a positive number.`);
    return n;
  };
}

function loadOrders(file: string): UnifiedOrder[] {
  const fullPath = path.resolve(process.cwd(), file);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(fullPath);
  } catch {
    fail(`File not found: ${file}`);
  }
  if (!stat.isFile()) fail(`Not a file: ${file}`);
  if (stat.size > MAX_FILE_BYTES) fail(`File is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB: ${file}`);

  const { orders, errors } = importOrders(fs.readFileSync(fullPath, 'utf-8'), fullPath);
  for (const e of errors.slice(0, 20)) console.error(`[WARN] row ${e.row}: ${e.message}`);
  if (errors.length > 20) console.error(`[WARN] ...and ${errors.length - 20} more rows skipped`);
  if (orders.length === 0) fail(`No valid orders found in ${file}`);
  console.error(`[INFO] Loaded ${orders.length} orders from ${file}${errors.length ? ` (${errors.length} skipped)` : ''}`);
  return orders;
}

const program = new Command();

program
  .name('ecotrace')
  .description('Audit and reduce e-commerce shipping carbon emissions from the terminal.')
  .version('1.1.0');

program
  .command('init')
  .description('Write an ecotrace.config.json template in the current directory')
  .option('--force', 'overwrite an existing config file')
  .action((opts) => {
    const configPath = path.resolve(process.cwd(), 'ecotrace.config.json');
    if (fs.existsSync(configPath) && !opts.force) fail('ecotrace.config.json already exists (use --force to overwrite).');
    const { message, config } = CliCommandHandler.handleInit();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    console.log(BANNER);
    console.log(message);
  });

program
  .command('calculate')
  .alias('calc')
  .description('Calculate emissions for one shipment: E = d x w x f')
  .requiredOption('-d, --distance <km>', 'route distance in kilometres', numberArg('Distance'))
  .requiredOption('-w, --weight <kg>', 'package weight in kilograms', numberArg('Weight'))
  .option('-c, --carrier <name>', 'carrier or service name, e.g. "UPS Next Day Air"', 'Ground')
  .action((opts) => {
    console.log(BANNER);
    console.log(CliCommandHandler.handleCalculate({ distanceKm: opts.distance, weightKg: opts.weight, carrier: opts.carrier }));
  });

program
  .command('audit')
  .description('Audit an order export (JSON or CSV). Without a file, audits built-in demo orders.')
  .argument('[file]', 'orders file: .csv, UnifiedOrder JSON, or raw Shopify/WooCommerce JSON export')
  .option('-f, --format <type>', 'output format: table | json | csv', 'table')
  .option('--fail-above <kgCO2e>', 'exit with code 2 if total emissions exceed this value (CI gate)', numberArg('Threshold'))
  .action((file, opts) => {
    const format = String(opts.format).toLowerCase();
    if (!['table', 'json', 'csv'].includes(format)) fail('--format must be table, json or csv');

    let orders: UnifiedOrder[];
    if (file) orders = loadOrders(file);
    else {
      console.error('[INFO] No file given: auditing built-in demo orders. Pass a CSV/JSON export for real data.');
      orders = INITIAL_SAMPLE_ORDERS;
    }

    if (format === 'json') console.log(CliCommandHandler.handleAuditJson(orders));
    else if (format === 'csv') console.log(CliCommandHandler.handleAuditCsv(orders));
    else {
      console.log(BANNER);
      console.log(CliCommandHandler.handleAudit(orders));
    }

    if (opts.failAbove !== undefined) {
      const total = KiroAgentRunner.runAudit(orders).summary.totalEmissionsKgCO2;
      if (total > opts.failAbove) {
        console.error(`[FAIL] Total ${total.toFixed(2)} kg CO2e exceeds threshold ${opts.failAbove} kg CO2e`);
        process.exitCode = 2;
      }
    }
  });

program
  .command('kiro')
  .description('Show the Kiro agent spec, or run the auditor on a file')
  .argument('[action]', 'specs | run', 'specs')
  .argument('[file]', 'orders file for "run"')
  .action((action, file) => {
    console.log(BANNER);
    if (action === 'specs') console.log(CliCommandHandler.handleKiroSpecs());
    else if (action === 'run') {
      const orders = file ? loadOrders(file) : INITIAL_SAMPLE_ORDERS;
      console.log(CliCommandHandler.handleAudit(orders));
    } else fail(`Unknown kiro action "${action}". Use "specs" or "run".`);
  });

program
  .command('test-webhook')
  .description('Normalize and audit a sample Shopify or WooCommerce webhook payload')
  .option('-p, --platform <type>', 'shopify | woocommerce', 'shopify')
  .option('--file <payload.json>', 'use your own captured webhook payload instead of the sample')
  .action((opts) => {
    if (!['shopify', 'woocommerce'].includes(opts.platform)) fail('--platform must be shopify or woocommerce');
    let payload: unknown = opts.platform === 'woocommerce' ? SAMPLE_WOOCOMMERCE_WEBHOOK : SAMPLE_SHOPIFY_WEBHOOK;
    if (opts.file) {
      try {
        payload = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), opts.file), 'utf-8'));
      } catch (e) {
        fail(`Could not read payload ${opts.file}: ${(e as Error).message}`);
      }
    }
    console.log(BANNER);
    console.log(CliCommandHandler.handleNormalizeTest(payload).report);
  });

// ---------------------------------------------------------------------------
// Live commands (talk to a running EcoTrace web app)
// ---------------------------------------------------------------------------

const DEFAULT_URL = process.env.ECOTRACE_URL || 'http://127.0.0.1:3000';

program
  .command('send-webhook')
  .description('Send a signed Shopify/WooCommerce order webhook to a running EcoTrace server')
  .option('-u, --url <url>', 'server base URL (or set ECOTRACE_URL)', DEFAULT_URL)
  .option('-p, --platform <type>', 'shopify | woocommerce', 'shopify')
  .option('--to <city>', 'destination city, e.g. London')
  .option('--country <code>', 'destination country code, e.g. GB', 'US')
  .option('-w, --weight <kg>', 'shipment weight in kg', numberArg('Weight'))
  .option('-c, --carrier <name>', 'carrier / service, e.g. "DHL Express Air"')
  .option('--file <payload.json>', 'send your own captured payload instead of a generated one')
  .action(async (opts) => {
    if (!['shopify', 'woocommerce'].includes(opts.platform)) fail('--platform must be shopify or woocommerce');
    let base: URL;
    try {
      base = parseBaseUrl(opts.url);
    } catch (e) {
      fail((e as Error).message);
    }

    let payload: unknown;
    if (opts.file) {
      try {
        payload = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), opts.file), 'utf-8'));
      } catch (e) {
        fail(`Could not read payload ${opts.file}: ${(e as Error).message}`);
      }
    } else {
      payload = buildPayload(opts.platform as Platform, { to: opts.to, country: opts.country, weightKg: opts.weight, carrier: opts.carrier });
    }

    console.log(`\n  -> POST ${baseString(base)}/api/webhooks/${opts.platform}  (HMAC-SHA256 signed)`);
    try {
      const r = await sendWebhook(base, opts.platform as Platform, payload);
      if (r.status !== 200) fail(`Server answered HTTP ${r.status}: ${r.json?.error ?? JSON.stringify(r.json)}`);
      const j = r.json;
      console.log(`  <- HTTP 200 in ${r.ms} ms${j.duplicate ? '  (duplicate: already recorded)' : ''}\n`);
      console.log(`     Order:     ${j.orderId}`);
      console.log(`     Emissions: ${j.emissionKgCO2} kg CO2e`);
      console.log(`     Grade:     ${j.auditRating}\n`);
      console.log(`  Open ${baseString(base)}  ->  Carbon Ledger to see it live.\n`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

program
  .command('verify')
  .description('Run live end-to-end security and correctness checks against a deployment')
  .argument('[url]', 'server base URL (or set ECOTRACE_URL)', DEFAULT_URL)
  .action(async (url) => {
    let base: URL;
    try {
      base = parseBaseUrl(url);
    } catch (e) {
      fail((e as Error).message);
    }
    console.log(BANNER);
    console.log('  Live deployment checks');
    const { failed } = await verifyDeployment(base, (l) => console.log(l));
    if (failed > 0) process.exitCode = 1;
  });

try {
  if (process.argv.slice(2).length === 0) {
    console.log(BANNER);
    program.outputHelp();
  } else {
    await program.parseAsync(process.argv);
  }
} catch (e) {
  fail((e as Error).message);
}
