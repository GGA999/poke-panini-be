import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  
  // 🛡️ AGGIUNTI PER BE-017
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  SUPABASE_ANON_KEY: z.string().default(''), 
  DATABASE_PROVIDER: z.enum(['postgres', 'supabase']).default('postgres'),
  
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  REQUEST_BODY_LIMIT: z.string().default('64kb'),
  PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  PRICING_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  PRICING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  ORDER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  ORDER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configurazione ambiente non valida');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsAllowedOrigins: parsed.data.CORS_ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};