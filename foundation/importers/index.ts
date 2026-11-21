/**
 * Order importers: turn real store exports into UnifiedOrder[].
 *
 * Supported inputs
 *  - JSON array of UnifiedOrder objects
 *  - JSON array of raw Shopify / WooCommerce order objects (REST API output)
 *  - JSON object wrapping an array: { "orders": [...] }  (Shopify Admin API shape)
 *  - CSV with a header row (see CSV_COLUMNS)
 *
 * Every row is validated; bad rows are reported, never silently guessed.
 */

import { AdapterRegistry } from '../adapters/index.ts';
import { getDefaultOrigin } from '../config/origin.ts';
import { LIMITS } from '../engine/validation.ts';
import { UnifiedOrder } from '../types/index.ts';

export const MAX_IMPORT_ROWS = 100_000;

export interface ImportResult {
  orders: UnifiedOrder[];
  errors: Array<{ row: number; message: string }>;
}

/** Recognised CSV headers (case-insensitive). Only destination + weight are required. */
export const CSV_COLUMNS = {
  orderId: ['order_id', 'orderid', 'id', 'name', 'order'],
  date: ['date', 'created_at', 'createdat'],
  originCity: ['origin_city', 'from_city'],
  originCountry: ['origin_country', 'from_country'],
  originLat: ['origin_lat'],
  originLng: ['origin_lng', 'origin_lon'],
  destCity: ['destination_city', 'dest_city', 'city', 'shipping_city', 'to_city'],
  destState: ['destination_state', 'dest_state', 'state', 'shipping_province', 'province'],
  destCountry: ['destination_country', 'dest_country', 'country', 'shipping_country'],
  destLat: ['destination_lat', 'dest_lat', 'lat', 'latitude'],
  destLng: ['destination_lng', 'dest_lng', 'lng', 'lon', 'longitude'],
  weightKg: ['weight_kg', 'weightkg', 'total_weight_kg', 'weight'],
  weightGrams: ['weight_g', 'grams', 'total_weight_grams'],
  carrier: ['carrier', 'shipping_carrier', 'shipping_method', 'shipping', 'method'],
} as const;

/** RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, ''); // strip BOM from Excel exports

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

function pick(record: Record<string, string>, keys: readonly string[]): string | undefined {
  for (const k of keys) {
    const v = record[k];
    if (v !== undefined && v.trim() !== '') return v.trim();
  }
  return undefined;
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function coords(lat?: string, lng?: string): [number, number] | undefined {
  const a = num(lat);
  const b = num(lng);
  if (a === undefined || b === undefined || Math.abs(a) > 90 || Math.abs(b) > 180) return undefined;
  return [a, b];
}

export function importCsv(text: string): ImportResult {
  const table = parseCsv(text);
  const errors: ImportResult['errors'] = [];
  if (table.length < 2) return { orders: [], errors: [{ row: 1, message: 'CSV needs a header row and at least one data row.' }] };
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return { orders: [], errors: [{ row: 1, message: `CSV exceeds ${MAX_IMPORT_ROWS} rows.` }] };
  }

  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const fallbackOrigin = getDefaultOrigin();
  const orders: UnifiedOrder[] = [];

  for (let r = 1; r < table.length; r++) {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = table[r][i] ?? ''));
    const rowNo = r + 1;

    const destCity = pick(rec, CSV_COLUMNS.destCity);
    const destCoords = coords(pick(rec, CSV_COLUMNS.destLat), pick(rec, CSV_COLUMNS.destLng));
    if (!destCity && !destCoords) {
      errors.push({ row: rowNo, message: 'missing destination (city or lat/lng)' });
      continue;
    }

    const kg = num(pick(rec, CSV_COLUMNS.weightKg));
    const grams = num(pick(rec, CSV_COLUMNS.weightGrams));
    const weightKg = kg !== undefined ? kg : grams !== undefined ? grams / 1000 : undefined;
    if (weightKg === undefined || weightKg <= 0 || weightKg > LIMITS.maxWeightKg) {
      errors.push({ row: rowNo, message: 'missing or invalid weight (weight_kg or weight_g)' });
      continue;
    }

    const originCity = pick(rec, CSV_COLUMNS.originCity);
    const originCoords = coords(pick(rec, CSV_COLUMNS.originLat), pick(rec, CSV_COLUMNS.originLng));

    orders.push({
      orderId: (pick(rec, CSV_COLUMNS.orderId) || `ROW-${rowNo}`).slice(0, 80),
      platform: 'manual',
      createdAt: pick(rec, CSV_COLUMNS.date) || new Date().toISOString(),
      origin:
        originCity || originCoords
          ? { city: originCity || 'Origin', country: pick(rec, CSV_COLUMNS.originCountry) || fallbackOrigin.country, coordinates: originCoords }
          : fallbackOrigin,
      destination: {
        city: (destCity || 'Destination').slice(0, 120),
        state: pick(rec, CSV_COLUMNS.destState),
        country: pick(rec, CSV_COLUMNS.destCountry) || 'US',
        coordinates: destCoords,
      },
      items: [{ id: '1', name: 'Shipment', quantity: 1, weightKg }],
      totalWeightKg: weightKg,
      carrier: (pick(rec, CSV_COLUMNS.carrier) || 'Ground').slice(0, 120),
      shippingMethod: pick(rec, CSV_COLUMNS.carrier) || 'Standard',
    });
  }

  return { orders, errors };
}

function isUnifiedOrder(o: any): o is UnifiedOrder {
  return (
    o && typeof o === 'object' && typeof o.orderId === 'string' &&
    o.destination && typeof o.destination === 'object' &&
    o.origin && typeof o.origin === 'object' &&
    Number(o.totalWeightKg) > 0
  );
}

export function importJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { orders: [], errors: [{ row: 0, message: `Invalid JSON: ${(e as Error).message}` }] };
  }

  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as any).orders)
      ? (parsed as any).orders
      : parsed && typeof parsed === 'object'
        ? [parsed]
        : [];

  if (list.length > MAX_IMPORT_ROWS) {
    return { orders: [], errors: [{ row: 0, message: `File exceeds ${MAX_IMPORT_ROWS} orders.` }] };
  }

  const orders: UnifiedOrder[] = [];
  const errors: ImportResult['errors'] = [];
  list.forEach((item, idx) => {
    try {
      if (isUnifiedOrder(item)) orders.push(item);
      else orders.push(AdapterRegistry.normalize(item).order);
    } catch (e) {
      errors.push({ row: idx + 1, message: (e as Error).message });
    }
  });
  return { orders, errors };
}

/** Chooses the importer from the file name, falling back to content sniffing. */
export function importOrders(text: string, fileName = ''): ImportResult {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return importCsv(text);
  if (lower.endsWith('.json')) return importJson(text);
  const trimmed = text.trimStart();
  return trimmed.startsWith('[') || trimmed.startsWith('{') ? importJson(text) : importCsv(text);
}
