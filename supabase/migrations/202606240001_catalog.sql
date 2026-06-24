create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.configurator_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint configurator_types_code_format check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint configurator_types_display_order_positive check (display_order >= 0)
);

create trigger configurator_types_set_updated_at
before update on public.configurator_types
for each row execute function public.set_updated_at();

create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  configurator_type_id uuid not null references public.configurator_types(id) on delete restrict,
  code text not null,
  name text not null,
  base_price_cents integer not null,
  currency char(3) not null default 'EUR',
  is_active boolean not null default true,
  is_available boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sizes_code_format check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint sizes_base_price_non_negative check (base_price_cents >= 0),
  constraint sizes_display_order_positive check (display_order >= 0),
  constraint sizes_currency_uppercase check (currency ~ '^[A-Z]{3}$'),
  unique (configurator_type_id, code)
);

create index sizes_configurator_type_order_idx
on public.sizes (configurator_type_id, is_active, display_order);

create trigger sizes_set_updated_at
before update on public.sizes
for each row execute function public.set_updated_at();

create table public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  configurator_type_id uuid not null references public.configurator_types(id) on delete restrict,
  code text not null,
  name text not null,
  step_number integer not null,
  min_select integer not null default 0,
  max_select integer not null default 1,
  selection_mode text not null default 'single',
  is_active boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_categories_code_format check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint ingredient_categories_step_positive check (step_number > 0),
  constraint ingredient_categories_min_max_valid check (
    min_select >= 0 and max_select >= min_select
  ),
  constraint ingredient_categories_selection_mode_valid check (
    selection_mode in ('single', 'multiple')
  ),
  constraint ingredient_categories_display_order_positive check (display_order >= 0),
  unique (configurator_type_id, code)
);

create index ingredient_categories_type_step_order_idx
on public.ingredient_categories (
  configurator_type_id,
  is_active,
  step_number,
  display_order
);

create trigger ingredient_categories_set_updated_at
before update on public.ingredient_categories
for each row execute function public.set_updated_at();

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.ingredient_categories(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  price_delta_cents integer not null default 0,
  currency char(3) not null default 'EUR',
  allergens text[] not null default '{}'::text[],
  dietary_tags text[] not null default '{}'::text[],
  is_active boolean not null default true,
  is_available boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_code_format check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint ingredients_price_delta_non_negative check (price_delta_cents >= 0),
  constraint ingredients_currency_uppercase check (currency ~ '^[A-Z]{3}$'),
  constraint ingredients_display_order_positive check (display_order >= 0),
  unique (category_id, code)
);

create index ingredients_category_order_idx
on public.ingredients (category_id, is_active, display_order);

create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute function public.set_updated_at();

create table public.ingredient_size_rules (
  id uuid primary key default gen_random_uuid(),
  size_id uuid not null references public.sizes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  price_delta_cents integer,
  max_quantity integer,
  is_active boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_size_rules_price_delta_non_negative check (
    price_delta_cents is null or price_delta_cents >= 0
  ),
  constraint ingredient_size_rules_max_quantity_positive check (
    max_quantity is null or max_quantity > 0
  ),
  unique (size_id, ingredient_id)
);

create index ingredient_size_rules_size_idx
on public.ingredient_size_rules (size_id, is_active);

create index ingredient_size_rules_ingredient_idx
on public.ingredient_size_rules (ingredient_id, is_active);

create trigger ingredient_size_rules_set_updated_at
before update on public.ingredient_size_rules
for each row execute function public.set_updated_at();

create table public.ingredient_incompatibilities (
  id uuid primary key default gen_random_uuid(),
  configurator_type_id uuid not null references public.configurator_types(id) on delete cascade,
  ingredient_a_id uuid not null references public.ingredients(id) on delete cascade,
  ingredient_b_id uuid not null references public.ingredients(id) on delete cascade,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_incompatibilities_distinct check (ingredient_a_id <> ingredient_b_id),
  constraint ingredient_incompatibilities_sorted check (ingredient_a_id < ingredient_b_id),
  unique (configurator_type_id, ingredient_a_id, ingredient_b_id)
);

create index ingredient_incompatibilities_type_idx
on public.ingredient_incompatibilities (configurator_type_id, is_active);

create trigger ingredient_incompatibilities_set_updated_at
before update on public.ingredient_incompatibilities
for each row execute function public.set_updated_at();

create table public.brand_recipes (
  id uuid primary key default gen_random_uuid(),
  configurator_type_id uuid not null references public.configurator_types(id) on delete restrict,
  default_size_id uuid not null references public.sizes(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_customizable boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_recipes_code_format check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint brand_recipes_display_order_positive check (display_order >= 0),
  unique (configurator_type_id, code)
);

create index brand_recipes_type_featured_order_idx
on public.brand_recipes (
  configurator_type_id,
  is_active,
  is_featured,
  display_order
);

create trigger brand_recipes_set_updated_at
before update on public.brand_recipes
for each row execute function public.set_updated_at();

create table public.brand_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  brand_recipe_id uuid not null references public.brand_recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity integer not null default 1,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_recipe_ingredients_quantity_positive check (quantity > 0),
  constraint brand_recipe_ingredients_display_order_positive check (display_order >= 0),
  unique (brand_recipe_id, ingredient_id)
);

create index brand_recipe_ingredients_recipe_order_idx
on public.brand_recipe_ingredients (brand_recipe_id, display_order);

create trigger brand_recipe_ingredients_set_updated_at
before update on public.brand_recipe_ingredients
for each row execute function public.set_updated_at();

create view public.categories as
select
  id,
  code,
  name,
  configurator_type_id,
  step_number,
  min_select,
  max_select,
  selection_mode,
  is_active,
  display_order
from public.ingredient_categories;

create view public.recipes as
select
  id,
  configurator_type_id,
  code,
  name,
  base_price_cents,
  currency,
  is_active,
  display_order
from public.sizes;

create view public.ingredient_price_overrides as
select
  size_id as recipe_id,
  ingredient_id,
  price_delta_cents as price_delta_override_cents
from public.ingredient_size_rules
where is_active = true and price_delta_cents is not null;

comment on table public.configurator_types is
  'Catalogo configuratori. Forward-fix: aggiungere nuove colonne nullable/default, evitare drop distruttivi in produzione.';
comment on table public.brand_recipes is
  'Ricette editoriali del brand collegate al catalogo corrente.';
