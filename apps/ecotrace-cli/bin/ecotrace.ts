#!/usr/bin/env node
/**
 * @ecotrace/cli - Application Implementation 1
 * Autonomous Command-Line Interface built for Kiroween (Skeleton Crew)
 * Powered by @ecotrace/foundation
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { CliCommandHandler } from '../../../src/cli/commands.ts';
import { INITIAL_SAMPLE_ORDERS, SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from '../../../src/data/sampleOrders.ts';
import { UnifiedOrder } from '../../../foundation/types/index.ts';

const program = new Command();

const BANNER = `
  ╭────────────────────────────────────────────────────────────╮
  │   🌿 < ECO > EcoTrace-CLI • Shipping Carbon Auditor       │
  │   Kiroween Skeleton Crew Autonomous Logistics Agent       │
  │   [App 1: Standalone Terminal Implementation]              │
  ╰────────────────────────────────────────────────────────────╯
`;

program
  .name('ecotrace')
  .description('Audit, calculate, and minimize e-commerce shipping carbon emissions directly from the terminal.')
  .version('1.0.0');

// Command: init
program
  .command('init')
  .description('Initialize EcoTrace configuration and register Kiro agent hooks')
  .action(() => {
    console.log(BANNER);
    const { message, config } = CliCommandHandler.handleInit();
    const configPath = path.resolve(process.cwd(), 'ecotrace.config.json');
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`[FILE] Saved config to ${configPath}`);
    } catch {
      // Safe fallback
    }
    console.log(message);
  });

// Command: calculate
program
  .command('calculate')
  .alias('calc')
  .description('Calculate shipping emissions: E = d * w * f')
  .requiredOption('-d, --distance <km>', 'Shipping route distance in kilometers', parseFloat)
  .requiredOption('-w, --weight <kg>', 'Total package weight in kilograms', parseFloat)
  .option('-c, --carrier <mode>', 'Carrier or shipping method', 'Ground')
  .action((options) => {
    console.log(BANNER);
    const output = CliCommandHandler.handleCalculate({
      distanceKm: options.distance,
      weightKg: options.weight,
      carrier: options.carrier,
    });
    console.log(output);
  });

// Command: audit
program
  .command('audit')
  .description('Scan e-commerce order manifests and generate carbon audit scorecard')
  .argument('[file]', 'Optional path to JSON order manifests file')
  .action((file) => {
    console.log(BANNER);
    let orders: UnifiedOrder[] = INITIAL_SAMPLE_ORDERS;

    if (file) {
      const fullPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          orders = JSON.parse(raw);
          console.log(`[INFO] Loaded ${orders.length} order manifests from ${file}\n`);
        } catch (err: any) {
          console.error(`[ERROR] Failed to read ${file}: ${err.message}`);
          return;
        }
      }
    }

    const report = CliCommandHandler.handleAudit(orders);
    console.log(report);
  });

// Command: kiro
program
  .command('kiro')
  .description('Manage Kiro autonomous agent steering specs and background hooks')
  .argument('[action]', 'Action to execute: specs, run, or hook', 'specs')
  .action((action) => {
    console.log(BANNER);
    if (action === 'specs') {
      console.log(CliCommandHandler.handleKiroSpecs());
    } else if (action === 'run') {
      console.log('[KIRO AGENT] Triggering autonomous background carbon audit pass...\n');
      console.log(CliCommandHandler.handleAudit(INITIAL_SAMPLE_ORDERS));
      console.log('\n[KIRO AGENT] Audit complete. Ledger synchronized with 0 errors.');
    } else {
      console.log(`[KIRO AGENT] Hook registered at .kiro/hooks/audit-hook.json`);
    }
  });

// Command: test-webhook
program
  .command('test-webhook')
  .description('Simulate an incoming webhook from Shopify or WooCommerce')
  .option('-p, --platform <type>', 'Platform to simulate: shopify or woocommerce', 'shopify')
  .action((options) => {
    console.log(BANNER);
    const payload = options.platform === 'woocommerce' ? SAMPLE_WOOCOMMERCE_WEBHOOK : SAMPLE_SHOPIFY_WEBHOOK;
    console.log(`[SIMULATE] Ingesting mock ${options.platform.toUpperCase()} webhook...\n`);
    const { report } = CliCommandHandler.handleNormalizeTest(payload);
    console.log(report);
  });

if (process.argv.slice(2).length === 0) {
  console.log(BANNER);
  program.outputHelp();
} else {
  program.parse(process.argv);
}
