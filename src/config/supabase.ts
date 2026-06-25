import { createClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types.js';
import { env } from './env.js';

// CLIENT PUBBLICO (Soggetto a RLS)
export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY // ✨ Cambiato da SECRET_KEY a ANON_KEY
);

// CLIENT AMMINISTRATIVO (Bypassa RLS)
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
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
  }
);