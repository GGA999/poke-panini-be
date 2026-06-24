import { supabaseAdmin } from '../../config/supabase.js';
import { mapSupabaseError } from '../../db/repository-error.js';
import { withTimeout } from '../../shared/utils/with-timeout.js';
function mapSummary(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        displayOrder: row.display_order
    };
}
function mapSize(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        basePriceCents: row.base_price_cents,
        currency: row.currency,
        isActive: row.is_active,
        isAvailable: row.is_available,
        displayOrder: row.display_order
    };
}
function mapSizeRule(row, sizeById) {
    const size = sizeById.get(row.size_id);
    if (!size) {
        return null;
    }
    return {
        sizeId: row.size_id,
        sizeCode: size.code,
        priceDeltaCents: row.price_delta_cents,
        maxQuantity: row.max_quantity,
        isAvailable: row.is_available
    };
}
function mapIngredient(row, rulesByIngredientId) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        priceDeltaCents: row.price_delta_cents,
        currency: row.currency,
        allergens: row.allergens,
        dietaryTags: row.dietary_tags,
        isActive: row.is_active,
        isAvailable: row.is_available,
        displayOrder: row.display_order,
        sizeRules: rulesByIngredientId.get(row.id) ?? []
    };
}
function mapCategory(row, ingredientsByCategoryId) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        stepNumber: row.step_number,
        minSelect: row.min_select,
        maxSelect: row.max_select,
        selectionMode: row.selection_mode,
        isActive: row.is_active,
        displayOrder: row.display_order,
        ingredients: ingredientsByCategoryId.get(row.id) ?? []
    };
}
function mapIncompatibility(row, ingredientCodeById) {
    const ingredientCodeA = ingredientCodeById.get(row.ingredient_a_id);
    const ingredientCodeB = ingredientCodeById.get(row.ingredient_b_id);
    if (!ingredientCodeA || !ingredientCodeB) {
        return null;
    }
    return {
        ingredientCodeA,
        ingredientCodeB,
        reason: row.reason
    };
}
function compareDisplayOrder(left, right) {
    return (left.displayOrder - right.displayOrder ||
        left.name.localeCompare(right.name));
}
export class SupabaseCatalogRepository {
    async findActiveConfiguratorSummaries(signal) {
        let query = supabaseAdmin
            .from('configurator_types')
            .select('id, code, name, description, is_active, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
        if (error) {
            throw mapSupabaseError(error);
        }
        return (data ?? []).map(mapSummary);
    }
    async findActiveConfiguratorDetailByCode(code, signal) {
        return withTimeout(async (timeoutSignal) => {
            const querySignal = signal ?? timeoutSignal;
            const type = await this.findActiveTypeByCode(code, querySignal);
            if (!type) {
                return null;
            }
            const [sizes, categories] = await Promise.all([
                this.findActiveSizes(type.id, querySignal),
                this.findActiveCategories(type.id, querySignal)
            ]);
            const categoryIds = categories.map((category) => category.id);
            const sizeIds = sizes.map((size) => size.id);
            const ingredients = await this.findActiveIngredients(categoryIds, querySignal);
            const ingredientIds = ingredients.map((ingredient) => ingredient.id);
            const [sizeRules, incompatibilities] = await Promise.all([
                this.findActiveSizeRules(sizeIds, ingredientIds, querySignal),
                this.findActiveIncompatibilities(type.id, querySignal)
            ]);
            const sizeById = new Map(sizes.map((size) => [size.id, mapSize(size)]));
            const rulesByIngredientId = this.groupRulesByIngredient(sizeRules, sizeById);
            const mappedIngredients = ingredients.map((ingredient) => mapIngredient(ingredient, rulesByIngredientId));
            const ingredientsByCategoryId = this.groupIngredientsByCategory(ingredients, mappedIngredients);
            const ingredientCodeById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.code]));
            const mappedSizes = Array.from(sizeById.values()).sort(compareDisplayOrder);
            const mappedCategories = categories
                .map((category) => mapCategory(category, ingredientsByCategoryId))
                .sort((left, right) => left.stepNumber - right.stepNumber ||
                compareDisplayOrder(left, right));
            const mappedIncompatibilities = incompatibilities
                .map((incompatibility) => mapIncompatibility(incompatibility, ingredientCodeById))
                .filter((value) => value !== null);
            return {
                ...mapSummary(type),
                currency: mappedSizes[0]?.currency ?? 'EUR',
                sizes: mappedSizes,
                categories: mappedCategories,
                incompatibilities: mappedIncompatibilities
            };
        });
    }
    async findActiveTypeByCode(code, signal) {
        let query = supabaseAdmin
            .from('configurator_types')
            .select('id, code, name, description, is_active, display_order')
            .eq('code', code)
            .eq('is_active', true);
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query.maybeSingle();
        if (error) {
            throw mapSupabaseError(error);
        }
        return data;
    }
    async findActiveSizes(configuratorTypeId, signal) {
        let query = supabaseAdmin
            .from('sizes')
            .select('id, configurator_type_id, code, name, base_price_cents, currency, is_active, is_available, display_order, created_at, updated_at')
            .eq('configurator_type_id', configuratorTypeId)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
        if (error) {
            throw mapSupabaseError(error);
        }
        return data ?? [];
    }
    async findActiveCategories(configuratorTypeId, signal) {
        let query = supabaseAdmin
            .from('ingredient_categories')
            .select('id, configurator_type_id, code, name, step_number, min_select, max_select, selection_mode, is_active, display_order, created_at, updated_at')
            .eq('configurator_type_id', configuratorTypeId)
            .eq('is_active', true)
            .order('step_number', { ascending: true })
            .order('display_order', { ascending: true });
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
        if (error) {
            throw mapSupabaseError(error);
        }
        return data ?? [];
    }
    async findActiveIngredients(categoryIds, signal) {
        if (categoryIds.length === 0) {
            return [];
        }
        let query = supabaseAdmin
            .from('ingredients')
            .select('id, category_id, code, name, description, price_delta_cents, currency, allergens, dietary_tags, is_active, is_available, display_order, created_at, updated_at')
            .in('category_id', categoryIds)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
        if (error) {
            throw mapSupabaseError(error);
        }
        return data ?? [];
    }
    async findActiveSizeRules(sizeIds, ingredientIds, signal) {
        if (sizeIds.length === 0 || ingredientIds.length === 0) {
            return [];
        }
        let query = supabaseAdmin
            .from('ingredient_size_rules')
            .select('id, size_id, ingredient_id, price_delta_cents, max_quantity, is_active, is_available, created_at, updated_at')
            .in('size_id', sizeIds)
            .in('ingredient_id', ingredientIds)
            .eq('is_active', true);
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
        if (error) {
            throw mapSupabaseError(error);
        }
        return data ?? [];
    }
    async findActiveIncompatibilities(configuratorTypeId, signal) {
        let query = supabaseAdmin
            .from('ingredient_incompatibilities')
            .select('id, configurator_type_id, ingredient_a_id, ingredient_b_id, reason, is_active, created_at, updated_at')
            .eq('configurator_type_id', configuratorTypeId)
            .eq('is_active', true);
        if (signal) {
            query = query.abortSignal(signal);
        }
        const { data, error } = await query;
        if (error) {
            throw mapSupabaseError(error);
        }
        return data ?? [];
    }
    groupRulesByIngredient(rows, sizeById) {
        const grouped = new Map();
        for (const row of rows) {
            const rule = mapSizeRule(row, sizeById);
            if (!rule) {
                continue;
            }
            const existing = grouped.get(row.ingredient_id) ?? [];
            existing.push(rule);
            existing.sort((left, right) => left.sizeCode.localeCompare(right.sizeCode));
            grouped.set(row.ingredient_id, existing);
        }
        return grouped;
    }
    groupIngredientsByCategory(rows, mappedIngredients) {
        const ingredientById = new Map(mappedIngredients.map((ingredient) => [ingredient.id, ingredient]));
        const grouped = new Map();
        for (const row of rows) {
            const ingredient = ingredientById.get(row.id);
            if (!ingredient) {
                continue;
            }
            const existing = grouped.get(row.category_id) ?? [];
            existing.push(ingredient);
            existing.sort(compareDisplayOrder);
            grouped.set(row.category_id, existing);
        }
        return grouped;
    }
}
