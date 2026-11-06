/**
 * @ecotrace/service - Application Implementation 2
 * Lightweight HTTP Webhook Listener Daemon for Shopify and WooCommerce
 * Powered by @ecotrace/foundation
 */

import express, { Request, Response } from 'express';
import http from 'http';
import { AdapterRegistry } from '../../../foundation/adapters/index.ts';
import { CarbonCalculator } from '../../../foundation/engine/calculator.ts';
import { UnifiedOrder } from '../../../foundation/types/index.ts';

const app = express();
const PORT = Number(process.env.SERVICE_PORT) || 3001;

app.use(express.json());

// In-memory ledger
const ledger: UnifiedOrder[] = [];

// Shopify Webhook Endpoint
app.post('/api/webhooks/shopify', (req: Request, res: Response) => {
  try {
    const { order } = AdapterRegistry.normalize(req.body, req.headers as any, 'shopify');
    const audit = CarbonCalculator.auditOrder(order);
    ledger.unshift(order);

    res.status(200).json({
      success: true,
      service: '@ecotrace/service',
      orderId: order.orderId,
      emissionKgCO2: audit.breakdown.emissionKgCO2,
      auditRating: audit.auditRating,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// WooCommerce Webhook Endpoint
app.post('/api/webhooks/woocommerce', (req: Request, res: Response) => {
  try {
    const { order } = AdapterRegistry.normalize(req.body, req.headers as any, 'woocommerce');
    const audit = CarbonCalculator.auditOrder(order);
    ledger.unshift(order);

    res.status(200).json({
      success: true,
      service: '@ecotrace/service',
      orderId: order.orderId,
      emissionKgCO2: audit.breakdown.emissionKgCO2,
      auditRating: audit.auditRating,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: '@ecotrace/service', ledgerCount: ledger.length });
});

export function startService(port = PORT) {
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`[@ecotrace/service] Webhook receiver daemon listening on http://0.0.0.0:${port}`);
  });
  return server;
}

if (process.argv[1]?.includes('server.ts')) {
  startService();
}
