import pino from 'pino';
import { env } from './env.js'; // Preservata estensione .js per ESM

export const logger = pino({
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime, // BE-018: Forziamo il timestamp ISO standard (scannabile da CloudWatch/ELK)
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }), // Uniformiamo il livello in maiuscolo (INFO, ERROR) per metriche pulite
  },
  // 🛡️ SOTTO-TASK: Censura estesa per credenziali e PII (Nessun segreto nei log)
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-guest-token"]', //  Proteggiamo il Guest Token introdotto in BE-015
      'SUPABASE_SECRET_KEY',
      '*.password',
      '*.token',
      '*.email',     //  Maschera le email ovunque arrivino (body, query, params)
      '*.phone',     //  Maschera i telefoni per conformità GDPR
      'body.email',
      'body.phone'
    ],
    // pino expects `censor` (or `remove`) instead of `placeholder`
    censor: '[CENSURATO]' // Stringa standard di mascheramento
  }
});