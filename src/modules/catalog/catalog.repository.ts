import { supabaseAdmin } from '../../config/supabase.js';
import {
  mapConfiguratorTypeRow,
  type ConfiguratorTypeRecord
} from '../../db/mappers/configurator-type.mapper.js';
import { mapSupabaseError } from '../../db/repository-error.js';

export interface CatalogRepository {
  findConfiguratorTypeByCode(
    code: string,
    signal?: AbortSignal
  ): Promise<ConfiguratorTypeRecord | null>;
}

export class SupabaseCatalogRepository implements CatalogRepository {
  async findConfiguratorTypeByCode(
    code: string,
    signal?: AbortSignal
  ): Promise<ConfiguratorTypeRecord | null> {
    let query = supabaseAdmin
      .from('configurator_types')
      .select('id, code, name, is_active, display_order')
      .eq('code', code);

    if (signal) {
      query = query.abortSignal(signal);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (!data) {
      return null;
    }

    return mapConfiguratorTypeRow(data);
  }
}
