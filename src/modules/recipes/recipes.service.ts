import { AnyAaaaRecord } from 'node:dns';
import * as SupabaseModule from '../../config/supabase.js';
const supabase = (SupabaseModule as any).default || (SupabaseModule as any).supabase || SupabaseModule;

export class RecipesService {
  async getFeaturedRecipes() {
    const { data: recipes, error: recipesError } = await supabase
      .from('brand_recipes')
      .select(`
        id,
        name,
        description,
        image_url,
        is_customizable,
        sizes (id, name, base_price_cents)
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order', { ascending: true });

    if (recipesError) throw recipesError;
    if (!recipes) return [];

    const recipesWithIngredients = await Promise.all(
    recipes.map(async (recipe: AnyAaaaRecord) => {
        const { data: ingredientsData, error: ingError } = await supabase
          .from('brand_recipe_ingredients')
          .select(`
            quantity,
            ingredients (id, name, code, price_delta_cents, allergens)
          `)
          .eq('recipe_id', recipe.id);

        if (ingError) throw ingError;

        const dettagliIngredienti = ingredientsData?.map((item: any) => ({
          id: item.ingredients.id,
          nome: item.ingredients.name,
          code: item.ingredients.code,
          quantita: item.quantity,
          prezzo_extra_centesimi: item.ingredients.price_delta_cents
        })) || [];

        const prezzoBase = (recipe.sizes as any)?.base_price_cents || 0;
        const totaleExtra = dettagliIngredienti.reduce((acc, curr) => acc + (curr.prezzo_extra_centesimi * curr.quantita), 0);
        const prezzoTotaleCentesimi = prezzoBase + totaleExtra;

        return {
          id: recipe.id,
          nome: recipe.name,
          descrizione: recipe.description,
          immagine_url: recipe.image_url,
          personalizzabile: recipe.is_customizable,
          dimensione_default: (recipe.sizes as any)?.name || 'Regular',
          prezzo_totale_euro: prezzoTotaleCentesimi / 100,
          ingredienti: dettagliIngredienti
        };
      })
    );

    return recipesWithIngredients;
  }
}