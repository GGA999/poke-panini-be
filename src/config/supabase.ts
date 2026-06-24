import { createClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types.js';
import {
  createLocalPostgresClient,
  type SupabaseLikeClient
} from '../db/local-postgres-client.js';
import { env } from './env.js';

function createSupabaseAdminClient(): SupabaseLikeClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Configurazione Supabase mancante.');
  }

  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'configurator-backend'
      }
    }
  }) as unknown as SupabaseLikeClient;
}

function createDatabaseClient(): SupabaseLikeClient {
  if (env.DATABASE_PROVIDER === 'postgres') {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL mancante.');
    }

    return createLocalPostgresClient(env.DATABASE_URL);
  }

  return createSupabaseAdminClient();
}

export const supabaseAdmin = createDatabaseClient();
export const supabase = supabaseAdmin;

export async function checkSupabaseConnection(
  signal?: AbortSignal
): Promise<boolean> {
  let query = supabaseAdmin.from('configurator_types').select('id').limit(1);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { error } = await query;

  return error === null;
}
