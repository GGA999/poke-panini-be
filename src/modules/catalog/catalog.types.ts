export type SelectionMode = 'single' | 'multiple';

export interface ConfiguratorSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface ConfiguratorSize {
  id: string;
  code: string;
  name: string;
  basePriceCents: number;
  currency: string;
  isActive: boolean;
  isAvailable: boolean;
  displayOrder: number;
}

export interface IngredientSizeRule {
  sizeId: string;
  sizeCode: string;
  priceDeltaCents: number | null;
  maxQuantity: number | null;
  isAvailable: boolean;
}

export interface ConfiguratorIngredient {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceDeltaCents: number;
  currency: string;
  allergens: string[];
  dietaryTags: string[];
  isActive: boolean;
  isAvailable: boolean;
  displayOrder: number;
  sizeRules: IngredientSizeRule[];
}

export interface ConfiguratorCategory {
  id: string;
  code: string;
  name: string;
  stepNumber: number;
  minSelect: number;
  maxSelect: number;
  selectionMode: SelectionMode;
  isActive: boolean;
  displayOrder: number;
  ingredients: ConfiguratorIngredient[];
}

export interface IngredientIncompatibility {
  ingredientCodeA: string;
  ingredientCodeB: string;
  reason: string | null;
}

export interface ConfiguratorDetail extends ConfiguratorSummary {
  currency: string;
  sizes: ConfiguratorSize[];
  categories: ConfiguratorCategory[];
  incompatibilities: IngredientIncompatibility[];
}
