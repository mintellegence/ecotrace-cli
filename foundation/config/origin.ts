/**
 * Default shipping origin (your warehouse / fulfilment hub).
 *
 * Shopify and WooCommerce webhooks do not include the warehouse location, so the
 * origin must come from configuration. Set it with environment variables:
 *   ECOTRACE_ORIGIN_CITY, ECOTRACE_ORIGIN_STATE, ECOTRACE_ORIGIN_COUNTRY,
 *   ECOTRACE_ORIGIN_POSTAL, ECOTRACE_ORIGIN_LAT, ECOTRACE_ORIGIN_LNG
 * Exact coordinates (LAT/LNG) give the most accurate distances.
 */

import { GeoLocation } from '../types/index.ts';

const FALLBACK_ORIGIN: GeoLocation = {
  city: 'Memphis',
  state: 'TN',
  country: 'US',
  postalCode: '38118',
};

function readEnv(name: string): string | undefined {
  const v = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return v && v.trim() ? v.trim() : undefined;
}

export function getDefaultOrigin(): GeoLocation {
  const city = readEnv('ECOTRACE_ORIGIN_CITY');
  const lat = Number(readEnv('ECOTRACE_ORIGIN_LAT'));
  const lng = Number(readEnv('ECOTRACE_ORIGIN_LNG'));
  const hasCoords =
    readEnv('ECOTRACE_ORIGIN_LAT') !== undefined &&
    readEnv('ECOTRACE_ORIGIN_LNG') !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  if (!city && !hasCoords) return { ...FALLBACK_ORIGIN };

  return {
    city: city || 'Warehouse',
    state: readEnv('ECOTRACE_ORIGIN_STATE'),
    country: readEnv('ECOTRACE_ORIGIN_COUNTRY') || 'US',
    postalCode: readEnv('ECOTRACE_ORIGIN_POSTAL'),
    coordinates: hasCoords ? [lat, lng] : undefined,
  };
}
