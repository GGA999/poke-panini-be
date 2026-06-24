export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

interface TimestampedRow {
  created_at: string;
  updated_at: string;
}

interface ConfiguratorTypeRow extends TimestampedRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface SizeRow extends TimestampedRow {
  id: string;
  configurator_type_id: string;
  code: string;
  name: string;
  base_price_cents: number;
  currency: string;
  is_active: boolean;
  is_available: boolean;
  display_order: number;
}

interface IngredientCategoryRow extends TimestampedRow {
  id: string;
  configurator_type_id: string;
  code: string;
  name: string;
  step_number: number;
  min_select: number;
  max_select: number;
  selection_mode: 'single' | 'multiple';
  is_active: boolean;
  display_order: number;
}

interface IngredientRow extends TimestampedRow {
  id: string;
  category_id: string;
  code: string;
  name: string;
  description: string | null;
  price_delta_cents: number;
  currency: string;
  allergens: string[];
  dietary_tags: string[];
  is_active: boolean;
  is_available: boolean;
  display_order: number;
}

interface IngredientSizeRuleRow extends TimestampedRow {
  id: string;
  size_id: string;
  ingredient_id: string;
  price_delta_cents: number | null;
  max_quantity: number | null;
  is_active: boolean;
  is_available: boolean;
}

interface IngredientIncompatibilityRow extends TimestampedRow {
  id: string;
  configurator_type_id: string;
  ingredient_a_id: string;
  ingredient_b_id: string;
  reason: string | null;
  is_active: boolean;
}

interface BrandRecipeRow extends TimestampedRow {
  id: string;
  configurator_type_id: string;
  default_size_id: string;
  code: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_customizable: boolean;
  display_order: number;
}

interface BrandRecipeIngredientRow extends TimestampedRow {
  id: string;
  brand_recipe_id: string;
  ingredient_id: string;
  quantity: number;
  display_order: number;
}

interface OrderRow extends TimestampedRow {
  id: string;
  user_id: string | null;
  idempotency_key: string | null;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'completed'
    | 'cancelled';
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  customer_notes: string | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  catalog_size_id: string | null;
  configurator_type_code: string;
  size_code: string;
  name_snapshot: string;
  quantity: number;
  base_price_cents: number;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  sort_order: number;
  created_at: string;
}

interface OrderItemIngredientRow {
  id: string;
  order_item_id: string;
  catalog_ingredient_id: string | null;
  ingredient_code: string;
  category_code: string;
  name_snapshot: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  sort_order: number;
  created_at: string;
}

interface IdempotencyKeyRow {
  key: string;
  request_hash: string;
  order_id: string | null;
  response_status: number | null;
  response_body: Json | null;
  created_at: string;
  expires_at: string | null;
}

interface OrderStatusHistoryRow {
  id: string;
  order_id: string;
  status: OrderRow['status'];
  note: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      configurator_types: TableDefinition<
        ConfiguratorTypeRow,
        {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      sizes: TableDefinition<
        SizeRow,
        {
          id?: string;
          configurator_type_id: string;
          code: string;
          name: string;
          base_price_cents: number;
          currency?: string;
          is_active?: boolean;
          is_available?: boolean;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      ingredient_categories: TableDefinition<
        IngredientCategoryRow,
        {
          id?: string;
          configurator_type_id: string;
          code: string;
          name: string;
          step_number: number;
          min_select?: number;
          max_select?: number;
          selection_mode?: 'single' | 'multiple';
          is_active?: boolean;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      ingredients: TableDefinition<
        IngredientRow,
        {
          id?: string;
          category_id: string;
          code: string;
          name: string;
          description?: string | null;
          price_delta_cents?: number;
          currency?: string;
          allergens?: string[];
          dietary_tags?: string[];
          is_active?: boolean;
          is_available?: boolean;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      ingredient_size_rules: TableDefinition<
        IngredientSizeRuleRow,
        {
          id?: string;
          size_id: string;
          ingredient_id: string;
          price_delta_cents?: number | null;
          max_quantity?: number | null;
          is_active?: boolean;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      ingredient_incompatibilities: TableDefinition<
        IngredientIncompatibilityRow,
        {
          id?: string;
          configurator_type_id: string;
          ingredient_a_id: string;
          ingredient_b_id: string;
          reason?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      brand_recipes: TableDefinition<
        BrandRecipeRow,
        {
          id?: string;
          configurator_type_id: string;
          default_size_id: string;
          code: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          is_customizable?: boolean;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      brand_recipe_ingredients: TableDefinition<
        BrandRecipeIngredientRow,
        {
          id?: string;
          brand_recipe_id: string;
          ingredient_id: string;
          quantity?: number;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      orders: TableDefinition<
        OrderRow,
        {
          id?: string;
          user_id?: string | null;
          idempotency_key?: string | null;
          status?: OrderRow['status'];
          customer_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          currency?: string;
          subtotal_cents?: number;
          total_cents?: number;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      order_items: TableDefinition<
        OrderItemRow,
        {
          id?: string;
          order_id: string;
          catalog_size_id?: string | null;
          configurator_type_code: string;
          size_code: string;
          name_snapshot: string;
          quantity: number;
          base_price_cents: number;
          subtotal_cents: number;
          total_cents: number;
          currency?: string;
          sort_order?: number;
          created_at?: string;
        }
      >;
      order_item_ingredients: TableDefinition<
        OrderItemIngredientRow,
        {
          id?: string;
          order_item_id: string;
          catalog_ingredient_id?: string | null;
          ingredient_code: string;
          category_code: string;
          name_snapshot: string;
          quantity: number;
          unit_price_cents: number;
          total_price_cents: number;
          sort_order?: number;
          created_at?: string;
        }
      >;
      idempotency_keys: TableDefinition<
        IdempotencyKeyRow,
        {
          key: string;
          request_hash: string;
          order_id?: string | null;
          response_status?: number | null;
          response_body?: Json | null;
          created_at?: string;
          expires_at?: string | null;
        }
      >;
      order_status_history: TableDefinition<
        OrderStatusHistoryRow,
        {
          id?: string;
          order_id: string;
          status: OrderRow['status'];
          note?: string | null;
          created_at?: string;
        }
      >;
    };
    Views: {
      categories: {
        Row: Omit<IngredientCategoryRow, 'created_at' | 'updated_at'>;
        Relationships: [];
      };
      recipes: {
        Row: Pick<
          SizeRow,
          | 'id'
          | 'configurator_type_id'
          | 'code'
          | 'name'
          | 'base_price_cents'
          | 'currency'
          | 'is_active'
          | 'display_order'
        >;
        Relationships: [];
      };
      ingredient_price_overrides: {
        Row: {
          recipe_id: string;
          ingredient_id: string;
          price_delta_override_cents: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
