/**
 * Input validation helpers shared by the CLI, HTTP API and web terminal.
 * Rejects NaN, Infinity, negatives and absurd magnitudes before they reach the engine.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const LIMITS = {
  maxDistanceKm: 50_000,
  maxWeightKg: 1_000_000,
} as const;

/**
 * Parses a strictly positive, finite number within (0, max].
 * Accepts numbers or numeric strings; anything else throws ValidationError.
 */
export function parsePositiveNumber(value: unknown, label: string, max: number): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;

  if (!Number.isFinite(n)) {
    throw new ValidationError(`${label} must be a valid number.`);
  }
  if (n <= 0) {
    throw new ValidationError(`${label} must be greater than 0.`);
  }
  if (n > max) {
    throw new ValidationError(`${label} must not exceed ${max}.`);
  }
  return n;
}

export function parseDistanceKm(value: unknown): number {
  return parsePositiveNumber(value, 'Distance (km)', LIMITS.maxDistanceKm);
}

export function parseWeightKg(value: unknown): number {
  return parsePositiveNumber(value, 'Weight (kg)', LIMITS.maxWeightKg);
}
