import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**'], 
    env: {
      REQUEST_BODY_LIMIT: '1kb',
      // ✨ Sintonizzazione: 15 dà spazio ai test normali di completarsi, 
      // ma viene facilmente superato dal test di sovraccarico!
      PUBLIC_RATE_LIMIT_MAX: '15', 
      DATABASE_PROVIDER: 'postgres'
    }
  },
});