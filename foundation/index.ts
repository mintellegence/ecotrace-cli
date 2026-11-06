/**
 * @ecotrace/foundation
 * Core shared calculation engine, e-commerce normalizers, and GLEC models.
 * Shared by:
 * - apps/ecotrace-cli (CLI application)
 * - apps/ecotrace-service (Webhook daemon & real-time receiver)
 */

export * from './types/index.ts';
export * from './engine/calculator.ts';
export * from './engine/emissionFactors.ts';
export * from './engine/geocoding.ts';
export * from './adapters/index.ts';
