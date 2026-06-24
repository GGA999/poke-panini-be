insert into public.configurator_types (code, name, description, display_order)
values
  ('poke', 'Poke', 'Bowl componibile con base, proteine, topping e salse.', 1),
  ('sandwich', 'Panino', 'Panino componibile con pane, proteina, verdure, extra e salse.', 2)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = true;

insert into public.sizes (
  configurator_type_id,
  code,
  name,
  base_price_cents,
  display_order
)
select
  configurator_types.id,
  seed.code,
  seed.name,
  seed.base_price_cents,
  seed.display_order
from (
  values
    ('poke', 'small', 'Small', 950, 1),
    ('poke', 'regular', 'Regular', 1150, 2),
    ('poke', 'large', 'Large', 1350, 3),
    ('sandwich', 'normale', 'Normale', 850, 1),
    ('sandwich', 'maxi', 'Maxi', 1050, 2)
) as seed(type_code, code, name, base_price_cents, display_order)
join public.configurator_types on configurator_types.code = seed.type_code
on conflict (configurator_type_id, code) do update
set
  name = excluded.name,
  base_price_cents = excluded.base_price_cents,
  display_order = excluded.display_order,
  is_active = true,
  is_available = true;

insert into public.ingredient_categories (
  configurator_type_id,
  code,
  name,
  step_number,
  min_select,
  max_select,
  selection_mode,
  display_order
)
select
  configurator_types.id,
  seed.code,
  seed.name,
  seed.step_number,
  seed.min_select,
  seed.max_select,
  seed.selection_mode,
  seed.display_order
from (
  values
    ('poke', 'base', 'Base', 1, 1, 1, 'single', 1),
    ('poke', 'proteine', 'Proteine', 2, 1, 2, 'multiple', 2),
    ('poke', 'topping', 'Topping', 3, 0, 5, 'multiple', 3),
    ('poke', 'salse', 'Salse', 4, 0, 2, 'multiple', 4),
    ('sandwich', 'pane', 'Pane', 1, 1, 1, 'single', 1),
    ('sandwich', 'proteina', 'Proteina', 2, 1, 1, 'single', 2),
    ('sandwich', 'farcitura', 'Formaggi e verdure', 3, 0, 6, 'multiple', 3),
    ('sandwich', 'extra_salse', 'Extra e salse', 4, 0, 5, 'multiple', 4)
) as seed(
  type_code,
  code,
  name,
  step_number,
  min_select,
  max_select,
  selection_mode,
  display_order
)
join public.configurator_types on configurator_types.code = seed.type_code
on conflict (configurator_type_id, code) do update
set
  name = excluded.name,
  step_number = excluded.step_number,
  min_select = excluded.min_select,
  max_select = excluded.max_select,
  selection_mode = excluded.selection_mode,
  display_order = excluded.display_order,
  is_active = true;

insert into public.ingredients (
  category_id,
  code,
  name,
  price_delta_cents,
  allergens,
  dietary_tags,
  display_order
)
select
  ingredient_categories.id,
  seed.code,
  seed.name,
  seed.price_delta_cents,
  seed.allergens::text[],
  seed.dietary_tags::text[],
  seed.display_order
from (
  values
    ('poke', 'base', 'riso_bianco', 'Riso bianco', 0, array[]::text[], array['vegan'], 1),
    ('poke', 'base', 'riso_venere', 'Riso venere', 0, array[]::text[], array['vegan'], 2),
    ('poke', 'base', 'quinoa', 'Quinoa', 80, array[]::text[], array['vegan', 'gluten_free'], 3),
    ('poke', 'base', 'insalata', 'Insalata', 0, array[]::text[], array['vegan', 'gluten_free'], 4),
    ('poke', 'proteine', 'salmone', 'Salmone', 150, array['pesce']::text[], array[]::text[], 1),
    ('poke', 'proteine', 'tonno', 'Tonno', 150, array['pesce']::text[], array[]::text[], 2),
    ('poke', 'proteine', 'pollo', 'Pollo', 0, array[]::text[], array[]::text[], 3),
    ('poke', 'proteine', 'gamberi', 'Gamberi', 170, array['crostacei']::text[], array[]::text[], 4),
    ('poke', 'proteine', 'tofu', 'Tofu', 0, array['soia']::text[], array['vegan'], 5),
    ('poke', 'proteine', 'uovo', 'Uovo', 0, array['uova']::text[], array['vegetarian'], 6),
    ('poke', 'topping', 'avocado', 'Avocado', 120, array[]::text[], array['vegan', 'gluten_free'], 1),
    ('poke', 'topping', 'edamame', 'Edamame', 0, array['soia']::text[], array['vegan'], 2),
    ('poke', 'topping', 'cetriolo', 'Cetriolo', 0, array[]::text[], array['vegan', 'gluten_free'], 3),
    ('poke', 'topping', 'carote', 'Carote', 0, array[]::text[], array['vegan', 'gluten_free'], 4),
    ('poke', 'topping', 'mango', 'Mango', 80, array[]::text[], array['vegan', 'gluten_free'], 5),
    ('poke', 'topping', 'cavolo_rosso', 'Cavolo rosso', 0, array[]::text[], array['vegan', 'gluten_free'], 6),
    ('poke', 'topping', 'mais', 'Mais', 0, array[]::text[], array['vegan', 'gluten_free'], 7),
    ('poke', 'topping', 'cipolla_croccante', 'Cipolla croccante', 50, array['glutine']::text[], array['vegan'], 8),
    ('poke', 'topping', 'sesamo', 'Sesamo', 0, array['sesamo']::text[], array['vegan'], 9),
    ('poke', 'topping', 'alghe', 'Alghe', 0, array[]::text[], array['vegan', 'gluten_free'], 10),
    ('poke', 'salse', 'salsa_soia', 'Salsa di soia', 0, array['soia', 'glutine']::text[], array['vegan'], 1),
    ('poke', 'salse', 'teriyaki', 'Teriyaki', 0, array['soia', 'glutine']::text[], array['vegan'], 2),
    ('poke', 'salse', 'spicy_mayo', 'Spicy mayo', 50, array['uova']::text[], array['vegetarian'], 3),
    ('poke', 'salse', 'ponzu', 'Ponzu', 0, array['soia']::text[], array['vegan'], 4),
    ('poke', 'salse', 'yogurt', 'Yogurt', 0, array['latte']::text[], array['vegetarian'], 5),
    ('sandwich', 'pane', 'bun_classico', 'Bun classico', 0, array['glutine']::text[], array['vegetarian'], 1),
    ('sandwich', 'pane', 'integrale', 'Integrale', 0, array['glutine']::text[], array['vegetarian'], 2),
    ('sandwich', 'pane', 'ai_cereali', 'Ai cereali', 0, array['glutine', 'sesamo']::text[], array['vegetarian'], 3),
    ('sandwich', 'pane', 'focaccia', 'Focaccia', 80, array['glutine']::text[], array['vegetarian'], 4),
    ('sandwich', 'pane', 'senza_glutine', 'Senza glutine', 150, array[]::text[], array['gluten_free', 'vegetarian'], 5),
    ('sandwich', 'proteina', 'hamburger_manzo', 'Hamburger di manzo', 0, array[]::text[], array[]::text[], 1),
    ('sandwich', 'proteina', 'pollo', 'Pollo', 0, array[]::text[], array[]::text[], 2),
    ('sandwich', 'proteina', 'cotoletta', 'Cotoletta', 120, array['glutine', 'uova']::text[], array[]::text[], 3),
    ('sandwich', 'proteina', 'pulled_pork', 'Pulled pork', 180, array[]::text[], array[]::text[], 4),
    ('sandwich', 'proteina', 'burger_vegetale', 'Burger vegetale', 80, array['soia']::text[], array['vegetarian'], 5),
    ('sandwich', 'farcitura', 'cheddar', 'Cheddar', 80, array['latte']::text[], array['vegetarian'], 1),
    ('sandwich', 'farcitura', 'scamorza', 'Scamorza', 80, array['latte']::text[], array['vegetarian'], 2),
    ('sandwich', 'farcitura', 'mozzarella', 'Mozzarella', 80, array['latte']::text[], array['vegetarian'], 3),
    ('sandwich', 'farcitura', 'provola', 'Provola', 80, array['latte']::text[], array['vegetarian'], 4),
    ('sandwich', 'farcitura', 'insalata', 'Insalata', 0, array[]::text[], array['vegan', 'gluten_free'], 5),
    ('sandwich', 'farcitura', 'pomodoro', 'Pomodoro', 0, array[]::text[], array['vegan', 'gluten_free'], 6),
    ('sandwich', 'farcitura', 'cipolla', 'Cipolla', 0, array[]::text[], array['vegan', 'gluten_free'], 7),
    ('sandwich', 'farcitura', 'cetriolini', 'Cetriolini', 0, array[]::text[], array['vegan', 'gluten_free'], 8),
    ('sandwich', 'farcitura', 'melanzane', 'Melanzane', 60, array[]::text[], array['vegan', 'gluten_free'], 9),
    ('sandwich', 'farcitura', 'zucchine', 'Zucchine', 60, array[]::text[], array['vegan', 'gluten_free'], 10),
    ('sandwich', 'farcitura', 'peperoni', 'Peperoni', 60, array[]::text[], array['vegan', 'gluten_free'], 11),
    ('sandwich', 'extra_salse', 'bacon', 'Bacon', 150, array[]::text[], array[]::text[], 1),
    ('sandwich', 'extra_salse', 'uovo', 'Uovo', 100, array['uova']::text[], array['vegetarian'], 2),
    ('sandwich', 'extra_salse', 'cipolla_croccante', 'Cipolla croccante', 60, array['glutine']::text[], array['vegan'], 3),
    ('sandwich', 'extra_salse', 'doppia_carne', 'Doppia carne', 250, array[]::text[], array[]::text[], 4),
    ('sandwich', 'extra_salse', 'maionese', 'Maionese', 0, array['uova']::text[], array['vegetarian'], 5),
    ('sandwich', 'extra_salse', 'ketchup', 'Ketchup', 0, array[]::text[], array['vegan', 'gluten_free'], 6),
    ('sandwich', 'extra_salse', 'barbecue', 'Barbecue', 0, array[]::text[], array['vegan'], 7),
    ('sandwich', 'extra_salse', 'senape', 'Senape', 0, array['senape']::text[], array['vegan', 'gluten_free'], 8),
    ('sandwich', 'extra_salse', 'salsa_piccante', 'Salsa piccante', 0, array[]::text[], array['vegan', 'gluten_free'], 9)
) as seed(
  type_code,
  category_code,
  code,
  name,
  price_delta_cents,
  allergens,
  dietary_tags,
  display_order
)
join public.configurator_types on configurator_types.code = seed.type_code
join public.ingredient_categories
  on ingredient_categories.configurator_type_id = configurator_types.id
  and ingredient_categories.code = seed.category_code
on conflict (category_id, code) do update
set
  name = excluded.name,
  price_delta_cents = excluded.price_delta_cents,
  allergens = excluded.allergens,
  dietary_tags = excluded.dietary_tags,
  display_order = excluded.display_order,
  is_active = true,
  is_available = true;

insert into public.ingredient_size_rules (
  size_id,
  ingredient_id,
  price_delta_cents,
  max_quantity
)
select
  sizes.id,
  ingredients.id,
  seed.price_delta_cents,
  seed.max_quantity
from (
  values
    ('poke', 'large', 'proteine', 'salmone', 100, 2),
    ('poke', 'large', 'proteine', 'tonno', 100, 2),
    ('poke', 'large', 'proteine', 'gamberi', 130, 2),
    ('poke', 'small', 'proteine', 'salmone', 150, 1),
    ('poke', 'small', 'proteine', 'tonno', 150, 1),
    ('poke', 'small', 'proteine', 'gamberi', 170, 1),
    ('sandwich', 'maxi', 'extra_salse', 'doppia_carne', 300, 1)
) as seed(type_code, size_code, category_code, ingredient_code, price_delta_cents, max_quantity)
join public.configurator_types on configurator_types.code = seed.type_code
join public.sizes
  on sizes.configurator_type_id = configurator_types.id
  and sizes.code = seed.size_code
join public.ingredient_categories
  on ingredient_categories.configurator_type_id = configurator_types.id
  and ingredient_categories.code = seed.category_code
join public.ingredients
  on ingredients.category_id = ingredient_categories.id
  and ingredients.code = seed.ingredient_code
on conflict (size_id, ingredient_id) do update
set
  price_delta_cents = excluded.price_delta_cents,
  max_quantity = excluded.max_quantity,
  is_active = true,
  is_available = true;

insert into public.brand_recipes (
  configurator_type_id,
  default_size_id,
  code,
  name,
  description,
  is_featured,
  is_customizable,
  display_order
)
select
  configurator_types.id,
  sizes.id,
  seed.code,
  seed.name,
  seed.description,
  true,
  true,
  seed.display_order
from (
  values
    ('poke', 'regular', 'poke_classic', 'Poke Classic', 'Salmone, riso bianco, avocado, edamame e salsa ponzu.', 1),
    ('sandwich', 'normale', 'panino_classico', 'Panino Classico', 'Bun classico, hamburger di manzo, cheddar, insalata e ketchup.', 2),
    ('sandwich', 'maxi', 'panino_bbq', 'BBQ Pulled Pork', 'Bun ai cereali, pulled pork, cheddar, cipolla croccante e salsa barbecue.', 3),
    ('sandwich', 'normale', 'panino_vegetale', 'Vegetale Croccante', 'Pane integrale, burger vegetale, scamorza, zucchine, peperoni e senape.', 4)
) as seed(type_code, size_code, code, name, description, display_order)
join public.configurator_types on configurator_types.code = seed.type_code
join public.sizes
  on sizes.configurator_type_id = configurator_types.id
  and sizes.code = seed.size_code
on conflict (configurator_type_id, code) do update
set
  default_size_id = excluded.default_size_id,
  name = excluded.name,
  description = excluded.description,
  is_featured = excluded.is_featured,
  is_customizable = excluded.is_customizable,
  display_order = excluded.display_order,
  is_active = true;

insert into public.brand_recipe_ingredients (
  brand_recipe_id,
  ingredient_id,
  quantity,
  display_order
)
select
  brand_recipes.id,
  ingredients.id,
  seed.quantity,
  seed.display_order
from (
  values
    ('poke_classic', 'poke', 'base', 'riso_bianco', 1, 1),
    ('poke_classic', 'poke', 'proteine', 'salmone', 1, 2),
    ('poke_classic', 'poke', 'topping', 'avocado', 1, 3),
    ('poke_classic', 'poke', 'topping', 'edamame', 1, 4),
    ('poke_classic', 'poke', 'salse', 'ponzu', 1, 5),
    ('panino_classico', 'sandwich', 'pane', 'bun_classico', 1, 1),
    ('panino_classico', 'sandwich', 'proteina', 'hamburger_manzo', 1, 2),
    ('panino_classico', 'sandwich', 'farcitura', 'cheddar', 1, 3),
    ('panino_classico', 'sandwich', 'farcitura', 'insalata', 1, 4),
    ('panino_classico', 'sandwich', 'extra_salse', 'ketchup', 1, 5),
    ('panino_bbq', 'sandwich', 'pane', 'ai_cereali', 1, 1),
    ('panino_bbq', 'sandwich', 'proteina', 'pulled_pork', 1, 2),
    ('panino_bbq', 'sandwich', 'farcitura', 'cheddar', 1, 3),
    ('panino_bbq', 'sandwich', 'extra_salse', 'cipolla_croccante', 1, 4),
    ('panino_bbq', 'sandwich', 'extra_salse', 'barbecue', 1, 5),
    ('panino_vegetale', 'sandwich', 'pane', 'integrale', 1, 1),
    ('panino_vegetale', 'sandwich', 'proteina', 'burger_vegetale', 1, 2),
    ('panino_vegetale', 'sandwich', 'farcitura', 'scamorza', 1, 3),
    ('panino_vegetale', 'sandwich', 'farcitura', 'zucchine', 1, 4),
    ('panino_vegetale', 'sandwich', 'farcitura', 'peperoni', 1, 5),
    ('panino_vegetale', 'sandwich', 'extra_salse', 'senape', 1, 6)
) as seed(recipe_code, type_code, category_code, ingredient_code, quantity, display_order)
join public.configurator_types on configurator_types.code = seed.type_code
join public.brand_recipes
  on brand_recipes.configurator_type_id = configurator_types.id
  and brand_recipes.code = seed.recipe_code
join public.ingredient_categories
  on ingredient_categories.configurator_type_id = configurator_types.id
  and ingredient_categories.code = seed.category_code
join public.ingredients
  on ingredients.category_id = ingredient_categories.id
  and ingredients.code = seed.ingredient_code
on conflict (brand_recipe_id, ingredient_id) do update
set
  quantity = excluded.quantity,
  display_order = excluded.display_order;
