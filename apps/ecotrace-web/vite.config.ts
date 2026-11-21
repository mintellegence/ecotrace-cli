import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(here, '../../dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    fs: {
      // The UI imports shared types/samples from /foundation.
      allow: [path.resolve(here, '../..')],
    },
  },
});
