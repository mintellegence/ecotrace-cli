/**
 * E-Commerce Adapter Registry
 * Dispatches raw payloads to the appropriate platform adapter
 */

import { getDefaultOrigin } from '../config/origin.ts';
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
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Payload must be a JSON object.');
    }

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
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Payload must be a JSON object.');
    }

    const str = (v: unknown, max = 200): string | undefined =>
      typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, max) : undefined;

    const givenWeight = Number(payload.totalWeightKg ?? payload.weightKg ?? payload.weight);
    const weightKnown = Number.isFinite(givenWeight) && givenWeight > 0;
    const totalWeightKg = weightKnown ? givenWeight : 1.5;

    const dest = payload.destination && typeof payload.destination === 'object' ? payload.destination : null;
    const orig = payload.origin && typeof payload.origin === 'object' ? payload.origin : null;

    const genericOrder: UnifiedOrder = {
      orderId: str(payload.orderId) || str(payload.id) || `ORD-${Date.now().toString().slice(-5)}`,
      platform: 'generic',
      createdAt: str(payload.createdAt, 40) || str(payload.date, 40) || new Date().toISOString(),
      customer: {
        name: str(payload.customer?.name) || str(payload.customerName) || 'Direct Customer',
        email: str(payload.customer?.email) || 'customer@store.com',
      },
      origin: orig
        ? { city: str(orig.city) || 'Warehouse', state: str(orig.state), country: str(orig.country) || 'US', coordinates: orig.coordinates }
        : getDefaultOrigin(),
      destination: dest
        ? { city: str(dest.city) || 'Unknown', state: str(dest.state), country: str(dest.country) || 'US', coordinates: dest.coordinates }
        : { city: str(payload.city) || 'Seattle', state: str(payload.state) || 'WA', country: str(payload.country) || 'US' },
      items: [
        {
          id: '1',
          name: str(payload.productName) || 'General Goods',
          quantity: 1,
          weightKg: totalWeightKg,
        },
      ],
      totalWeightKg,
      weightEstimated: !weightKnown,
      carrier: str(payload.carrier) || 'FedEx Ground',
      shippingMethod: str(payload.shippingMethod) || 'Standard Delivery',
    };

    return {
      order: genericOrder,
      matchedPlatform: 'generic',
    };
  }
}
