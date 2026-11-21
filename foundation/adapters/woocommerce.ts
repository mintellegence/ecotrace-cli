/**
 * WooCommerce Order Webhook Adapter
 * Normalizes WooCommerce order.created and order.updated payloads
 */

import { getDefaultOrigin } from '../config/origin.ts';
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

    // 4. Origin (Store Warehouse): not present in WooCommerce webhooks, so use configured origin
    const origin: GeoLocation = getDefaultOrigin();

    // 5. Line items & Weights (WooCommerce items typically report in kg; we normalize to kg)
    let totalComputedWeight = 0;
    let weightEstimated = false;
    const items: OrderItem[] = Array.isArray(rawOrder.line_items)
      ? rawOrder.line_items.map((li: any) => {
          // Prefer an explicit weight (meta_data or li.weight); otherwise estimate and flag it
          let itemWeightKg = 0;
          const weightMeta = Array.isArray(li.meta_data)
            ? li.meta_data.find((m: any) => m.key === '_weight' || m.key === 'weight')
            : undefined;
          if (weightMeta && Number(weightMeta.value) > 0) {
            itemWeightKg = Number(weightMeta.value);
          } else if (Number(li.weight) > 0) {
            itemWeightKg = Number(li.weight);
          }
          if (!(itemWeightKg > 0)) {
            itemWeightKg = 0.5; // estimate
            weightEstimated = true;
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

    let totalWeightKg = Math.round(totalComputedWeight * 1000) / 1000;
    if (!(totalWeightKg > 0)) {
      totalWeightKg = 0.5; // no line items: assume 0.5 kg and flag it
      weightEstimated = true;
    }

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
      weightEstimated,
      carrier,
      shippingMethod,
      currency: rawOrder.currency || 'USD',
      totalPrice: Number(rawOrder.total) || 0,
      rawPayload: payload,
    };
  }
}
