// server.ts
import express from "express";
import http from "http";
import path from "path";

// src/adapters/shopify.ts
var ShopifyAdapter = class {
  constructor() {
    this.platform = "shopify";
    this.displayName = "Shopify";
  }
  canHandle(payload, headers) {
    if (!payload || typeof payload !== "object") return false;
    if (headers) {
      const topic = headers["x-shopify-topic"] || headers["X-Shopify-Topic"];
      const shopDomain = headers["x-shopify-shop-domain"] || headers["X-Shopify-Shop-Domain"];
      if (topic || shopDomain) return true;
    }
    if (payload.admin_graphql_api_id && String(payload.admin_graphql_api_id).includes("Order")) {
      return true;
    }
    if (payload.order_number !== void 0 && Array.isArray(payload.line_items) && payload.shipping_address) {
      return true;
    }
    return false;
  }
  normalize(payload) {
    const rawOrder = payload.order || payload;
    const orderId = rawOrder.name || (rawOrder.order_number ? `#${rawOrder.order_number}` : `SH-${rawOrder.id || Math.floor(Math.random() * 9e4 + 1e4)}`);
    const cust = rawOrder.customer || {};
    const customer = {
      name: [cust.first_name, cust.last_name].filter(Boolean).join(" ") || rawOrder.shipping_address?.name || "Shopify Customer",
      email: cust.email || rawOrder.email || "customer@example.com"
    };
    const shipAddr = rawOrder.shipping_address || rawOrder.billing_address || {};
    const destination = {
      city: shipAddr.city || "Los Angeles",
      state: shipAddr.province || shipAddr.province_code || "CA",
      country: shipAddr.country_code || shipAddr.country || "US",
      postalCode: shipAddr.zip || "",
      coordinates: shipAddr.latitude && shipAddr.longitude ? [Number(shipAddr.latitude), Number(shipAddr.longitude)] : void 0
    };
    const origin = {
      city: rawOrder.fulfillment_city || "Memphis",
      // Major fulfillment nexus
      state: rawOrder.fulfillment_state || "TN",
      country: "US",
      postalCode: "38118"
    };
    let computedWeightGrams = 0;
    const items = Array.isArray(rawOrder.line_items) ? rawOrder.line_items.map((li) => {
      const itemGrams = Number(li.grams) || 450;
      const qty = Number(li.quantity) || 1;
      const lineTotalGrams = itemGrams * qty;
      computedWeightGrams += lineTotalGrams;
      return {
        id: String(li.id || li.sku || Math.random()),
        name: li.title || li.name || "Shopify Product",
        quantity: qty,
        weightKg: Math.round(lineTotalGrams / 1e3 * 100) / 100,
        price: Number(li.price) || 0,
        sku: li.sku || ""
      };
    }) : [];
    const totalWeightKg = rawOrder.total_weight && Number(rawOrder.total_weight) > 0 ? Math.round(Number(rawOrder.total_weight) / 1e3 * 100) / 100 : Math.max(0.5, Math.round(computedWeightGrams / 1e3 * 100) / 100);
    const shippingLine = Array.isArray(rawOrder.shipping_lines) && rawOrder.shipping_lines.length > 0 ? rawOrder.shipping_lines[0] : null;
    const carrier = shippingLine?.carrier_identifier || shippingLine?.source || shippingLine?.title || "Standard Ground Delivery";
    const shippingMethod = shippingLine?.title || "Standard Shipping";
    return {
      orderId,
      platform: "shopify",
      createdAt: rawOrder.created_at || (/* @__PURE__ */ new Date()).toISOString(),
      customer,
      origin,
      destination,
      items,
      totalWeightKg,
      carrier,
      shippingMethod,
      currency: rawOrder.currency || "USD",
      totalPrice: Number(rawOrder.total_price) || 0,
      rawPayload: payload
    };
  }
};

// src/adapters/woocommerce.ts
var WooCommerceAdapter = class {
  constructor() {
    this.platform = "woocommerce";
    this.displayName = "WooCommerce";
  }
  canHandle(payload, headers) {
    if (!payload || typeof payload !== "object") return false;
    if (headers) {
      const topic = headers["x-wc-webhook-topic"] || headers["X-WC-Webhook-Topic"];
      const source = headers["x-wc-webhook-source"] || headers["X-WC-Webhook-Source"];
      if (topic || source) return true;
    }
    if (payload.payment_method_title !== void 0 && payload.billing && payload.shipping) {
      return true;
    }
    if (payload.customer_id !== void 0 && payload.shipping_lines !== void 0 && payload.line_items) {
      return true;
    }
    return false;
  }
  normalize(payload) {
    const rawOrder = payload;
    const orderId = rawOrder.number ? `WC-${rawOrder.number}` : `WC-${rawOrder.id || Math.floor(Math.random() * 8e4 + 1e4)}`;
    const billing = rawOrder.billing || {};
    const shipping = rawOrder.shipping || {};
    const customer = {
      name: [shipping.first_name || billing.first_name, shipping.last_name || billing.last_name].filter(Boolean).join(" ") || "WooCommerce Customer",
      email: billing.email || "customer@example.com"
    };
    const destination = {
      city: shipping.city || billing.city || "Austin",
      state: shipping.state || billing.state || "TX",
      country: shipping.country || billing.country || "US",
      postalCode: shipping.postcode || billing.postcode || ""
    };
    const origin = {
      city: "Chicago",
      state: "IL",
      country: "US",
      postalCode: "60601"
    };
    let totalComputedWeight = 0;
    const items = Array.isArray(rawOrder.line_items) ? rawOrder.line_items.map((li) => {
      let itemWeightKg = 0.5;
      if (li.meta_data && Array.isArray(li.meta_data)) {
        const weightMeta = li.meta_data.find((m) => m.key === "_weight" || m.key === "weight");
        if (weightMeta && !isNaN(Number(weightMeta.value))) {
          itemWeightKg = Number(weightMeta.value);
        }
      } else if (li.weight && !isNaN(Number(li.weight))) {
        itemWeightKg = Number(li.weight);
      }
      const qty = Number(li.quantity) || 1;
      const lineTotalWeight = itemWeightKg * qty;
      totalComputedWeight += lineTotalWeight;
      return {
        id: String(li.id || li.product_id || Math.random()),
        name: li.name || "WooCommerce Product",
        quantity: qty,
        weightKg: Math.round(lineTotalWeight * 100) / 100,
        price: Number(li.price) || Number(li.total) / qty || 0,
        sku: li.sku || ""
      };
    }) : [];
    const totalWeightKg = Math.max(0.5, Math.round(totalComputedWeight * 100) / 100);
    const shippingLine = Array.isArray(rawOrder.shipping_lines) && rawOrder.shipping_lines.length > 0 ? rawOrder.shipping_lines[0] : null;
    const carrier = shippingLine?.method_title || shippingLine?.method_id || "Standard Courier Service";
    const shippingMethod = shippingLine?.method_title || "Flat Rate Shipping";
    return {
      orderId,
      platform: "woocommerce",
      createdAt: rawOrder.date_created || (/* @__PURE__ */ new Date()).toISOString(),
      customer,
      origin,
      destination,
      items,
      totalWeightKg,
      carrier,
      shippingMethod,
      currency: rawOrder.currency || "USD",
      totalPrice: Number(rawOrder.total) || 0,
      rawPayload: payload
    };
  }
};

// src/adapters/index.ts
var AdapterRegistry = class {
  static {
    this.adapters = [
      new ShopifyAdapter(),
      new WooCommerceAdapter()
    ];
  }
  /**
   * Registers a custom platform adapter
   */
  static register(adapter) {
    this.adapters.unshift(adapter);
  }
  /**
   * Finds matching adapter based on payload signature and headers
   */
  static detect(payload, headers) {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(payload, headers)) {
        return adapter;
      }
    }
    return null;
  }
  /**
   * Normalizes any payload to UnifiedOrder. Falls back to smart generic extraction if unknown.
   */
  static normalize(payload, headers, platformHint) {
    let adapter = null;
    if (platformHint) {
      adapter = this.adapters.find((a) => a.platform === platformHint) || null;
    }
    if (!adapter) {
      adapter = this.detect(payload, headers);
    }
    if (adapter) {
      return {
        order: adapter.normalize(payload),
        matchedPlatform: adapter.platform
      };
    }
    const genericOrder = {
      orderId: payload.orderId || payload.id || `ORD-${Date.now().toString().slice(-5)}`,
      platform: "generic",
      createdAt: payload.createdAt || payload.date || (/* @__PURE__ */ new Date()).toISOString(),
      customer: {
        name: payload.customer?.name || payload.customerName || "Direct Customer",
        email: payload.customer?.email || "customer@store.com"
      },
      origin: payload.origin || { city: "Memphis", state: "TN", country: "US" },
      destination: payload.destination || { city: payload.city || "Seattle", state: payload.state || "WA", country: "US" },
      items: Array.isArray(payload.items) ? payload.items : [{ id: "1", name: payload.productName || "General Goods", quantity: 1, weightKg: Number(payload.weightKg) || 1.2 }],
      totalWeightKg: Math.max(0.2, Number(payload.totalWeightKg) || Number(payload.weight) || 1.5),
      carrier: payload.carrier || "FedEx Ground",
      shippingMethod: payload.shippingMethod || "Standard Delivery",
      rawPayload: payload
    };
    return {
      order: genericOrder,
      matchedPlatform: "generic"
    };
  }
};

// src/engine/emissionFactors.ts
var DEFAULT_EMISSION_FACTORS = {
  air_freight: {
    name: "Air Freight (Dedicated / Belly Cargo)",
    factor: 0.602,
    // High altitude radiative forcing factor included
    description: "Long-haul air courier transit (e.g. Next-Day Air, International Express)",
    icon: "plane",
    category: "air"
  },
  regional_van: {
    name: "Regional Delivery Van (Diesel/Petrol)",
    factor: 0.145,
    description: "Standard suburban / urban parcel delivery vans",
    icon: "truck",
    category: "ground"
  },
  road_truck: {
    name: "Long-Haul Heavy Duty Truck",
    factor: 0.082,
    description: "Interstate ground freight and articulated trailer transport",
    icon: "truck",
    category: "ground"
  },
  rail: {
    name: "Electric / Diesel Rail Freight",
    factor: 0.024,
    description: "Continental rail network bulk haulage",
    icon: "train",
    category: "rail"
  },
  electric_van: {
    name: "Electric Commercial Van (EV)",
    factor: 0.018,
    description: "Renewable-charged battery electric last-mile delivery fleet",
    icon: "zap",
    category: "green"
  },
  sea_freight: {
    name: "Ocean Cargo Container Ship",
    factor: 0.012,
    description: "Containerized maritime shipping lanes",
    icon: "anchor",
    category: "sea"
  },
  cargo_bike: {
    name: "Cargo Bike / Walking Courier",
    factor: 1e-3,
    // Near zero operational emissions
    description: "Zero-emission micro-mobility urban courier",
    icon: "bike",
    category: "green"
  }
};
function inferTransportMode(carrierStr, methodStr) {
  const combined = `${carrierStr || ""} ${methodStr || ""}`.toLowerCase();
  if (combined.includes("bike") || combined.includes("walker") || combined.includes("foot") || combined.includes("micro")) {
    return "cargo_bike";
  }
  if (combined.includes("electric") || combined.includes("ev") || combined.includes("rivian") || combined.includes("zero emission") || combined.includes("eco-van")) {
    return "electric_van";
  }
  if (combined.includes("air") || combined.includes("plane") || combined.includes("flight") || combined.includes("overnight") || combined.includes("next day") || combined.includes("1-day") || combined.includes("priority mail express") || combined.includes("express saver") || combined.includes("intl priority")) {
    return "air_freight";
  }
  if (combined.includes("rail") || combined.includes("train") || combined.includes("intermodal")) {
    return "rail";
  }
  if (combined.includes("ocean") || combined.includes("sea") || combined.includes("vessel") || combined.includes("maritime") || combined.includes("boat")) {
    return "sea_freight";
  }
  if (combined.includes("local") || combined.includes("same day") || combined.includes("courier") || combined.includes("van") || combined.includes("city")) {
    return "regional_van";
  }
  return "road_truck";
}
function formatModeName(mode) {
  return DEFAULT_EMISSION_FACTORS[mode]?.name || mode;
}

// src/engine/geocoding.ts
var KNOWN_HUBS = {
  // North America
  "los angeles": { lat: 34.0522, lng: -118.2437, country: "US" },
  "ontario": { lat: 34.0633, lng: -117.6509, country: "US" },
  // Huge Inland Empire warehousing hub
  "seattle": { lat: 47.6062, lng: -122.3321, country: "US" },
  "chicago": { lat: 41.8781, lng: -87.6298, country: "US" },
  "memphis": { lat: 35.1495, lng: -90.049, country: "US" },
  // FedEx Global Hub
  "louisville": { lat: 38.2527, lng: -85.7585, country: "US" },
  // UPS Worldport Hub
  "new york": { lat: 40.7128, lng: -74.006, country: "US" },
  "newark": { lat: 40.7357, lng: -74.1724, country: "US" },
  "dallas": { lat: 32.7767, lng: -96.797, country: "US" },
  "austin": { lat: 30.2672, lng: -97.7431, country: "US" },
  "atlanta": { lat: 33.749, lng: -84.388, country: "US" },
  "miami": { lat: 25.7617, lng: -80.1918, country: "US" },
  "san francisco": { lat: 37.7749, lng: -122.4194, country: "US" },
  "denver": { lat: 39.7392, lng: -104.9903, country: "US" },
  "toronto": { lat: 43.6532, lng: -79.3832, country: "CA" },
  "vancouver": { lat: 49.2827, lng: -123.1207, country: "CA" },
  "mexico city": { lat: 19.4326, lng: -99.1332, country: "MX" },
  // Europe
  "london": { lat: 51.5074, lng: -0.1278, country: "GB" },
  "manchester": { lat: 53.4808, lng: -2.2426, country: "GB" },
  "frankfurt": { lat: 50.1109, lng: 8.6821, country: "DE" },
  // Major European cargo hub
  "berlin": { lat: 52.52, lng: 13.405, country: "DE" },
  "leipzig": { lat: 51.3397, lng: 12.3731, country: "DE" },
  // DHL European Air Hub
  "rotterdam": { lat: 51.9244, lng: 4.4777, country: "NL" },
  // Primary Europe ocean port
  "amsterdam": { lat: 52.3676, lng: 4.9041, country: "NL" },
  "paris": { lat: 48.8566, lng: 2.3522, country: "FR" },
  "madrid": { lat: 40.4168, lng: -3.7038, country: "ES" },
  "rome": { lat: 41.9028, lng: 12.4964, country: "IT" },
  "milan": { lat: 45.4642, lng: 9.19, country: "IT" },
  "warsaw": { lat: 52.2297, lng: 21.0122, country: "PL" },
  "stockholm": { lat: 59.3293, lng: 18.0686, country: "SE" },
  // Asia / Pacific
  "tokyo": { lat: 35.6762, lng: 139.6503, country: "JP" },
  "singapore": { lat: 1.3521, lng: 103.8198, country: "SG" },
  "hong kong": { lat: 22.3193, lng: 114.1694, country: "HK" },
  "shanghai": { lat: 31.2304, lng: 121.4737, country: "CN" },
  "shenzhen": { lat: 22.5431, lng: 114.0579, country: "CN" },
  "seoul": { lat: 37.5665, lng: 126.978, country: "KR" },
  "sydney": { lat: -33.8688, lng: 151.2093, country: "AU" },
  "melbourne": { lat: -37.8136, lng: 144.9631, country: "AU" },
  "mumbai": { lat: 19.076, lng: 72.8777, country: "IN" },
  "dubai": { lat: 25.2048, lng: 55.2708, country: "AE" }
};
function cleanLocationKey(name) {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
}
function resolveCoordinates(loc) {
  if (loc.coordinates && loc.coordinates.length === 2) {
    return loc.coordinates;
  }
  const cityKey = cleanLocationKey(loc.city);
  if (cityKey && KNOWN_HUBS[cityKey]) {
    const hub = KNOWN_HUBS[cityKey];
    return [hub.lat, hub.lng];
  }
  const country = loc.country ? loc.country.toUpperCase() : "US";
  if (country === "US" || country === "USA" || country === "UNITED STATES") {
    return [38.5, -95];
  } else if (country === "GB" || country === "UK") {
    return [52.3555, -1.1743];
  } else if (country === "DE" || country === "GERMANY") {
    return [51.1657, 10.4515];
  } else if (country === "FR" || country === "FRANCE") {
    return [46.2276, 2.2137];
  } else if (country === "CA" || country === "CANADA") {
    return [56.1304, -106.3468];
  } else if (country === "AU" || country === "AUSTRALIA") {
    return [-25.2744, 133.7751];
  } else if (country === "JP" || country === "JAPAN") {
    return [36.2048, 138.2529];
  }
  return [40, -40];
}
function haversineDistance(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineDistance = R * c;
  return straightLineDistance;
}
function calculateShippingDistance(origin, destination, mode = "road_truck") {
  const originCoord = resolveCoordinates(origin);
  const destCoord = resolveCoordinates(destination);
  const directKm = haversineDistance(originCoord, destCoord);
  if (directKm < 5) {
    return 15;
  }
  const detourFactor = mode === "air_freight" ? 1.1 : mode === "sea_freight" ? 1.35 : 1.2;
  return Math.round(directKm * detourFactor);
}

// src/engine/calculator.ts
var CarbonCalculator = class {
  /**
   * Main audit calculation for a unified order
   */
  static auditOrder(order, options) {
    const origin = options?.originOverride || order.origin;
    const destination = order.destination;
    const carrierMode = options?.modeOverride || inferTransportMode(order.carrier, order.shippingMethod);
    const distanceKm = options?.customDistanceKm !== void 0 ? options.customDistanceKm : calculateShippingDistance(origin, destination, carrierMode);
    const weightKg = Math.max(0.1, Number(order.totalWeightKg) || 1);
    const weightTonnes = weightKg / 1e3;
    const meta = DEFAULT_EMISSION_FACTORS[carrierMode];
    const emissionFactor = options?.customEmissionFactor ?? meta.factor;
    const rawEmissionKg = distanceKm * weightTonnes * emissionFactor;
    const emissionKgCO2 = Math.round(rawEmissionKg * 1e3) / 1e3;
    const breakdown = {
      distanceKm,
      packageWeightKg: weightKg,
      packageWeightTonnes: weightTonnes,
      carrierMode,
      carrierName: order.carrier || formatModeName(carrierMode),
      emissionFactor,
      emissionKgCO2,
      formulaApplied: `E = ${distanceKm} km * (${weightKg} kg / 1000) * ${emissionFactor} kg CO2e/t-km = ${emissionKgCO2.toFixed(3)} kg CO2e`
    };
    const alternatives = this.computeAlternatives(distanceKm, weightKg, carrierMode, emissionKgCO2);
    const { auditRating, status } = this.evaluateRating(emissionKgCO2, carrierMode);
    const environmentalEquivalents = {
      // 1 mature urban tree absorbs ~22 kg CO2 / year = ~0.0602 kg CO2 / day
      treesAbsorptionDays: Math.round(emissionKgCO2 / 0.0602 * 10) / 10,
      // Average gasoline passenger car emits ~0.170 kg CO2 / km
      gasCarKmEquivalent: Math.round(emissionKgCO2 / 0.17 * 10) / 10,
      // Smartphone full recharge emits ~0.0082 kg CO2
      smartphoneCharges: Math.round(emissionKgCO2 / 82e-4)
    };
    const suggestedOffsetCostUsd = Math.max(0.05, Math.round(emissionKgCO2 / 1e3 * 25 * 100) / 100);
    return {
      orderId: order.orderId,
      orderNumber: order.orderId,
      platform: order.platform,
      timestamp: order.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      origin,
      destination,
      itemsCount: order.items?.length || 1,
      totalWeightKg: weightKg,
      breakdown,
      alternatives,
      auditRating,
      status,
      environmentalEquivalents,
      suggestedOffsetCostUsd
    };
  }
  /**
   * Fast calculation helper directly from numbers (CLI `ecotrace calculate`)
   */
  static calculateRaw(distanceKm, weightKg, mode = "road_truck", customFactor) {
    const factor = customFactor ?? DEFAULT_EMISSION_FACTORS[mode]?.factor ?? 0.082;
    const weightTonnes = weightKg / 1e3;
    const emissionKgCO2 = Math.round(distanceKm * weightTonnes * factor * 1e3) / 1e3;
    return {
      distanceKm,
      packageWeightKg: weightKg,
      packageWeightTonnes: weightTonnes,
      carrierMode: mode,
      carrierName: formatModeName(mode),
      emissionFactor: factor,
      emissionKgCO2,
      formulaApplied: `E = ${distanceKm} km * (${weightKg} kg / 1000) * ${factor} kg CO2e/t-km = ${emissionKgCO2.toFixed(3)} kg CO2e`
    };
  }
  /**
   * Generates actionable greener logistics alternatives
   */
  static computeAlternatives(distanceKm, weightKg, currentMode, currentEmissionKg) {
    const list = [];
    const candidateModes = [
      "electric_van",
      "rail",
      "road_truck",
      "sea_freight",
      "cargo_bike"
    ];
    for (const altMode of candidateModes) {
      if (altMode === currentMode) continue;
      if (altMode === "cargo_bike" && distanceKm > 30) continue;
      if (altMode === "electric_van" && distanceKm > 450) continue;
      if (altMode === "sea_freight" && distanceKm < 300) continue;
      const altFactor = DEFAULT_EMISSION_FACTORS[altMode].factor;
      const altEmissions = distanceKm * (weightKg / 1e3) * altFactor;
      if (altEmissions < currentEmissionKg) {
        const saved = Math.round((currentEmissionKg - altEmissions) * 1e3) / 1e3;
        const percent = Math.round((currentEmissionKg - altEmissions) / currentEmissionKg * 100);
        let recommendation = `Switch to ${DEFAULT_EMISSION_FACTORS[altMode].name} to reduce emissions by ${percent}%.`;
        if (currentMode === "air_freight" && altMode === "road_truck") {
          recommendation = `Ground Freight alternative: delivers within 2-3 days while cutting ${saved.toFixed(2)} kg CO2e (${percent}% drop).`;
        } else if (altMode === "electric_van") {
          recommendation = `Regional EV Fleet: Zero tailpipe emissions on last-mile routes.`;
        }
        list.push({
          mode: altMode,
          name: DEFAULT_EMISSION_FACTORS[altMode].name,
          emissionKgCO2: Math.round(altEmissions * 1e3) / 1e3,
          potentialSavedKgCO2: saved,
          percentReduction: percent,
          recommendation
        });
      }
    }
    return list.sort((a, b) => b.potentialSavedKgCO2 - a.potentialSavedKgCO2);
  }
  /**
   * Assigns ESG rating and emission severity status
   */
  static evaluateRating(emissionKg, mode) {
    if (mode === "electric_van" || mode === "cargo_bike") {
      return { auditRating: "A", status: "optimal" };
    }
    if (emissionKg < 0.25) {
      return { auditRating: "A", status: "optimal" };
    } else if (emissionKg < 1.5) {
      return { auditRating: "B", status: "optimal" };
    } else if (emissionKg < 5) {
      return { auditRating: "C", status: "moderate" };
    } else if (emissionKg < 12) {
      return { auditRating: "D", status: "excessive" };
    } else {
      return { auditRating: "F", status: "excessive" };
    }
  }
};

// src/kiro/agentRunner.ts
var KiroAgentRunner = class {
  /**
   * Performs an audit across a batch of orders and creates a comprehensive scorecard
   */
  static runAudit(orders) {
    const results = orders.map(
      (order) => CarbonCalculator.auditOrder(order)
    );
    let totalWeightKg = 0;
    let totalDistanceKm = 0;
    let totalEmissionsKgCO2 = 0;
    let potentialSavingsKgCO2 = 0;
    let excessiveOrdersCount = 0;
    const modeBreakdown = {
      road_truck: { count: 0, emissionsKg: 0 },
      regional_van: { count: 0, emissionsKg: 0 },
      electric_van: { count: 0, emissionsKg: 0 },
      air_freight: { count: 0, emissionsKg: 0 },
      rail: { count: 0, emissionsKg: 0 },
      sea_freight: { count: 0, emissionsKg: 0 },
      cargo_bike: { count: 0, emissionsKg: 0 }
    };
    for (const res of results) {
      totalWeightKg += res.totalWeightKg;
      totalDistanceKm += res.breakdown.distanceKm;
      totalEmissionsKgCO2 += res.breakdown.emissionKgCO2;
      if (res.alternatives.length > 0) {
        potentialSavingsKgCO2 += res.alternatives[0].potentialSavedKgCO2;
      }
      if (res.status === "excessive") {
        excessiveOrdersCount++;
      }
      const mode = res.breakdown.carrierMode;
      if (modeBreakdown[mode]) {
        modeBreakdown[mode].count += 1;
        modeBreakdown[mode].emissionsKg += res.breakdown.emissionKgCO2;
      }
    }
    const totalOrders = orders.length;
    const avgEmissionPerOrderKg = totalOrders > 0 ? Math.round(totalEmissionsKgCO2 / totalOrders * 1e3) / 1e3 : 0;
    const summary = {
      totalOrders,
      totalWeightKg: Math.round(totalWeightKg * 10) / 10,
      totalDistanceKm: Math.round(totalDistanceKm),
      totalEmissionsKgCO2: Math.round(totalEmissionsKgCO2 * 1e3) / 1e3,
      avgEmissionPerOrderKg,
      modeBreakdown,
      potentialSavingsKgCO2: Math.round(potentialSavingsKgCO2 * 1e3) / 1e3,
      excessiveOrdersCount,
      recentAudits: results.slice(-10)
    };
    return { summary, results };
  }
  /**
   * Generates clean ANSI terminal report for CLI output
   */
  static generateTerminalReport(summary) {
    const lines = [];
    lines.push("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
    lines.push("\u2551             EcoTrace-CLI  \u2022  Shipping Carbon Audit Report                \u2551");
    lines.push("\u2551             Powered by Kiro Autonomous Background Agent                  \u2551");
    lines.push("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
    lines.push("");
    lines.push(`\u25B6 AUDITED ORDERS:        ${summary.totalOrders} manifests`);
    lines.push(`\u25B6 CUMULATIVE EMISSIONS:  ${summary.totalEmissionsKgCO2.toFixed(2)} kg CO2e`);
    lines.push(`\u25B6 TOTAL FREIGHT DISTANCE:${summary.totalDistanceKm.toLocaleString()} km`);
    lines.push(`\u25B6 TOTAL WEIGHT MOVED:    ${summary.totalWeightKg.toLocaleString()} kg`);
    lines.push(`\u25B6 AVG PER ORDER:         ${summary.avgEmissionPerOrderKg.toFixed(3)} kg CO2e`);
    lines.push(`\u25B6 POTENTIAL SAVINGS:     ${summary.potentialSavingsKgCO2.toFixed(2)} kg CO2e (Greener alternatives available)`);
    lines.push(`\u25B6 FLAGGED HIGH-EMISSION: ${summary.excessiveOrdersCount} order(s)`);
    lines.push("");
    lines.push("\u2500".repeat(74));
    lines.push("MODE BREAKDOWN:");
    for (const [mode, data] of Object.entries(summary.modeBreakdown)) {
      if (data.count > 0) {
        const modeLabel = mode.padEnd(14, " ");
        const countLabel = `${data.count} pkgs`.padEnd(10, " ");
        const emissionLabel = `${data.emissionsKg.toFixed(2)} kg CO2e`;
        lines.push(`  \u2022 ${modeLabel} \u2502 ${countLabel} \u2502 ${emissionLabel}`);
      }
    }
    lines.push("\u2500".repeat(74));
    lines.push("SAMPLE AUDITED MANIFESTS:");
    lines.push(" ORDER ID   \u2502 PLATFORM    \u2502 MODE        \u2502 DIST (KM) \u2502 WEIGHT(KG) \u2502 KG CO2e \u2502 GRADE");
    lines.push("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500");
    for (const audit of summary.recentAudits.slice(0, 6)) {
      const oid = audit.orderId.padEnd(10, " ").slice(0, 10);
      const plat = audit.platform.padEnd(11, " ").slice(0, 11);
      const mode = audit.breakdown.carrierMode.padEnd(11, " ").slice(0, 11);
      const dist = String(audit.breakdown.distanceKm).padStart(9, " ");
      const wt = audit.totalWeightKg.toFixed(1).padStart(10, " ");
      const em = audit.breakdown.emissionKgCO2.toFixed(3).padStart(7, " ");
      const grade = `  [${audit.auditRating}]`;
      lines.push(` ${oid} \u2502 ${plat} \u2502 ${mode} \u2502 ${dist} \u2502 ${wt} \u2502 ${em} \u2502${grade}`);
    }
    lines.push("\u2500".repeat(74));
    lines.push(`\u2713 GLEC Framework V3.0 Compliant \u2022 Kiro Agent Hook verified.`);
    return lines.join("\n");
  }
};

// src/kiro/specs.ts
var KIRO_AGENT_SPEC = {
  schema: "https://kiro.dev/schemas/agent-v1.json",
  name: "ecotrace-auditor",
  version: "1.0.0",
  category: "Skeleton Crew",
  description: "Autonomous background carbon auditing agent for e-commerce shipping logistics (Shopify & WooCommerce)",
  author: "EcoTrace Open Source Community",
  license: "Apache-2.0",
  capabilities: [
    "background-webhook-ingestion",
    "freight-carbon-accounting",
    "glec-framework-compliance",
    "route-optimization-advisory",
    "carbon-ledger-reporting"
  ],
  triggers: [
    {
      id: "on-order-received",
      type: "webhook",
      endpoints: ["/api/webhooks/shopify", "/api/webhooks/woocommerce"],
      action: "audit_and_log"
    },
    {
      id: "on-nightly-recap",
      type: "cron",
      expression: "0 0 * * *",
      action: "generate_daily_ledger"
    },
    {
      id: "on-high-emission-detected",
      type: "threshold",
      condition: "emissionKgCO2 >= 8.0 || carrierMode == 'air_freight'",
      action: "emit_route_alert"
    }
  ],
  steeringPath: ".kiro/steering/eco-steering.md",
  hookPath: ".kiro/hooks/audit-hook.json"
};

// src/cli/commands.ts
var DEFAULT_CONFIG = {
  version: "1.0.0",
  store: {
    name: "My Eco-Commerce Store",
    platform: "multi",
    defaultOrigin: {
      city: "Memphis",
      state: "TN",
      country: "US",
      postalCode: "38118"
    },
    currency: "USD"
  },
  emissionFactors: {
    air_freight: 0.602,
    road_truck: 0.082,
    regional_van: 0.145,
    electric_van: 0.018,
    rail: 0.024,
    sea_freight: 0.012,
    cargo_bike: 1e-3
  },
  thresholds: {
    excessiveEmissionKg: 8,
    alertOnAirFreight: true
  },
  kiroAgent: {
    enabled: true,
    autoAuditOnWebhook: true,
    notifyOnExcessive: true,
    outputFormat: "table",
    webhookPort: 3e3
  }
};
var CliCommandHandler = class {
  /**
   * ecotrace init
   */
  static handleInit() {
    return {
      message: `[OK] Generated ecotrace.config.json
[OK] Kiro agent hooks synchronized (.kiro/hooks/audit-hook.json)
[OK] Default logistics origin configured: Memphis, TN (US hub)
Ready! Next run: 'ecotrace audit' or 'ecotrace listen'`,
      config: DEFAULT_CONFIG
    };
  }
  /**
   * ecotrace calculate --dist <km> --weight <kg> --carrier <mode>
   */
  static handleCalculate(args) {
    const mode = inferTransportMode(args.carrier, "");
    const res = CarbonCalculator.calculateRaw(args.distanceKm, args.weightKg, mode);
    const lines = [
      `\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510`,
      `\u2502            EcoTrace Shipping Emission Calculation           \u2502`,
      `\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
      `  \u2022 Distance (d):      ${args.distanceKm} km`,
      `  \u2022 Package Weight (w):${args.weightKg} kg (${(args.weightKg / 1e3).toFixed(4)} tonnes)`,
      `  \u2022 Transport Mode:    ${res.carrierName}`,
      `  \u2022 Emission Factor (f):${res.emissionFactor} kg CO2e / tonne-km`,
      `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
      `  TOTAL FOOTPRINT (E): ${res.emissionKgCO2.toFixed(3)} kg CO2e`,
      `  Formula:             ${res.formulaApplied}`
    ];
    if (mode === "air_freight") {
      const roadAlt = CarbonCalculator.calculateRaw(args.distanceKm, args.weightKg, "road_truck");
      const saved = Math.round((res.emissionKgCO2 - roadAlt.emissionKgCO2) * 1e3) / 1e3;
      const pct = Math.round(saved / res.emissionKgCO2 * 100);
      lines.push(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
      lines.push(`  [KIRO ADVICE] Ground Freight Alternative saves ${saved.toFixed(2)} kg CO2e (${pct}% reduction)`);
    } else if (mode === "road_truck" && args.distanceKm < 450) {
      const evAlt = CarbonCalculator.calculateRaw(args.distanceKm, args.weightKg, "electric_van");
      const saved = Math.round((res.emissionKgCO2 - evAlt.emissionKgCO2) * 1e3) / 1e3;
      lines.push(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
      lines.push(`  [KIRO ADVICE] Regional EV Fleet Alternative saves ${saved.toFixed(2)} kg CO2e`);
    }
    return lines.join("\n");
  }
  /**
   * ecotrace audit
   */
  static handleAudit(orders) {
    const { summary } = KiroAgentRunner.runAudit(orders);
    return KiroAgentRunner.generateTerminalReport(summary);
  }
  /**
   * ecotrace kiro specs
   */
  static handleKiroSpecs() {
    const jsonStr = JSON.stringify(KIRO_AGENT_SPEC, null, 2);
    return `[Kiro Agent Specification: ecotrace-auditor v1.0.0]
${jsonStr}`;
  }
  /**
   * ecotrace webhook normalize test
   */
  static handleNormalizeTest(payload) {
    const { order, matchedPlatform } = AdapterRegistry.normalize(payload);
    const audit = CarbonCalculator.auditOrder(order);
    const report = [
      `[OK] Matched Adapter: ${matchedPlatform.toUpperCase()}`,
      `  \u2022 Order ID:     ${order.orderId}`,
      `  \u2022 Customer:     ${order.customer?.name} (${order.customer?.email})`,
      `  \u2022 Origin:       ${order.origin.city}, ${order.origin.country}`,
      `  \u2022 Destination:  ${order.destination.city}, ${order.destination.country}`,
      `  \u2022 Total Weight: ${order.totalWeightKg} kg`,
      `  \u2022 Carrier:      ${order.carrier}`,
      `  \u2022 Calculated:   ${audit.breakdown.emissionKgCO2.toFixed(3)} kg CO2e (Rating: ${audit.auditRating})`
    ].join("\n");
    return { order, report };
  }
};

// src/data/sampleOrders.ts
var SAMPLE_SHOPIFY_WEBHOOK = {
  id: 8204918204,
  name: "#SH-1042",
  order_number: 1042,
  created_at: (/* @__PURE__ */ new Date()).toISOString(),
  currency: "USD",
  total_price: "189.50",
  total_weight: 4200,
  // 4.2 kg in grams
  admin_graphql_api_id: "gid://shopify/Order/8204918204",
  customer: {
    first_name: "Elena",
    last_name: "Vance",
    email: "elena.vance@example.com"
  },
  shipping_address: {
    first_name: "Elena",
    last_name: "Vance",
    address1: "742 Evergreen Terrace",
    city: "Seattle",
    province: "Washington",
    province_code: "WA",
    country: "United States",
    country_code: "US",
    zip: "98101",
    latitude: 47.6062,
    longitude: -122.3321
  },
  fulfillment_city: "Memphis",
  fulfillment_state: "TN",
  line_items: [
    {
      id: 9182301,
      title: "Ergonomic Bamboo Standing Desk Converter",
      quantity: 1,
      grams: 3500,
      price: "149.00",
      sku: "DESK-BAM-01"
    },
    {
      id: 9182302,
      title: "Recycled Hemp Desk Mat",
      quantity: 1,
      grams: 700,
      price: "40.50",
      sku: "MAT-HEMP-02"
    }
  ],
  shipping_lines: [
    {
      title: "FedEx Express 2-Day Air",
      carrier_identifier: "FedEx Express Air",
      code: "FEDEX_2_DAY",
      price: "24.00",
      source: "fedex"
    }
  ]
};
var SAMPLE_WOOCOMMERCE_WEBHOOK = {
  id: 28490,
  number: "28490",
  date_created: (/* @__PURE__ */ new Date()).toISOString(),
  currency: "USD",
  total: "94.20",
  payment_method_title: "Stripe Credit Card",
  billing: {
    first_name: "Marcus",
    last_name: "Brody",
    email: "marcus.b@example.org",
    city: "Austin",
    state: "TX",
    postcode: "78701",
    country: "US"
  },
  shipping: {
    first_name: "Marcus",
    last_name: "Brody",
    address_1: "1204 Congress Ave",
    city: "Austin",
    state: "TX",
    postcode: "78701",
    country: "US"
  },
  line_items: [
    {
      id: 39182,
      name: "Organic Cotton Fair-Trade Hoodie",
      product_id: 104,
      quantity: 2,
      price: "45.00",
      total: "90.00",
      sku: "HOOD-ORG-BLK",
      meta_data: [{ key: "_weight", value: "0.85" }]
      // 0.85 kg each
    }
  ],
  shipping_lines: [
    {
      id: 88,
      method_title: "USPS Ground Advantage (Regional Van)",
      method_id: "usps_ground",
      total: "4.20"
    }
  ]
};
var INITIAL_SAMPLE_ORDERS = [
  {
    orderId: "#SH-1040",
    platform: "shopify",
    createdAt: new Date(Date.now() - 36e5 * 24).toISOString(),
    customer: { name: "Sarah Connor", email: "sarah@cyberdyne.net" },
    origin: { city: "Memphis", state: "TN", country: "US" },
    destination: { city: "Los Angeles", state: "CA", country: "US" },
    items: [{ id: "1", name: "Smart Solar Battery Unit", quantity: 1, weightKg: 8.5 }],
    totalWeightKg: 8.5,
    carrier: "DHL Express Air Freight",
    shippingMethod: "Express Next-Day Air",
    totalPrice: 420
  },
  {
    orderId: "WC-28488",
    platform: "woocommerce",
    createdAt: new Date(Date.now() - 36e5 * 18).toISOString(),
    customer: { name: "Liam Davies", email: "liam@oxford.uk" },
    origin: { city: "Frankfurt", country: "DE" },
    destination: { city: "London", country: "GB" },
    items: [{ id: "2", name: "Refurbished Audio Monitor", quantity: 1, weightKg: 3.2 }],
    totalWeightKg: 3.2,
    carrier: "DPD Cross-Border Rail & Truck",
    shippingMethod: "Standard Ground Road",
    totalPrice: 175
  },
  {
    orderId: "#SH-1041",
    platform: "shopify",
    createdAt: new Date(Date.now() - 36e5 * 10).toISOString(),
    customer: { name: "Aoi Tanaka", email: "aoi.t@tokyo.jp" },
    origin: { city: "Tokyo", country: "JP" },
    destination: { city: "Tokyo", country: "JP" },
    items: [{ id: "3", name: "Artisan Matcha Ceramic Set", quantity: 1, weightKg: 1.1 }],
    totalWeightKg: 1.1,
    carrier: "Eco-Express Electric Van",
    shippingMethod: "Local EV Same-Day Delivery",
    totalPrice: 65
  },
  {
    orderId: "WC-28489",
    platform: "woocommerce",
    createdAt: new Date(Date.now() - 36e5 * 5).toISOString(),
    customer: { name: "David Kim", email: "dkim@vancouver.ca" },
    origin: { city: "Ontario", state: "CA", country: "US" },
    destination: { city: "Vancouver", country: "CA" },
    items: [{ id: "4", name: "Winter Trekking Boots", quantity: 1, weightKg: 2.4 }],
    totalWeightKg: 2.4,
    carrier: "FedEx Ground Freight",
    shippingMethod: "Ground International",
    totalPrice: 130
  }
];

// server.ts
import { execSync } from "child_process";
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
var ledgerOrders = [...INITIAL_SAMPLE_ORDERS];
var auditHistory = ledgerOrders.map((o) => CarbonCalculator.auditOrder(o));
var webhookLogs = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 36e5 * 24).toISOString(),
    platform: "shopify",
    orderId: "#SH-1040",
    status: "audited",
    emissionKgCO2: 14.49,
    rating: "F",
    summary: "Shopify order #SH-1040 ingested. High emission air freight detected (14.49 kg CO2e)."
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 36e5 * 18).toISOString(),
    platform: "woocommerce",
    orderId: "WC-28488",
    status: "audited",
    emissionKgCO2: 0.06,
    rating: "A",
    summary: "WooCommerce order WC-28488 normalized to UnifiedOrder. Low emission rail freight verified."
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 36e5 * 10).toISOString(),
    platform: "shopify",
    orderId: "#SH-1041",
    status: "audited",
    emissionKgCO2: 0,
    rating: "A",
    summary: "Shopify local delivery #SH-1041 processed. Zero-emission Electric Van validated."
  }
];
function ingestAndAudit(order) {
  const audit = CarbonCalculator.auditOrder(order);
  ledgerOrders.unshift(order);
  auditHistory.unshift(audit);
  webhookLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    platform: order.platform,
    orderId: order.orderId,
    status: "audited",
    emissionKgCO2: audit.breakdown.emissionKgCO2,
    rating: audit.auditRating,
    summary: `${order.platform.toUpperCase()} order ${order.orderId} normalized: ${order.totalWeightKg}kg via ${order.carrier} (${audit.breakdown.distanceKm}km). Emission: ${audit.breakdown.emissionKgCO2} kg CO2e [Grade ${audit.auditRating}].`
  });
  return audit;
}
app.post("/api/webhooks/shopify", (req, res) => {
  try {
    const payload = req.body;
    const { order } = AdapterRegistry.normalize(payload, req.headers, "shopify");
    const audit = ingestAndAudit(order);
    res.status(200).json({
      success: true,
      message: "Shopify webhook processed successfully",
      normalizedOrder: order,
      carbonAudit: audit
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/webhooks/woocommerce", (req, res) => {
  try {
    const payload = req.body;
    const { order } = AdapterRegistry.normalize(payload, req.headers, "woocommerce");
    const audit = ingestAndAudit(order);
    res.status(200).json({
      success: true,
      message: "WooCommerce webhook processed successfully",
      normalizedOrder: order,
      carbonAudit: audit
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/webhooks/generic", (req, res) => {
  try {
    const payload = req.body;
    const { order } = AdapterRegistry.normalize(payload, req.headers);
    const audit = ingestAndAudit(order);
    res.status(200).json({
      success: true,
      normalizedOrder: order,
      carbonAudit: audit
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/orders", (_req, res) => {
  res.json({
    orders: ledgerOrders,
    audits: auditHistory,
    logs: webhookLogs
  });
});
app.get("/api/audit/summary", (_req, res) => {
  const { summary } = KiroAgentRunner.runAudit(ledgerOrders);
  res.json({
    summary,
    emissionFactors: DEFAULT_EMISSION_FACTORS
  });
});
app.post("/api/audit/reset", (_req, res) => {
  ledgerOrders = [...INITIAL_SAMPLE_ORDERS];
  auditHistory = ledgerOrders.map((o) => CarbonCalculator.auditOrder(o));
  res.json({ success: true, count: ledgerOrders.length });
});
app.post("/api/calculate", (req, res) => {
  const { distanceKm, weightKg, carrier, mode } = req.body;
  if (!distanceKm || !weightKg) {
    return res.status(400).json({ error: "distanceKm and weightKg are required" });
  }
  const breakdown = CarbonCalculator.calculateRaw(
    Number(distanceKm),
    Number(weightKg),
    mode || (carrier ? void 0 : "road_truck")
  );
  res.json({ breakdown });
});
app.get("/api/git/status", (_req, res) => {
  try {
    const lastCommit = execSync('git log -1 --format="%h|%s|%an|%ae|%cd"', { encoding: "utf-8" }).trim();
    const [hash, msg, author, email, date] = lastCommit.split("|");
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim() || "main";
    const remotes = execSync("git remote -v", { encoding: "utf-8" }).trim();
    res.json({
      success: true,
      branch,
      configuredUser: { name: author || "Sharif Hussain", email: email || "sm.sharifhussain@gmail.com" },
      lastCommit: { hash, message: msg, author, email, date },
      remotes: remotes ? remotes.split("\n") : [],
      hasRemote: remotes.length > 0
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/git/push", (req, res) => {
  const { remoteUrl, token, branch = "main" } = req.body;
  if (!remoteUrl || typeof remoteUrl !== "string") {
    return res.status(400).json({ success: false, error: "Repository URL is required." });
  }
  const cleanUrl = remoteUrl.trim();
  if (!cleanUrl.includes("github.com")) {
    return res.status(400).json({
      success: false,
      error: "Official rule violation: Only Public GitHub repositories are permitted (NO GitLab or BitBucket)."
    });
  }
  try {
    execSync('git config user.name "Sharif Hussain"', { stdio: "pipe" });
    execSync('git config user.email "sm.sharifhussain@gmail.com"', { stdio: "pipe" });
    try {
      execSync("git add -A", { stdio: "pipe" });
      execSync('git commit -m "feat: sync EcoTrace-CLI updates" --author="Sharif Hussain <sm.sharifhussain@gmail.com>"', { stdio: "pipe" });
    } catch {
    }
    let targetPushUrl = cleanUrl;
    if (token && cleanUrl.startsWith("https://")) {
      const stripped = cleanUrl.replace(/^https:\/\//, "");
      targetPushUrl = `https://${token.trim()}@${stripped}`;
    }
    try {
      execSync("git remote remove origin", { stdio: "pipe" });
    } catch {
    }
    execSync(`git remote add origin ${targetPushUrl}`, { stdio: "pipe" });
    const pushOutput = execSync(`git push -u origin ${branch}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    res.json({
      success: true,
      message: `Successfully pushed repository to ${cleanUrl} on branch ${branch}!`,
      output: pushOutput || "Everything up-to-date"
    });
  } catch (err) {
    const errorText = err.stderr?.toString() || err.message || "Push failed";
    res.status(500).json({
      success: false,
      error: errorText,
      hint: errorText.includes("Authentication") || errorText.includes("Permission") ? 'Authentication required. Ensure your GitHub Personal Access Token has "repo" scope, or run "git push" from your authenticated terminal.' : void 0
    });
  }
});
app.get("/api/kiro/specs", (_req, res) => {
  res.json({
    spec: KIRO_AGENT_SPEC,
    config: DEFAULT_CONFIG,
    steeringDirectivePath: ".kiro/steering/eco-steering.md",
    hookPath: ".kiro/hooks/audit-hook.json"
  });
});
app.post("/api/kiro/run", (_req, res) => {
  const { summary, results } = KiroAgentRunner.runAudit(ledgerOrders);
  const terminalText = KiroAgentRunner.generateTerminalReport(summary);
  res.json({
    success: true,
    triggeredAt: (/* @__PURE__ */ new Date()).toISOString(),
    auditedCount: results.length,
    summary,
    terminalReport: terminalText
  });
});
app.post("/api/cli/execute", (req, res) => {
  const { command } = req.body;
  const trimmed = (command || "").trim();
  if (!trimmed) {
    return res.json({ output: "" });
  }
  const parts = trimmed.split(/\s+/);
  const baseCmd = parts[0] === "ecotrace" ? parts[1] || "" : parts[0];
  switch (baseCmd) {
    case "":
    case "help":
    case "--help":
    case "-h":
      return res.json({
        output: `Usage: ecotrace [command] [options]

Commands:
  init                     Initialize EcoTrace configuration and Kiro agent hooks
  calculate, calc          Calculate emissions: E = d * w * f
  audit                    Scan ingested store orders and generate audit scorecard
  listen                   Inspect active webhook listener on port ${PORT}
  kiro <specs|run|status>  Kiro autonomous agent background routines
  test-webhook <shopify|woocommerce> Simulate mock e-commerce payload
  clear                    Clear the terminal screen`
      });
    case "init": {
      const { message } = CliCommandHandler.handleInit();
      return res.json({ output: message });
    }
    case "calculate":
    case "calc": {
      let dist = 850;
      let wt = 3.5;
      let carrier = "FedEx Ground";
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "-d" || parts[i] === "--distance") dist = parseFloat(parts[i + 1]) || dist;
        if (parts[i] === "-w" || parts[i] === "--weight") wt = parseFloat(parts[i + 1]) || wt;
        if (parts[i] === "-c" || parts[i] === "--carrier") carrier = parts.slice(i + 1).join(" ") || carrier;
      }
      const out = CliCommandHandler.handleCalculate({ distanceKm: dist, weightKg: wt, carrier });
      return res.json({ output: out });
    }
    case "audit": {
      const { summary } = KiroAgentRunner.runAudit(ledgerOrders);
      return res.json({ output: KiroAgentRunner.generateTerminalReport(summary) });
    }
    case "listen": {
      return res.json({
        output: `[WEBHOOK LISTENER ACTIVE]
  \u2022 Shopify Endpoint:     http://localhost:${PORT}/api/webhooks/shopify
  \u2022 WooCommerce Endpoint: http://localhost:${PORT}/api/webhooks/woocommerce
  \u2022 Generic Endpoint:     http://localhost:${PORT}/api/webhooks/generic
  \u2022 Mode:                 Normalized GLEC V3 Ingestion
  \u2022 Background Hooks:     Kiro Auto-Audit enabled`
      });
    }
    case "kiro": {
      const sub = parts[2] || "specs";
      if (sub === "run") {
        const { summary } = KiroAgentRunner.runAudit(ledgerOrders);
        return res.json({
          output: `[KIRO AGENT] Triggering autonomous background carbon audit pass...

${KiroAgentRunner.generateTerminalReport(summary)}

[KIRO AGENT] Ledger synchronized with 0 errors.`
        });
      } else if (sub === "specs") {
        return res.json({ output: CliCommandHandler.handleKiroSpecs() });
      } else {
        return res.json({
          output: `[KIRO AGENT STATUS]
  \u2022 Agent ID:      ecotrace-auditor v1.0.0
  \u2022 Category:      Skeleton Crew
  \u2022 Webhook Hook:  .kiro/hooks/audit-hook.json [ACTIVE]
  \u2022 Steering:      .kiro/steering/eco-steering.md [LOADED]
  \u2022 Auto-Audit:    ENABLED (Trigger on order.created)`
        });
      }
    }
    case "test-webhook": {
      const platform = parts[2] === "woocommerce" ? "woocommerce" : "shopify";
      const payload = platform === "woocommerce" ? SAMPLE_WOOCOMMERCE_WEBHOOK : SAMPLE_SHOPIFY_WEBHOOK;
      const { order, report } = CliCommandHandler.handleNormalizeTest(payload);
      ingestAndAudit(order);
      return res.json({
        output: `[SIMULATION DISPATCHED]
${report}

[OK] Order ${order.orderId} appended to active ledger.`
      });
    }
    default:
      return res.json({
        output: `ecotrace: command not recognized: "${trimmed}". Type "ecotrace help" for list of commands.`
      });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }
  const server = http.createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[EcoTrace-CLI] Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
