import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AdapterRegistry } from '../foundation/adapters/index.ts';
import { SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK } from '../foundation/data/sampleOrders.ts';
import { CarbonCalculator } from '../foundation/engine/calculator.ts';
import { importCsv, importJson, importOrders, parseCsv } from '../foundation/importers/index.ts';
import { csvCell } from '../apps/ecotrace-cli/src/commands.ts';

describe('platform adapters', () => {
  it('normalizes the Shopify sample (grams -> kg, service title as carrier)', () => {
    const { order, matchedPlatform } = AdapterRegistry.normalize(SAMPLE_SHOPIFY_WEBHOOK);
    expect(matchedPlatform).toBe('shopify');
    expect(order.totalWeightKg).toBe(4.2);
    expect(order.carrier).toBe('FedEx Express 2-Day Air');
    expect(order.weightEstimated).toBe(false);
  });

  it('normalizes the WooCommerce sample using _weight meta', () => {
    const { order, matchedPlatform } = AdapterRegistry.normalize(SAMPLE_WOOCOMMERCE_WEBHOOK);
    expect(matchedPlatform).toBe('woocommerce');
    expect(order.totalWeightKg).toBe(1.7);
    expect(order.weightEstimated).toBe(false);
  });

  it('flags weight as estimated when Shopify sends no grams', () => {
    const payload = structuredClone(SAMPLE_SHOPIFY_WEBHOOK) as any;
    payload.total_weight = 0;
    payload.line_items = payload.line_items.map((li: any) => ({ ...li, grams: 0 }));
    const audit = CarbonCalculator.auditOrder(AdapterRegistry.normalize(payload).order);
    expect(audit.dataQuality?.weightEstimated).toBe(true);
  });

  it('rejects non-object payloads', () => {
    for (const bad of [null, 42, 'str', [1, 2]]) {
      expect(() => AdapterRegistry.normalize(bad)).toThrow(/JSON object/);
    }
  });

  it('never throws on arbitrary JSON objects', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string({ maxLength: 12 }), fc.jsonValue({ maxDepth: 3 })), (obj) => {
        const { order } = AdapterRegistry.normalize(obj);
        const r = CarbonCalculator.auditOrder(order);
        return Number.isFinite(r.breakdown.emissionKgCO2);
      }),
      { numRuns: 300 }
    );
  });

  it('does not let a payload pollute Object.prototype', () => {
    AdapterRegistry.normalize(JSON.parse('{"__proto__": {"polluted": true}, "city": "constructor"}'));
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe('CSV parsing and import', () => {
  it('handles quotes, escaped quotes, CRLF and BOM', () => {
    expect(parseCsv('\uFEFFa,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
    ]);
  });

  it('round-trips any cell through csvCell + parseCsv', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1, maxLength: 6 }), (cells) => {
        // Formula-looking cells are intentionally prefixed with ' by csvCell.
        const expected = cells.map((c) => (/^[=+\-@\t\r]/.test(c) && !/^-?\d+(\.\d+)?$/.test(c) ? `'${c}` : c));
        const parsed = parseCsv(cells.map(csvCell).join(',') + '\n');
        if (cells.every((c) => c.trim() === '')) return true; // blank rows are skipped by design
        return JSON.stringify(parsed[0]) === JSON.stringify(expected);
      })
    );
  });

  it('neutralises spreadsheet formula injection in exports', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('-12.5')).toBe('-12.5');
  });

  it('imports valid rows and reports bad ones by row number', () => {
    const { orders, errors } = importCsv(
      'order_id,city,country,weight_kg,carrier\nA,Chicago,US,2,FedEx Ground\nB,,US,2,UPS\nC,Denver,US,-1,UPS\nD,Austin,US,1.5,UPS Next Day Air\n'
    );
    expect(orders.map((o) => o.orderId)).toEqual(['A', 'D']);
    expect(errors.map((e) => e.row)).toEqual([3, 4]);
  });

  it('accepts grams and coordinates', () => {
    const { orders } = importCsv('id,lat,lng,weight_g\nX,47.6,-122.3,1500\n');
    expect(orders[0].totalWeightKg).toBe(1.5);
    expect(orders[0].destination.coordinates).toEqual([47.6, -122.3]);
  });

  it('imports a Shopify Admin API list response', () => {
    const json = JSON.stringify({ orders: [SAMPLE_SHOPIFY_WEBHOOK, SAMPLE_WOOCOMMERCE_WEBHOOK] });
    const { orders, errors } = importJson(json);
    expect(errors).toEqual([]);
    expect(orders.map((o) => o.platform)).toEqual(['shopify', 'woocommerce']);
  });

  it('reports invalid JSON instead of throwing', () => {
    expect(importOrders('{not json', 'x.json').errors[0].message).toMatch(/Invalid JSON/);
  });
});
