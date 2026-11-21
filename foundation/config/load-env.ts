/**
 * Side-effect module: import this FIRST in an entry point so .env is loaded
 * before any other module reads process.env at import time.
 */
import { loadEnvFile } from './env.ts';

loadEnvFile();
