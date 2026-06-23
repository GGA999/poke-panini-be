import { supabase } from '../../config/supabase.js';
import { PriceBreakdown, PriceLineItem } from './pricing.interface.js';

interface IngredientSelection {
  ingredientId: string;
  categoriaId: string;
  quantita: number;
}

export async function calculatePokePrice(
  recipeId: string,
  selections: IngredientSelection[]
): Promise<PriceBreakdown> {
  
  // 1. Recupero del prezzo base della ricetta (Size)
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('name, base_price_cents')
    .eq('id', recipeId)
    .single();

  if (recipeError || !recipe) {
    throw new Error('Ricetta o dimensione non trovata nel catalogo.');
  }

const basePriceCents = (recipe as any)?.base_price_cents || 0;
  const items: PriceLineItem[] = [];
  let subtotalCents = basePriceCents;

  if (selections.length === 0) {
    return { basePriceCents, items, subtotalCents, totalCents: subtotalCents };
  }

  // 2. Recupero dei dati degli ingredienti in batch per ottimizzare le performance
  const ingredientIds = selections.map(s => s.ingredientId);
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('ingredients')
    .select('id, name, price_delta_cents')
    .in('id', ingredientIds);

  if (ingredientsError || !ingredients) {
    throw new Error('Errore durante il recupero dei prezzi degli ingredienti.');
  }

  // 3. Recupero di eventuali override di prezzo specifici per questa ricetta/dimensione
  const { data: overrides } = await supabase
    .from('ingredient_price_overrides')
    .select('ingredient_id, price_delta_override_cents')
    .eq('recipe_id', recipeId)
    .in('ingredient_id', ingredientIds);

  // Mappiamo gli ingredienti e gli override in dizionari (Map) per cercarli all'istante a O(1)
// Forziamo il cast su any per bypassare il blocco del tipo 'never'
  const ingredientMap = new Map<string, any>(
    (ingredients as any[] || []).map(i => [i.id, i])
  );
  
  const overrideMap = new Map<string, number>(
    (overrides as any[] || []).map(o => [o.ingredient_id, o.price_delta_override_cents])
  );

  // 4. Calcolo deterministico del breakdown esclusivamente in centesimi (interi)
  for (const selection of selections) {
    const dbIngredient = ingredientMap.get(selection.ingredientId);
    if (!dbIngredient) continue;

    // Se esiste l'override usiamo quello, altrimenti il delta standard. Se non c'è nulla è 0.
    const hasOverride = overrideMap.has(selection.ingredientId);
    const unitPriceCents = hasOverride 
      ? (overrideMap.get(selection.ingredientId) ?? 0)
      : (dbIngredient.price_delta_cents || 0);

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

  // L'ordine degli elementi nel breakdown è deterministico (segue l'ordine delle selezioni del client)
  const totalCents = subtotalCents;

  return {
    basePriceCents,
    items,
    subtotalCents,
    totalCents
  };
}