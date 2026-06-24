import { config } from 'dotenv';
import { z } from 'zod';

config({ quiet: true });

if (process.env.NODE_ENV !== 'test') {
  config({ path: '.env.local', override: true, quiet: true });
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_PROVIDER: z.enum(['supabase', 'postgres']).default('supabase'),
  DATABASE_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  REQUEST_BODY_LIMIT: z.string().default('64kb'),
  PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  PRICING_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),
  PRICING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  ORDER_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),
  ORDER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10)
}).superRefine((env, context) => {
  if (env.DATABASE_PROVIDER === 'postgres') {
    if (!env.DATABASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL richiesta con DATABASE_PROVIDER=postgres'
      });
    }

    return;
  }

  if (!env.SUPABASE_URL) {
    context.addIssue({
      code: 'custom',
      path: ['SUPABASE_URL'],
      message: 'SUPABASE_URL richiesta con DATABASE_PROVIDER=supabase'
    });
  }

  if (!env.SUPABASE_SECRET_KEY) {
    context.addIssue({
      code: 'custom',
      path: ['SUPABASE_SECRET_KEY'],
      message: 'SUPABASE_SECRET_KEY richiesta con DATABASE_PROVIDER=supabase'
    });
  }
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
