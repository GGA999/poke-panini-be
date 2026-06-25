import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env.js';

describe('Supabase RLS & Privileges Security Guardrails (BE-017)', () => {
  let clientAnon: SupabaseClient;
  let clientAdminRole: SupabaseClient;

  beforeAll(() => {
    if (env.DATABASE_PROVIDER === 'postgres') {
      console.warn('⚠️ Skipping Supabase RLS tests: DATABASE_PROVIDER is local postgres.');
      return;
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SECRET_KEY) {
      throw new Error('Mancano le credenziali Supabase per eseguire il test RLS.');
    }

    clientAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    clientAdminRole = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  });

  const runIfSupabase = env.DATABASE_PROVIDER === 'supabase' ? it : it.skip;

  runIfSupabase('CRITERIO: Anon NON deve poter scrivere direttamente nella tabella dei ruoli', async () => {
    const { error } = await clientAnon
      .from('user_roles')
      .insert([{ role: 'admin' }]);

    if (error) {
      expect(error.code).toBe('42501');
    } else {
      const { data } = await clientAnon.from('user_roles').select('*');
      expect(data || []).toHaveLength(0);
    }
  });

  runIfSupabase('CRITERIO: Il catalogo attivo (ingredients) deve essere leggibile da ANON', async () => {
    const { data, error } = await clientAnon
      .from('ingredients')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
  });

  runIfSupabase('CRITERIO: Il backend (service_role) deve bypassare RLS', async () => {
    const { data, error } = await clientAdminRole
      .from('user_roles')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});