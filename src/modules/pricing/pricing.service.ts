import { supabase } from '../../config/supabase.js';
import type { Database } from '../../db/database.types.js';
import { PriceBreakdown, PriceLineItem } from './pricing.interface.js';

interface IngredientSelection {
  ingredientId: string;
  categoriaId: string;
  quantita: number;
}

type RecipePriceRow = Pick<
  Database['public']['Views']['recipes']['Row'],
  'id' | 'name' | 'base_price_cents'
>;
type IngredientPriceRow = Pick<
  Database['public']['Tables']['ingredients']['Row'],
  'id' | 'name' | 'price_delta_cents'
>;
type IngredientOverrideRow =
  Database['public']['Views']['ingredient_price_overrides']['Row'];

export async function calculatePokePrice(
  recipeId: string,
  selections: IngredientSelection[]
): Promise<PriceBreakdown> {
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('name, base_price_cents')
    .eq('id', recipeId)
    .single();

  if (recipeError || !recipe) {
    throw new Error('Ricetta o dimensione non trovata nel catalogo.');
  }

  const recipePrice = recipe as RecipePriceRow;
  const basePriceCents = recipePrice.base_price_cents;
  const items: PriceLineItem[] = [];
  let subtotalCents = basePriceCents;

  if (selections.length === 0) {
    return { basePriceCents, items, subtotalCents, totalCents: subtotalCents };
  }

  const ingredientIds = selections.map((selection) => selection.ingredientId);
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('ingredients')
    .select('id, name, price_delta_cents')
    .in('id', ingredientIds);

  if (ingredientsError || !ingredients) {
    throw new Error('Errore durante il recupero dei prezzi degli ingredienti.');
  }

  const { data: overrides } = await supabase
    .from('ingredient_price_overrides')
    .select('ingredient_id, price_delta_override_cents')
    .eq('recipe_id', recipeId)
    .in('ingredient_id', ingredientIds);

  const ingredientRows: IngredientPriceRow[] = ingredients ?? [];
  const overrideRows: IngredientOverrideRow[] = overrides ?? [];
  const ingredientMap = new Map<string, IngredientPriceRow>(
    ingredientRows.map((ingredient) => [ingredient.id, ingredient])
  );
  const overrideMap = new Map<string, number>(
    overrideRows
      .filter(
        (
          override
        ): override is IngredientOverrideRow & {
          price_delta_override_cents: number;
        } => override.price_delta_override_cents !== null
      )
      .map((override) => [
        override.ingredient_id,
        override.price_delta_override_cents
      ])
  );

  for (const selection of selections) {
    const dbIngredient = ingredientMap.get(selection.ingredientId);

    if (!dbIngredient) {
      continue;
    }

    const hasOverride = overrideMap.has(selection.ingredientId);
    const unitPriceCents = hasOverride
      ? (overrideMap.get(selection.ingredientId) ?? 0)
      : dbIngredient.price_delta_cents;

    const totalPriceCents = unitPriceCents * selection.quantita;

    items.push({
      name: dbIngredient.name || 'Ingrediente',
      type: 'ingredient',
      unitPriceCents,
      quantita: selection.quantita,
      totalPriceCents
    });

    subtotalCents += totalPriceCents;
  }

  const totalCents = subtotalCents;

  return {
    basePriceCents,
    items,
    subtotalCents,
    totalCents
  };
}
