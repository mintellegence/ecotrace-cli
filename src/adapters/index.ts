/**
 * E-Commerce Adapter Registry
 * Dispatches raw payloads to the appropriate platform adapter
 */

import { ECommercePlatform, UnifiedOrder } from '../types/index.ts';
import { PlatformAdapter } from './base.ts';
import { ShopifyAdapter } from './shopify.ts';
import { WooCommerceAdapter } from './woocommerce.ts';

export class AdapterRegistry {
  private static adapters: PlatformAdapter[] = [
    new ShopifyAdapter(),
    new WooCommerceAdapter(),
  ];

  /**
   * Registers a custom platform adapter
   */
  public static register(adapter: PlatformAdapter): void {
    this.adapters.unshift(adapter);
  }

  /**
   * Finds matching adapter based on payload signature and headers
   */
  public static detect(
    payload: any,
    headers?: Record<string, string | string[] | undefined>
  ): PlatformAdapter | null {
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
  public static normalize(
    payload: any,
    headers?: Record<string, string | string[] | undefined>,
    platformHint?: ECommercePlatform
  ): { order: UnifiedOrder; matchedPlatform: ECommercePlatform } {
    let adapter: PlatformAdapter | null = null;

    if (platformHint) {
      adapter = this.adapters.find((a) => a.platform === platformHint) || null;
    }

    if (!adapter) {
      adapter = this.detect(payload, headers);
    }

    if (adapter) {
      return {
        order: adapter.normalize(payload),
        matchedPlatform: adapter.platform,
      };
    }

    // Generic fallback for custom manual payloads or JSON inputs
    const genericOrder: UnifiedOrder = {
      orderId: payload.orderId || payload.id || `ORD-${Date.now().toString().slice(-5)}`,
      platform: 'generic',
      createdAt: payload.createdAt || payload.date || new Date().toISOString(),
      customer: {
        name: payload.customer?.name || payload.customerName || 'Direct Customer',
        email: payload.customer?.email || 'customer@store.com',
      },
      origin: payload.origin || { city: 'Memphis', state: 'TN', country: 'US' },
      destination: payload.destination || { city: payload.city || 'Seattle', state: payload.state || 'WA', country: 'US' },
      items: Array.isArray(payload.items)
        ? payload.items
        : [{ id: '1', name: payload.productName || 'General Goods', quantity: 1, weightKg: Number(payload.weightKg) || 1.2 }],
      totalWeightKg: Math.max(0.2, Number(payload.totalWeightKg) || Number(payload.weight) || 1.5),
      carrier: payload.carrier || 'FedEx Ground',
      shippingMethod: payload.shippingMethod || 'Standard Delivery',
      rawPayload: payload,
    };

    return {
      order: genericOrder,
      matchedPlatform: 'generic',
    };
  }
}
