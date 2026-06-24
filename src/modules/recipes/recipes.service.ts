import { supabase } from '../../config/supabase.js';
import type { Database } from '../../db/database.types.js';
import { mapSupabaseError } from '../../db/repository-error.js';

type ConfiguratorTypeRow =
  Database['public']['Tables']['configurator_types']['Row'];
type SizeRow = Database['public']['Tables']['sizes']['Row'];
type BrandRecipeRow = Database['public']['Tables']['brand_recipes']['Row'];
type BrandRecipeIngredientRow =
  Database['public']['Tables']['brand_recipe_ingredients']['Row'];
type IngredientRow = Database['public']['Tables']['ingredients']['Row'];
type CategoryRow = Database['public']['Tables']['ingredient_categories']['Row'];

export interface BrandRecipeFilters {
  type?: string;
  featured?: boolean;
  limit?: number;
}

export interface BrandRecipeIngredient {
  id: string;
  code: string;
  name: string;
  categoryCode: string;
  quantity: number;
  priceDeltaCents: number;
  allergens: string[];
}

export interface BrandRecipe {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isCustomizable: boolean;
  isFeatured: boolean;
  type: {
    code: string;
    name: string;
  };
  defaultSize: {
    id: string;
    code: string;
    name: string;
    basePriceCents: number;
    currency: string;
  };
  price: {
    totalCents: number;
    currency: string;
  };
  ingredients: BrandRecipeIngredient[];
}

export class RecipesService {
  async getBrandRecipes(
    filters: BrandRecipeFilters = {}
  ): Promise<BrandRecipe[]> {
    const typeByCode = await this.getActiveTypeByCode(filters.type);

    if (filters.type && !typeByCode) {
      return [];
    }

    const recipes = await this.getRecipes(filters, typeByCode?.id);

    if (recipes.length === 0) {
      return [];
    }

    const [types, sizes, recipeIngredients] = await Promise.all([
      this.getTypesByIds([
        ...new Set(recipes.map((recipe) => recipe.configurator_type_id))
      ]),
      this.getSizesByIds([
        ...new Set(recipes.map((recipe) => recipe.default_size_id))
      ]),
      this.getRecipeIngredients(recipes.map((recipe) => recipe.id))
    ]);

    const ingredients = await this.getIngredientsByIds([
      ...new Set(recipeIngredients.map((item) => item.ingredient_id))
    ]);
    const categories = await this.getCategoriesByIds([
      ...new Set(ingredients.map((ingredient) => ingredient.category_id))
    ]);

    const typeById = new Map(types.map((type) => [type.id, type]));
    const sizeById = new Map(sizes.map((size) => [size.id, size]));
    const ingredientById = new Map(
      ingredients.map((ingredient) => [ingredient.id, ingredient])
    );
    const categoryById = new Map(
      categories.map((category) => [category.id, category])
    );
    const recipeIngredientsByRecipeId =
      this.groupRecipeIngredients(recipeIngredients);

    return recipes
      .map((recipe) =>
        this.mapRecipe(
          recipe,
          typeById,
          sizeById,
          ingredientById,
          categoryById,
          recipeIngredientsByRecipeId
        )
      )
      .filter((recipe): recipe is BrandRecipe => recipe !== null);
  }

  async getFeaturedRecipes(): Promise<BrandRecipe[]> {
    return this.getBrandRecipes({ featured: true });
  }

  private async getActiveTypeByCode(
    code: string | undefined
  ): Promise<ConfiguratorTypeRow | null> {
    if (!code) {
      return null;
    }

    const { data, error } = await supabase
      .from('configurator_types')
      .select(
        'id, code, name, description, is_active, display_order, created_at, updated_at'
      )
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw mapSupabaseError(error);
    }

    return data;
  }

  private async getRecipes(
    filters: BrandRecipeFilters,
    configuratorTypeId: string | undefined
  ): Promise<BrandRecipeRow[]> {
    let query = supabase
      .from('brand_recipes')
      .select(
        'id, configurator_type_id, default_size_id, code, name, description, image_url, is_active, is_featured, is_customizable, display_order, created_at, updated_at'
      )
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(filters.limit ?? 12);

    if (configuratorTypeId) {
      query = query.eq('configurator_type_id', configuratorTypeId);
    }

    if (filters.featured !== undefined) {
      query = query.eq('is_featured', filters.featured);
    }

    const { data, error } = await query;

    if (error) {
      throw mapSupabaseError(error);
    }

    return data ?? [];
  }

  private async getTypesByIds(ids: string[]): Promise<ConfiguratorTypeRow[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('configurator_types')
      .select(
        'id, code, name, description, is_active, display_order, created_at, updated_at'
      )
      .in('id', ids);

    if (error) {
      throw mapSupabaseError(error);
    }

    return data ?? [];
  }

  private async getSizesByIds(ids: string[]): Promise<SizeRow[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('sizes')
      .select(
        'id, configurator_type_id, code, name, base_price_cents, currency, is_active, is_available, display_order, created_at, updated_at'
      )
      .in('id', ids);

    if (error) {
      throw mapSupabaseError(error);
    }

    return data ?? [];
  }

  private async getRecipeIngredients(
    recipeIds: string[]
  ): Promise<BrandRecipeIngredientRow[]> {
    if (recipeIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('brand_recipe_ingredients')
      .select(
        'id, brand_recipe_id, ingredient_id, quantity, display_order, created_at, updated_at'
      )
      .in('brand_recipe_id', recipeIds)
      .order('display_order', { ascending: true });

    if (error) {
      throw mapSupabaseError(error);
    }

    return data ?? [];
  }

  private async getIngredientsByIds(ids: string[]): Promise<IngredientRow[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('ingredients')
      .select(
        'id, category_id, code, name, description, price_delta_cents, currency, allergens, dietary_tags, is_active, is_available, display_order, created_at, updated_at'
      )
      .in('id', ids)
      .eq('is_active', true);

    if (error) {
      throw mapSupabaseError(error);
    }

    return data ?? [];
  }

  private async getCategoriesByIds(ids: string[]): Promise<CategoryRow[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('ingredient_categories')
      .select(
        'id, configurator_type_id, code, name, step_number, min_select, max_select, selection_mode, is_active, display_order, created_at, updated_at'
      )
      .in('id', ids);

    if (error) {
      throw mapSupabaseError(error);
    }

    return data ?? [];
  }

  private groupRecipeIngredients(
    recipeIngredients: BrandRecipeIngredientRow[]
  ): Map<string, BrandRecipeIngredientRow[]> {
    const grouped = new Map<string, BrandRecipeIngredientRow[]>();

    for (const item of recipeIngredients) {
      const existing = grouped.get(item.brand_recipe_id) ?? [];
      existing.push(item);
      existing.sort(
        (left, right) =>
          left.display_order - right.display_order ||
          left.ingredient_id.localeCompare(right.ingredient_id)
      );
      grouped.set(item.brand_recipe_id, existing);
    }

    return grouped;
  }

  private mapRecipe(
    recipe: BrandRecipeRow,
    typeById: Map<string, ConfiguratorTypeRow>,
    sizeById: Map<string, SizeRow>,
    ingredientById: Map<string, IngredientRow>,
    categoryById: Map<string, CategoryRow>,
    recipeIngredientsByRecipeId: Map<string, BrandRecipeIngredientRow[]>
  ): BrandRecipe | null {
    const type = typeById.get(recipe.configurator_type_id);
    const size = sizeById.get(recipe.default_size_id);

    if (!type || !size) {
      return null;
    }

    const ingredients = (recipeIngredientsByRecipeId.get(recipe.id) ?? [])
      .map((item) => {
        const ingredient = ingredientById.get(item.ingredient_id);

        if (!ingredient) {
          return null;
        }

        return {
          id: ingredient.id,
          code: ingredient.code,
          name: ingredient.name,
          categoryCode: categoryById.get(ingredient.category_id)?.code ?? '',
          quantity: item.quantity,
          priceDeltaCents: ingredient.price_delta_cents,
          allergens: ingredient.allergens
        };
      })
      .filter(
        (ingredient): ingredient is BrandRecipeIngredient => ingredient !== null
      );

    const ingredientsTotalCents = ingredients.reduce(
      (total, ingredient) =>
        total + ingredient.priceDeltaCents * ingredient.quantity,
      0
    );
    const totalCents = size.base_price_cents + ingredientsTotalCents;

    return {
      id: recipe.id,
      code: recipe.code,
      name: recipe.name,
      description: recipe.description,
      imageUrl: recipe.image_url,
      isCustomizable: recipe.is_customizable,
      isFeatured: recipe.is_featured,
      type: {
        code: type.code,
        name: type.name
      },
      defaultSize: {
        id: size.id,
        code: size.code,
        name: size.name,
        basePriceCents: size.base_price_cents,
        currency: size.currency
      },
      price: {
        totalCents,
        currency: size.currency
      },
      ingredients
    };
  }
}
