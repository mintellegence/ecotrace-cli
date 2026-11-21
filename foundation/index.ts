/**
 * @ecotrace/foundation
 * The shared skeleton: types, the GLEC emission engine, e-commerce adapters,
 * input validation and the Kiro audit runner.
 *
 * Both applications are built on this package and nothing else is duplicated:
 *   - apps/ecotrace-cli : terminal application
 *   - apps/ecotrace-web : webhook receiver + live carbon dashboard
 */
export * from './types/index.ts';
export * from './engine/calculator.ts';
export * from './engine/emissionFactors.ts';
export * from './engine/geocoding.ts';
export * from './engine/validation.ts';
export * from './adapters/index.ts';
export * from './config/origin.ts';
export * from './importers/index.ts';
export * from './kiro/agentRunner.ts';
export * from './kiro/specs.ts';
