/**
 * Lightweight Geocoding, Haversine Distance Calculation & Coordinate Bounding
 * Zero-dependency spatial helpers for offline CLI and high-throughput webhooks.
 */

import { GeoLocation } from '../types/index.ts';

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Major e-commerce fulfillment hubs, metropolitan distribution nodes, and international ports
export const KNOWN_HUBS: Record<string, { lat: number; lng: number; country: string }> = {
  // North America
  'los angeles': { lat: 34.0522, lng: -118.2437, country: 'US' },
  'ontario': { lat: 34.0633, lng: -117.6509, country: 'US' }, // Huge Inland Empire warehousing hub
  'seattle': { lat: 47.6062, lng: -122.3321, country: 'US' },
  'chicago': { lat: 41.8781, lng: -87.6298, country: 'US' },
  'memphis': { lat: 35.1495, lng: -90.0490, country: 'US' }, // FedEx Global Hub
  'louisville': { lat: 38.2527, lng: -85.7585, country: 'US' }, // UPS Worldport Hub
  'new york': { lat: 40.7128, lng: -74.0060, country: 'US' },
  'newark': { lat: 40.7357, lng: -74.1724, country: 'US' },
  'dallas': { lat: 32.7767, lng: -96.7970, country: 'US' },
  'austin': { lat: 30.2672, lng: -97.7431, country: 'US' },
  'atlanta': { lat: 33.7490, lng: -84.3880, country: 'US' },
  'miami': { lat: 25.7617, lng: -80.1918, country: 'US' },
  'san francisco': { lat: 37.7749, lng: -122.4194, country: 'US' },
  'denver': { lat: 39.7392, lng: -104.9903, country: 'US' },
  'toronto': { lat: 43.6532, lng: -79.3832, country: 'CA' },
  'vancouver': { lat: 49.2827, lng: -123.1207, country: 'CA' },
  'mexico city': { lat: 19.4326, lng: -99.1332, country: 'MX' },

  // Europe
  'london': { lat: 51.5074, lng: -0.1278, country: 'GB' },
  'manchester': { lat: 53.4808, lng: -2.2426, country: 'GB' },
  'frankfurt': { lat: 50.1109, lng: 8.6821, country: 'DE' }, // Major European cargo hub
  'berlin': { lat: 52.5200, lng: 13.4050, country: 'DE' },
  'leipzig': { lat: 51.3397, lng: 12.3731, country: 'DE' }, // DHL European Air Hub
  'rotterdam': { lat: 51.9244, lng: 4.4777, country: 'NL' }, // Primary Europe ocean port
  'amsterdam': { lat: 52.3676, lng: 4.9041, country: 'NL' },
  'paris': { lat: 48.8566, lng: 2.3522, country: 'FR' },
  'madrid': { lat: 40.4168, lng: -3.7038, country: 'ES' },
  'rome': { lat: 41.9028, lng: 12.4964, country: 'IT' },
  'milan': { lat: 45.4642, lng: 9.1900, country: 'IT' },
  'warsaw': { lat: 52.2297, lng: 21.0122, country: 'PL' },
  'stockholm': { lat: 59.3293, lng: 18.0686, country: 'SE' },

  // Asia / Pacific
  'tokyo': { lat: 35.6762, lng: 139.6503, country: 'JP' },
  'singapore': { lat: 1.3521, lng: 103.8198, country: 'SG' },
  'hong kong': { lat: 22.3193, lng: 114.1694, country: 'HK' },
  'shanghai': { lat: 31.2304, lng: 121.4737, country: 'CN' },
  'shenzhen': { lat: 22.5431, lng: 114.0579, country: 'CN' },
  'seoul': { lat: 37.5665, lng: 126.9780, country: 'KR' },
  'sydney': { lat: -33.8688, lng: 151.2093, country: 'AU' },
  'melbourne': { lat: -37.8136, lng: 144.9631, country: 'AU' },
  'mumbai': { lat: 19.0760, lng: 72.8777, country: 'IN' },
  'dubai': { lat: 25.2048, lng: 55.2708, country: 'AE' },
};

// Regional bounding boxes for geographic safety validation
export const CONTINENTAL_BOUNDS: Record<string, BoundingBox> = {
  north_america: { minLat: 14.0, maxLat: 71.0, minLng: -170.0, maxLng: -50.0 },
  europe: { minLat: 34.0, maxLat: 72.0, minLng: -25.0, maxLng: 45.0 },
  asia: { minLat: -10.0, maxLat: 75.0, minLng: 45.0, maxLng: 150.0 },
  australia: { minLat: -45.0, maxLat: -10.0, minLng: 110.0, maxLng: 160.0 },
};

/**
 * Checks if a given coordinate falls within a bounding box
 */
export function isWithinBoundingBox(coord: [number, number], bbox: BoundingBox): boolean {
  const [lat, lng] = coord;
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}

/**
 * Normalizes city/region strings for lookup
 */
function cleanLocationKey(name?: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
}

/**
 * Resolves [latitude, longitude] for an origin or destination
 */
export function resolveCoordinates(loc: GeoLocation): [number, number] {
  if (loc.coordinates && loc.coordinates.length === 2) {
    return loc.coordinates;
  }

  const cityKey = cleanLocationKey(loc.city);
  if (cityKey && KNOWN_HUBS[cityKey]) {
    const hub = KNOWN_HUBS[cityKey];
    return [hub.lat, hub.lng];
  }

  // Check state / country fallbacks
  const country = loc.country ? loc.country.toUpperCase() : 'US';
  if (country === 'US' || country === 'USA' || country === 'UNITED STATES') {
    // Default US continental centroid / hub (Memphis/Chicago area)
    return [38.5, -95.0];
  } else if (country === 'GB' || country === 'UK') {
    return [52.3555, -1.1743];
  } else if (country === 'DE' || country === 'GERMANY') {
    return [51.1657, 10.4515];
  } else if (country === 'FR' || country === 'FRANCE') {
    return [46.2276, 2.2137];
  } else if (country === 'CA' || country === 'CANADA') {
    return [56.1304, -106.3468];
  } else if (country === 'AU' || country === 'AUSTRALIA') {
    return [-25.2744, 133.7751];
  } else if (country === 'JP' || country === 'JAPAN') {
    return [36.2048, 138.2529];
  }

  // World centroid fallback
  return [40.0, -40.0];
}

/**
 * Computes great-circle distance (in kilometers) between two coordinates using Haversine formula
 */
export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineDistance = R * c;

  return straightLineDistance;
}

/**
 * Calculates realistic road or flight transport distance with routing curvature factor.
 * Actual shipping routes detour around terrain, road networks, and flight corridors (typically 1.15x - 1.25x straight line).
 */
export function calculateShippingDistance(
  origin: GeoLocation,
  destination: GeoLocation,
  mode: string = 'road_truck'
): number {
  const originCoord = resolveCoordinates(origin);
  const destCoord = resolveCoordinates(destination);

  const directKm = haversineDistance(originCoord, destCoord);

  // If origin and destination are identical city/zip, apply minimum local delivery radius
  if (directKm < 5) {
    return 15; // Average local last-mile courier circuit in km
  }

  // Apply routing detour coefficient based on transport mode
  const detourFactor = mode === 'air_freight' ? 1.10 : mode === 'sea_freight' ? 1.35 : 1.20;
  return Math.round(directKm * detourFactor);
}
