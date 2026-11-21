/**
 * Carbon ledger: bounded, de-duplicated, optionally persisted to disk.
 *
 * Data minimisation: customer details and raw webhook payloads are dropped before
 * anything is stored. A carbon ledger needs weights, routes and modes, not people.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CarbonCalculator } from '../../../foundation/engine/calculator.ts';
import { EmissionAuditResult, UnifiedOrder } from '../../../foundation/types/index.ts';

export interface LedgerLogEntry {
  id: string;
  timestamp: string;
  platform: string;
  orderId: string;
  status: 'audited' | 'duplicate';
  emissionKgCO2: number;
  rating: string;
  summary: string;
}

export interface LedgerOptions {
  /** Absolute path of the JSON file used for persistence. Omit for memory-only. */
  file?: string;
  maxOrders?: number;
  maxLogs?: number;
}

/** Strips PII and bulky raw payloads before an order enters the ledger. */
export function minimiseOrder(order: UnifiedOrder): UnifiedOrder {
  const { rawPayload: _raw, customer: _customer, ...rest } = order;
  return {
    ...rest,
    orderId: String(order.orderId).slice(0, 80),
    items: (order.items || []).slice(0, 200).map((i) => ({ ...i, name: String(i.name).slice(0, 120) })),
  };
}

export class Ledger {
  public orders: UnifiedOrder[] = [];
  public audits: EmissionAuditResult[] = [];
  public logs: LedgerLogEntry[] = [];

  private readonly file?: string;
  private readonly maxOrders: number;
  private readonly maxLogs: number;

  constructor(opts: LedgerOptions = {}) {
    this.file = opts.file;
    this.maxOrders = opts.maxOrders ?? 5000;
    this.maxLogs = opts.maxLogs ?? 200;
    this.load();
  }

  /** Adds an order unless the same platform + orderId is already recorded (webhooks are retried). */
  public add(order: UnifiedOrder): { audit: EmissionAuditResult; duplicate: boolean; order: UnifiedOrder } {
    const clean = minimiseOrder(order);
    const existingIdx = this.orders.findIndex((o) => o.platform === clean.platform && o.orderId === clean.orderId);

    if (existingIdx !== -1) {
      const audit = this.audits[existingIdx];
      this.pushLog(clean, audit, 'duplicate');
      return { audit, duplicate: true, order: this.orders[existingIdx] };
    }

    const audit = CarbonCalculator.auditOrder(clean);
    this.orders.unshift(clean);
    this.audits.unshift(audit);
    if (this.orders.length > this.maxOrders) {
      this.orders.length = this.maxOrders;
      this.audits.length = this.maxOrders;
    }
    this.pushLog(clean, audit, 'audited');
    this.persist();
    return { audit, duplicate: false, order: clean };
  }

  /** Replaces the ledger contents (used by demo reset and seeding). */
  public replaceAll(orders: UnifiedOrder[]): void {
    this.orders = [];
    this.audits = [];
    this.logs = [];
    for (const o of orders.slice().reverse()) this.add(o);
    this.persist();
  }

  private pushLog(order: UnifiedOrder, audit: EmissionAuditResult, status: 'audited' | 'duplicate'): void {
    this.logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      platform: order.platform,
      orderId: order.orderId,
      status,
      emissionKgCO2: audit.breakdown.emissionKgCO2,
      rating: audit.auditRating,
      summary:
        status === 'duplicate'
          ? `${order.platform} order ${order.orderId} already recorded; ignored duplicate delivery.`
          : `${order.platform} order ${order.orderId}: ${order.totalWeightKg} kg via ${order.carrier} (${audit.breakdown.distanceKm} km) = ${audit.breakdown.emissionKgCO2} kg CO2e [Grade ${audit.auditRating}]`,
    });
    if (this.logs.length > this.maxLogs) this.logs.length = this.maxLogs;
  }

  private load(): void {
    if (!this.file) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf-8'));
      if (Array.isArray(parsed?.orders)) {
        for (const o of (parsed.orders as UnifiedOrder[]).slice().reverse()) {
          const clean = minimiseOrder(o);
          this.orders.unshift(clean);
          this.audits.unshift(CarbonCalculator.auditOrder(clean));
        }
      }
    } catch {
      // No ledger yet, or unreadable: start empty.
    }
  }

  /** Atomic write (temp file + rename) so a crash never leaves a half-written ledger. */
  private persist(): void {
    if (!this.file) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ version: 1, orders: this.orders }), { mode: 0o600 });
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('[ledger] persist failed:', (err as Error).message);
    }
  }
}
