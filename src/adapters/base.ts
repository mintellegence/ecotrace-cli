/**
 * Base Adapter Interface for E-Commerce Platforms
 * Defines standard contract for normalizing diverse order payloads.
 */

import { ECommercePlatform, UnifiedOrder } from '../types/index.ts';

export interface PlatformAdapter {
  platform: ECommercePlatform;
  displayName: string;

  /**
   * Evaluates if this adapter can process the given webhook payload and HTTP headers
   */
  canHandle(payload: any, headers?: Record<string, string | string[] | undefined>): boolean;

  /**
   * Transforms the platform-specific payload into our internal UnifiedOrder model
   */
  normalize(payload: any): UnifiedOrder;
}
