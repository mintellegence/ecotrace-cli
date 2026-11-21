/**
 * Loads a local .env file if one exists, without any third-party dependency.
 * Real environment variables always win over values in the file.
 */
import fs from 'node:fs';
import path from 'node:path';

export function loadEnvFile(file = path.resolve(process.cwd(), '.env')): void {
  if (!fs.existsSync(file)) return;
  try {
    // Available since Node 20.12 / 21.7; does not override variables already set.
    process.loadEnvFile(file);
  } catch (err) {
    console.error(`[env] Could not load ${file}: ${(err as Error).message}`);
  }
}
