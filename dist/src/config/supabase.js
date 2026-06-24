import { createClient } from '@supabase/supabase-js';
import { createLocalPostgresClient } from '../db/local-postgres-client.js';
import { env } from './env.js';
function createSupabaseAdminClient() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
        throw new Error('Configurazione Supabase mancante.');
    }
    return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
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
    });
}
function createDatabaseClient() {
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
export async function checkSupabaseConnection(signal) {
    let query = supabaseAdmin.from('configurator_types').select('id').limit(1);
    if (signal) {
        query = query.abortSignal(signal);
    }
    const { error } = await query;
    return error === null;
}
