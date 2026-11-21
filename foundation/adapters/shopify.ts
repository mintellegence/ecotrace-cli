/**
 * Shopify Order Webhook Adapter
 * Normalizes Shopify orders/create and orders/fulfilled webhooks
 */

import { getDefaultOrigin } from '../config/origin.ts';
import { GeoLocation, OrderItem, UnifiedOrder } from '../types/index.ts';
import { PlatformAdapter } from './base.ts';

export class ShopifyAdapter implements PlatformAdapter {
  public platform: 'shopify' = 'shopify';
  public displayName = 'Shopify';

  public canHandle(payload: any, headers?: Record<string, string | string[] | undefined>): boolean {
    if (!payload || typeof payload !== 'object') return false;

    // Check Shopify webhook HTTP header
    if (headers) {
      const topic = headers['x-shopify-topic'] || headers['X-Shopify-Topic'];
      const shopDomain = headers['x-shopify-shop-domain'] || headers['X-Shopify-Shop-Domain'];
      if (topic || shopDomain) return true;
    }

    // Inspect payload structure
    if (payload.admin_graphql_api_id && String(payload.admin_graphql_api_id).includes('Order')) {
      return true;
    }

    if (payload.order_number !== undefined && Array.isArray(payload.line_items) && payload.shipping_address) {
      return true;
    }

    return false;
  }

  public normalize(payload: any): UnifiedOrder {
    const rawOrder = payload.order || payload;

    // 1. Order Identification
    const orderId =
      rawOrder.name ||
      (rawOrder.order_number ? `#${rawOrder.order_number}` : `SH-${rawOrder.id || Math.floor(Math.random() * 90000 + 10000)}`);

    // 2. Customer
    const cust = rawOrder.customer || {};
    const customer = {
      name: [cust.first_name, cust.last_name].filter(Boolean).join(' ') || rawOrder.shipping_address?.name || 'Shopify Customer',
      email: cust.email || rawOrder.email || 'customer@example.com',
    };

    // 3. Destination Address
    const shipAddr = rawOrder.shipping_address || rawOrder.billing_address || {};
    const destination: GeoLocation = {
      city: shipAddr.city || 'Los Angeles',
      state: shipAddr.province || shipAddr.province_code || 'CA',
      country: shipAddr.country_code || shipAddr.country || 'US',
      postalCode: shipAddr.zip || '',
      coordinates:
        shipAddr.latitude && shipAddr.longitude
          ? [Number(shipAddr.latitude), Number(shipAddr.longitude)]
          : undefined,
    };

    // 4. Origin (Store Warehouse / Fulfillment Hub)
    // Shopify order webhooks do not carry the warehouse location. Use the configured
    // origin (ECOTRACE_ORIGIN_*); sample payloads may override via fulfillment_city.
    const configured = getDefaultOrigin();
    const origin: GeoLocation = rawOrder.fulfillment_city
      ? {
          city: String(rawOrder.fulfillment_city),
          state: rawOrder.fulfillment_state ? String(rawOrder.fulfillment_state) : undefined,
          country: configured.country,
        }
      : configured;

    // 5. Line items & Weights (Shopify uses grams)
    let computedWeightGrams = 0;
    let weightEstimated = false;
    const items: OrderItem[] = Array.isArray(rawOrder.line_items)
      ? rawOrder.line_items.map((li: any) => {
          const providedGrams = Number(li.grams);
          if (!(providedGrams > 0)) weightEstimated = true;
          const itemGrams = providedGrams > 0 ? providedGrams : 450; // estimate 450g if unset
          const qty = Number(li.quantity) || 1;
          const lineTotalGrams = itemGrams * qty;
          computedWeightGrams += lineTotalGrams;

          return {
            id: String(li.id || li.sku || Math.random()),
            name: li.title || li.name || 'Shopify Product',
            quantity: qty,
            weightKg: Math.round((lineTotalGrams / 1000) * 100) / 100,
            price: Number(li.price) || 0,
            sku: li.sku || '',
          };
        })
      : [];

    const hasOrderWeight = Number(rawOrder.total_weight) > 0;
    let totalWeightKg: number;
    if (hasOrderWeight) {
      totalWeightKg = Math.round((Number(rawOrder.total_weight) / 1000) * 1000) / 1000;
      weightEstimated = false; // the platform-reported order weight is authoritative
    } else if (computedWeightGrams > 0) {
      totalWeightKg = Math.round((computedWeightGrams / 1000) * 1000) / 1000;
    } else {
      totalWeightKg = 0.5; // no weight information at all: assume 0.5 kg and flag it
      weightEstimated = true;
    }

    // 6. Carrier and Shipping Line
    const shippingLine = Array.isArray(rawOrder.shipping_lines) && rawOrder.shipping_lines.length > 0
      ? rawOrder.shipping_lines[0]
      : null;

    // The title ("UPS Next Day Air") carries the service level; source/carrier_identifier
    // are internal ids ("ups_shipping") and only used as a fallback.
    const carrier = String(
      shippingLine?.title || shippingLine?.source || shippingLine?.carrier_identifier || 'Standard Ground Delivery'
    ).slice(0, 120);

    const shippingMethod = shippingLine?.title || 'Standard Shipping';

    return {
      orderId,
      platform: 'shopify',
      createdAt: rawOrder.created_at || new Date().toISOString(),
      customer,
      origin,
      destination,
      items,
      totalWeightKg,
      weightEstimated,
      carrier,
      shippingMethod,
      currency: rawOrder.currency || 'USD',
      totalPrice: Number(rawOrder.total_price) || 0,
      rawPayload: payload,
    };
  }
}
