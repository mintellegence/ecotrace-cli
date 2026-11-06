/**
 * Shopify Order Webhook Adapter
 * Normalizes Shopify orders/create and orders/fulfilled webhooks
 */

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
    // In Shopify, location_id or default warehouse coordinates
    const origin: GeoLocation = {
      city: rawOrder.fulfillment_city || 'Memphis', // Major fulfillment nexus
      state: rawOrder.fulfillment_state || 'TN',
      country: 'US',
      postalCode: '38118',
    };

    // 5. Line items & Weights (Shopify uses grams)
    let computedWeightGrams = 0;
    const items: OrderItem[] = Array.isArray(rawOrder.line_items)
      ? rawOrder.line_items.map((li: any) => {
          const itemGrams = Number(li.grams) || 450; // default 450g if unset
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

    const totalWeightKg =
      rawOrder.total_weight && Number(rawOrder.total_weight) > 0
        ? Math.round((Number(rawOrder.total_weight) / 1000) * 100) / 100
        : Math.max(0.5, Math.round((computedWeightGrams / 1000) * 100) / 100);

    // 6. Carrier and Shipping Line
    const shippingLine = Array.isArray(rawOrder.shipping_lines) && rawOrder.shipping_lines.length > 0
      ? rawOrder.shipping_lines[0]
      : null;

    const carrier =
      shippingLine?.carrier_identifier ||
      shippingLine?.source ||
      shippingLine?.title ||
      'Standard Ground Delivery';

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
      carrier,
      shippingMethod,
      currency: rawOrder.currency || 'USD',
      totalPrice: Number(rawOrder.total_price) || 0,
      rawPayload: payload,
    };
  }
}
