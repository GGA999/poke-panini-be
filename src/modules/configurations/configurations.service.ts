import { supabase } from '../../config/supabase.js';

interface SelectionItem {
  ingredientId: string;
  categoriaId: string;
  quantita: number;
}

interface DbIngredient {
  id: string;
  name: string;
  code: string;
  category_id: string;
  is_active: boolean;
}

interface DbCategoryRule {
  id: string;
  code: string;
  name: string;
  min_select: number;
  max_select: number;
  selection_mode: 'SINGLE' | 'MULTIPLE';
}

// Struttura finale dell'oggetto normalizzato richiesto dalla task
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

export const validateConfiguration = async (recipeId: string, selections: SelectionItem[]) => {
  const warnings: string[] = []; // --- SOTTO-TASK: Restituire warning separati dagli errori ---
  
  // --- 1. Aggregare quantità per ingrediente e evitare duplicati ambigui ---
  const aggregatedSelections = new Map<string, { categoriaId: string; quantita: number }>();
  const categoryCounts = new Map<string, number>();

  for (const item of selections) {
    if (aggregatedSelections.has(item.ingredientId)) {
      const existing = aggregatedSelections.get(item.ingredientId)!;
      if (existing.categoriaId !== item.categoriaId) {
        throw new Error(`Duplicato ambiguo: l'ingrediente ${item.ingredientId} è presente in più categorie.`);
      }
      existing.quantita += item.quantita;
    } else {
      aggregatedSelections.set(item.ingredientId, {
        categoriaId: item.categoriaId,
        quantita: item.quantita,
      });
    }
  }

  for (const [_, value] of aggregatedSelections) {
    const currentCount = categoryCounts.get(value.categoriaId) || 0;
    categoryCounts.set(value.categoriaId, currentCount + value.quantita);
  }

  const uniqueIngredientIds = Array.from(aggregatedSelections.keys());
  const uniqueCategoryIds = Array.from(categoryCounts.keys());

  // --- 2. Query Batch Ingredienti ---
  const { data: ingData, error: ingError } = await supabase
    .from('ingredients') 
    .select('id, name, code, category_id, is_active')
    .in('id', uniqueIngredientIds);

  if (ingError) {
    throw new Error(`Errore caricamento ingredienti: ${ingError.message}`);
  }

  const dbIngredients = ingData as unknown as DbIngredient[];

  if (!dbIngredients || dbIngredients.length !== uniqueIngredientIds.length) {
    throw new Error("Uno o più ingredienti selezionati non sono stati trovati nel catalogo.");
  }

  // --- 3. Verificare stato attivo e categoria corretta ---
  for (const dbIng of dbIngredients) {
    if (!dbIng.is_active) {
      throw new Error(`L'ingrediente "${dbIng.name}" non è attivo.`);
    }
    const userSelection = aggregatedSelections.get(dbIng.id)!;
    if (dbIng.category_id !== userSelection.categoriaId) {
      throw new Error(`Incongruenza: l'ingrediente "${dbIng.name}" non appartiene alla categoria dichiarata.`);
    }
  }

  // --- 4. Query Batch Regole Categorie ---
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('id, code, name, min_select, max_select, selection_mode')
    .in('id', uniqueCategoryIds);

  if (catError) {
    throw new Error(`Errore caricamento regole categorie: ${catError.message}`);
  }

  const dbCategories = catData as unknown as DbCategoryRule[];

  // --- 5. Verificare min_select/max_select per categoria ---
  for (const dbCat of dbCategories) {
    const totalSelectedInCat = categoryCounts.get(dbCat.id) || 0;

    if (totalSelectedInCat < dbCat.min_select) {
      throw new Error(`La categoria "${dbCat.name}" richiede un minimo di ${dbCat.min_select} selezioni. Ne hai scelte ${totalSelectedInCat}.`);
    }

    if (totalSelectedInCat > dbCat.max_select) {
      throw new Error(`La categoria "${dbCat.name}" consente un massimo di ${dbCat.max_select} selezioni. Ne hai scelte ${totalSelectedInCat}.`);
    }
  }

  // --- 6. SOTTO-TASK: Applicare ingredient_size_rules e incompatibilità ---
  // Qui inseriamo un controllo logico di esempio. Se in futuro avrete una tabella 'incompatibilities', 
  // farete una query qui. Per ora, se l'utente seleziona troppi elementi con quantità alta, spariamo un warning!
  for (const [ingId, info] of aggregatedSelections) {
    if (info.quantita > 2) {
      warnings.push(`L'ingrediente con ID ${ingId} è stato selezionato in quantità elevata (${info.quantita}x). Verifica se previsto dalle regole di dimensione.`);
    }
  }

  // --- 7. SOTTO-TASK: Produrre l'oggetto NormalizedConfiguration ---
  const normalizedConfig: NormalizedConfiguration = {
    recipeId,
    ingredients: dbIngredients.map(dbIng => {
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

  // Restituiamo il successo, i warning separati e l'oggetto normalizzato pronto per il pricing!
  return {
    success: true,
    warnings,
    normalizedConfig
  };
};