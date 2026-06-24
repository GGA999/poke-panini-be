create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  idempotency_key text,
  status text not null default 'pending',
  customer_name text,
  customer_email text,
  customer_phone text,
  currency char(3) not null default 'EUR',
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  customer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_valid check (
    status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')
  ),
  constraint orders_amounts_non_negative check (
    subtotal_cents >= 0 and total_cents >= 0
  ),
  constraint orders_currency_uppercase check (currency ~ '^[A-Z]{3}$')
);

create unique index orders_idempotency_key_unique_idx
on public.orders (idempotency_key)
where idempotency_key is not null;

create index orders_user_created_at_idx
on public.orders (user_id, created_at desc);

create index orders_status_created_at_idx
on public.orders (status, created_at desc);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  catalog_size_id uuid references public.sizes(id) on delete set null,
  configurator_type_code text not null,
  size_code text not null,
  name_snapshot text not null,
  quantity integer not null,
  base_price_cents integer not null,
  subtotal_cents integer not null,
  total_cents integer not null,
  currency char(3) not null default 'EUR',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_amounts_non_negative check (
    base_price_cents >= 0 and subtotal_cents >= 0 and total_cents >= 0
  ),
  constraint order_items_currency_uppercase check (currency ~ '^[A-Z]{3}$')
);

create index order_items_order_sort_idx
on public.order_items (order_id, sort_order);

create table public.order_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  catalog_ingredient_id uuid references public.ingredients(id) on delete set null,
  ingredient_code text not null,
  category_code text not null,
  name_snapshot text not null,
  quantity integer not null,
  unit_price_cents integer not null,
  total_price_cents integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint order_item_ingredients_quantity_positive check (quantity > 0),
  constraint order_item_ingredients_amounts_non_negative check (
    unit_price_cents >= 0 and total_price_cents >= 0
  )
);

create index order_item_ingredients_item_sort_idx
on public.order_item_ingredients (order_item_id, sort_order);

create table public.idempotency_keys (
  key text primary key,
  request_hash text not null,
  order_id uuid references public.orders(id) on delete set null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index idempotency_keys_expires_at_idx
on public.idempotency_keys (expires_at)
where expires_at is not null;

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint order_status_history_status_valid check (
    status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')
  )
);

create index order_status_history_order_created_at_idx
on public.order_status_history (order_id, created_at);

comment on table public.orders is
  'Order header with minimal PII. Retention policy: keep operational PII only as long as business/legal needs require; anonymize customer_* fields when no longer needed.';
comment on table public.order_items is
  'Immutable item snapshots: names, type codes and prices are copied from catalog at order time.';
comment on table public.order_item_ingredients is
  'Immutable ingredient snapshots. Catalog ingredient FK is nullable so catalog cleanup does not destroy order history.';
