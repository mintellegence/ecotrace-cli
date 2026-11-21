/**
 * App 2 of 2 built on /foundation: signed webhook receiver + live carbon dashboard.
 * This file only wires up the frontend and starts listening; the API lives in server/app.ts.
 */

import '../../foundation/config/load-env.ts';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configFromEnv, createApp, errorHandler } from './server/app.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const cfg = configFromEnv(process.env, REPO_ROOT);
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (cfg.isProduction ? '0.0.0.0' : '127.0.0.1');

async function start() {
  const { app } = createApp(cfg);

  if (!cfg.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.join(HERE, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(REPO_ROOT, 'dist');
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      console.error('[EcoTrace] dist/ not found. Run "npm run build" first.');
      process.exit(1);
    }
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.use(errorHandler);

  if (cfg.isProduction && !cfg.webhookAuth.shopifySecret && !cfg.webhookAuth.wooSecret) {
    console.warn('[EcoTrace] No webhook secrets set: store webhooks will be rejected (503) until configured.');
  }
  if (cfg.isProduction && !cfg.demoMode && !cfg.readToken) {
    console.warn('[EcoTrace] ECOTRACE_READ_TOKEN is not set: anyone with the URL can view this ledger.');
  }

  http.createServer(app).listen(PORT, HOST, () => {
    console.log(`[EcoTrace] Dashboard + webhook receiver on http://${HOST}:${PORT} (demo mode: ${cfg.demoMode})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
