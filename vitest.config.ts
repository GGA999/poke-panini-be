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
    // 🧹 PROBLEMA 1 RISOLTO: Diciamo a Vitest di ignorare totalmente la cartella dist/
    exclude: ['**/node_modules/**', '**/dist/**'], 
    
    // 🚀 PROBLEMI 2 E 3 RISOLTI: Iniettiamo i limiti corretti per l'ambiente di test
    env: {
      REQUEST_BODY_LIMIT: '1kb',       // Forza il 413 se inviamo più di 1KB (i 2.000 caratteri del test falliranno subito)
      PUBLIC_RATE_LIMIT_MAX: '5',      // Abbassa il rate limit a 5 richieste per far scattare subito il 429 nel loop del test
      DATABASE_PROVIDER: 'postgres'    // Mantiene il provider locale di default per i test
    }
  },
});