import { supabaseAdmin } from '../../config/supabase.js';
import { mapConfiguratorTypeRow } from '../../db/mappers/configurator-type.mapper.js';
import { mapSupabaseError } from '../../db/repository-error.js';
export class SupabaseCatalogRepository {
    async findConfiguratorTypeByCode(code, signal) {
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
