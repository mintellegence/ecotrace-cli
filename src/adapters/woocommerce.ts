/**
 * WooCommerce Order Webhook Adapter
 * Normalizes WooCommerce order.created and order.updated payloads
 */

import { GeoLocation, OrderItem, UnifiedOrder } from '../types/index.ts';
import { PlatformAdapter } from './base.ts';

export class WooCommerceAdapter implements PlatformAdapter {
  public platform: 'woocommerce' = 'woocommerce';
  public displayName = 'WooCommerce';

  public canHandle(payload: any, headers?: Record<string, string | string[] | undefined>): boolean {
    if (!payload || typeof payload !== 'object') return false;

    // Check WooCommerce webhook HTTP headers
    if (headers) {
      const topic = headers['x-wc-webhook-topic'] || headers['X-WC-Webhook-Topic'];
      const source = headers['x-wc-webhook-source'] || headers['X-WC-Webhook-Source'];
      if (topic || source) return true;
    }

    // Inspect payload structure typical of WooCommerce REST API v3
    if (payload.payment_method_title !== undefined && payload.billing && payload.shipping) {
      return true;
    }

    if (payload.customer_id !== undefined && payload.shipping_lines !== undefined && payload.line_items) {
      return true;
    }

    return false;
  }

  public normalize(payload: any): UnifiedOrder {
    const rawOrder = payload;

    // 1. Order Identification
    const orderId = rawOrder.number ? `WC-${rawOrder.number}` : `WC-${rawOrder.id || Math.floor(Math.random() * 80000 + 10000)}`;

    // 2. Customer
    const billing = rawOrder.billing || {};
    const shipping = rawOrder.shipping || {};
    const customer = {
      name: [shipping.first_name || billing.first_name, shipping.last_name || billing.last_name].filter(Boolean).join(' ') || 'WooCommerce Customer',
      email: billing.email || 'customer@example.com',
    };

    // 3. Destination Address
    const destination: GeoLocation = {
      city: shipping.city || billing.city || 'Austin',
      state: shipping.state || billing.state || 'TX',
      country: shipping.country || billing.country || 'US',
      postalCode: shipping.postcode || billing.postcode || '',
    };

    // 4. Origin (Store Warehouse default)
    const origin: GeoLocation = {
      city: 'Chicago',
      state: 'IL',
      country: 'US',
      postalCode: '60601',
    };

    // 5. Line items & Weights (WooCommerce items typically report in kg or lbs; we normalize to kg)
    let totalComputedWeight = 0;
    const items: OrderItem[] = Array.isArray(rawOrder.line_items)
      ? rawOrder.line_items.map((li: any) => {
          // Check metadata or default estimation
          let itemWeightKg = 0.5; // default fallback
          if (li.meta_data && Array.isArray(li.meta_data)) {
            const weightMeta = li.meta_data.find((m: any) => m.key === '_weight' || m.key === 'weight');
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
            name: li.name || 'WooCommerce Product',
            quantity: qty,
            weightKg: Math.round(lineTotalWeight * 100) / 100,
            price: Number(li.price) || (Number(li.total) / qty) || 0,
            sku: li.sku || '',
          };
        })
      : [];

    const totalWeightKg = Math.max(0.5, Math.round(totalComputedWeight * 100) / 100);

    // 6. Carrier and Shipping Method
    const shippingLine = Array.isArray(rawOrder.shipping_lines) && rawOrder.shipping_lines.length > 0
      ? rawOrder.shipping_lines[0]
      : null;

    const carrier =
      shippingLine?.method_title ||
      shippingLine?.method_id ||
      'Standard Courier Service';

    const shippingMethod = shippingLine?.method_title || 'Flat Rate Shipping';

    return {
      orderId,
      platform: 'woocommerce',
      createdAt: rawOrder.date_created || new Date().toISOString(),
      customer,
      origin,
      destination,
      items,
      totalWeightKg,
      carrier,
      shippingMethod,
      currency: rawOrder.currency || 'USD',
      totalPrice: Number(rawOrder.total) || 0,
      rawPayload: payload,
    };
  }
}
