import { supabase } from '../../config/supabase.js';
import type { Database } from '../../db/database.types.js';

export interface SelectionItem {
  ingredientId: string;
  categoriaId: string;
  quantita: number;
}

type DbIngredient = Pick<
  Database['public']['Tables']['ingredients']['Row'],
  'id' | 'name' | 'code' | 'category_id' | 'is_active'
>;
type DbCategoryRule = Pick<
  Database['public']['Views']['categories']['Row'],
  'id' | 'code' | 'name' | 'min_select' | 'max_select' | 'selection_mode'
>;

interface NormalizedConfiguration {
  recipeId: string;
  ingredients: {
    id: string;
    code: string;
    name: string;
    categoriaId: string;
    quantita: number;
  }[];
  summary: {
    totalIngredients: number;
    categoriesInvolved: number;
  };
}

export const validateConfiguration = async (
  recipeId: string,
  selections: SelectionItem[]
) => {
  const warnings: string[] = [];

  const aggregatedSelections = new Map<
    string,
    { categoriaId: string; quantita: number }
  >();
  const categoryCounts = new Map<string, number>();

  for (const item of selections) {
    if (aggregatedSelections.has(item.ingredientId)) {
      const existing = aggregatedSelections.get(item.ingredientId)!;
      if (existing.categoriaId !== item.categoriaId) {
        throw new Error(
          `Duplicato ambiguo: l'ingrediente ${item.ingredientId} è presente in più categorie.`
        );
      }
      existing.quantita += item.quantita;
    } else {
      aggregatedSelections.set(item.ingredientId, {
        categoriaId: item.categoriaId,
        quantita: item.quantita
      });
    }
  }

  for (const value of aggregatedSelections.values()) {
    const currentCount = categoryCounts.get(value.categoriaId) || 0;
    categoryCounts.set(value.categoriaId, currentCount + value.quantita);
  }

  const uniqueIngredientIds = Array.from(aggregatedSelections.keys());
  const uniqueCategoryIds = Array.from(categoryCounts.keys());

  const { data: ingData, error: ingError } = await supabase
    .from('ingredients')
    .select('id, name, code, category_id, is_active')
    .in('id', uniqueIngredientIds);

  if (ingError) {
    throw new Error(`Errore caricamento ingredienti: ${ingError.message}`);
  }

  const dbIngredients: DbIngredient[] = ingData ?? [];

  if (!dbIngredients || dbIngredients.length !== uniqueIngredientIds.length) {
    throw new Error(
      'Uno o più ingredienti selezionati non sono stati trovati nel catalogo.'
    );
  }

  for (const dbIng of dbIngredients) {
    if (!dbIng.is_active) {
      throw new Error(`L'ingrediente "${dbIng.name}" non è attivo.`);
    }
    const userSelection = aggregatedSelections.get(dbIng.id)!;
    if (dbIng.category_id !== userSelection.categoriaId) {
      throw new Error(
        `Incongruenza: l'ingrediente "${dbIng.name}" non appartiene alla categoria dichiarata.`
      );
    }
  }

  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('id, code, name, min_select, max_select, selection_mode')
    .in('id', uniqueCategoryIds);

  if (catError) {
    throw new Error(`Errore caricamento regole categorie: ${catError.message}`);
  }

  const dbCategories: DbCategoryRule[] = catData ?? [];

  for (const dbCat of dbCategories) {
    const totalSelectedInCat = categoryCounts.get(dbCat.id) || 0;

    if (totalSelectedInCat < dbCat.min_select) {
      throw new Error(
        `La categoria "${dbCat.name}" richiede un minimo di ${dbCat.min_select} selezioni. Ne hai scelte ${totalSelectedInCat}.`
      );
    }

    if (totalSelectedInCat > dbCat.max_select) {
      throw new Error(
        `La categoria "${dbCat.name}" consente un massimo di ${dbCat.max_select} selezioni. Ne hai scelte ${totalSelectedInCat}.`
      );
    }
  }

  for (const [ingId, info] of aggregatedSelections) {
    if (info.quantita > 2) {
      warnings.push(
        `L'ingrediente con ID ${ingId} è stato selezionato in quantità elevata (${info.quantita}x). Verifica se previsto dalle regole di dimensione.`
      );
    }
  }

  const normalizedConfig: NormalizedConfiguration = {
    recipeId,
    ingredients: dbIngredients.map((dbIng) => {
      const userSel = aggregatedSelections.get(dbIng.id)!;
      return {
        id: dbIng.id,
        code: dbIng.code,
        name: dbIng.name,
        categoriaId: dbIng.category_id,
        quantita: userSel.quantita
      };
    }),
    summary: {
      totalIngredients: uniqueIngredientIds.length,
      categoriesInvolved: uniqueCategoryIds.length
    }
  };

  return {
    success: true,
    warnings,
    normalizedConfig
  };
};
