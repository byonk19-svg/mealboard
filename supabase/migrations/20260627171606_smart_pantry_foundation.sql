create type public.pantry_stock_status as enum (
  'in_stock',
  'low',
  'out',
  'unknown'
);

create type public.pantry_event_type as enum (
  'created',
  'adjusted',
  'status_changed',
  'expiration_changed',
  'category_changed',
  'storage_changed',
  'notes_changed',
  'discarded'
);

grant usage on type public.pantry_stock_status to authenticated, service_role;
grant usage on type public.pantry_event_type to authenticated, service_role;

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  food_id uuid not null,
  meal_profile_id uuid,
  grocery_category_id uuid,
  display_name text not null,
  package_detail text,
  quantity numeric,
  unit text,
  quantity_note text,
  stock_status public.pantry_stock_status not null default 'in_stock',
  low_stock_threshold_quantity numeric,
  low_stock_threshold_unit text,
  expiration_date date,
  is_open boolean not null default false,
  opened_at timestamptz,
  storage_location text,
  notes text,
  discarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (length(trim(display_name)) > 0),
  check (package_detail is null or length(trim(package_detail)) > 0),
  check (quantity is null or quantity > 0),
  check (unit is null or length(trim(unit)) > 0),
  check (quantity_note is null or length(trim(quantity_note)) > 0),
  check (
    low_stock_threshold_quantity is null
    or low_stock_threshold_quantity > 0
  ),
  check (
    low_stock_threshold_unit is null
    or length(trim(low_stock_threshold_unit)) > 0
  ),
  check (
    (low_stock_threshold_quantity is null and low_stock_threshold_unit is null)
    or (low_stock_threshold_quantity is not null and low_stock_threshold_unit is not null)
  ),
  check (is_open or opened_at is null),
  check (storage_location is null or length(trim(storage_location)) > 0),
  check (notes is null or length(trim(notes)) > 0),
  foreign key (food_id, household_id)
    references public.foods(id, household_id),
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete set null (meal_profile_id),
  foreign key (grocery_category_id, household_id)
    references public.grocery_categories(id, household_id)
    on delete set null (grocery_category_id)
);

create table public.pantry_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pantry_item_id uuid not null,
  event_type public.pantry_event_type not null,
  before_state jsonb,
  after_state jsonb,
  note text,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  check (note is null or length(trim(note)) > 0),
  foreign key (pantry_item_id, household_id)
    references public.pantry_items(id, household_id)
    on delete cascade
);

create trigger set_pantry_items_updated_at
  before update on public.pantry_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.pantry_items to authenticated, service_role;
grant select, insert on public.pantry_events to authenticated;
grant select, insert, update, delete on public.pantry_events to service_role;

alter table public.pantry_items enable row level security;
alter table public.pantry_events enable row level security;

create policy "Household members can manage pantry items"
  on public.pantry_items
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can view pantry events"
  on public.pantry_events
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can create pantry events"
  on public.pantry_events
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create index pantry_items_household_id_idx
  on public.pantry_items (household_id);

create index pantry_items_food_id_idx
  on public.pantry_items (food_id);

create index pantry_items_meal_profile_id_idx
  on public.pantry_items (meal_profile_id);

create index pantry_items_grocery_category_id_idx
  on public.pantry_items (grocery_category_id);

create index pantry_items_active_idx
  on public.pantry_items (household_id, updated_at desc)
  where discarded_at is null;

create index pantry_items_active_food_idx
  on public.pantry_items (household_id, food_id)
  where discarded_at is null;

create index pantry_items_active_category_idx
  on public.pantry_items (household_id, grocery_category_id)
  where discarded_at is null;

create index pantry_items_active_status_idx
  on public.pantry_items (household_id, stock_status)
  where discarded_at is null;

create index pantry_items_expiration_idx
  on public.pantry_items (household_id, expiration_date)
  where discarded_at is null and expiration_date is not null;

create index pantry_items_active_storage_location_idx
  on public.pantry_items (household_id, lower(storage_location))
  where discarded_at is null and storage_location is not null;

create index pantry_items_active_display_name_idx
  on public.pantry_items (household_id, lower(display_name))
  where discarded_at is null;

create index pantry_events_household_id_idx
  on public.pantry_events (household_id);

create index pantry_events_pantry_item_id_idx
  on public.pantry_events (pantry_item_id);

create index pantry_events_item_created_at_idx
  on public.pantry_events (pantry_item_id, created_at desc);

create index pantry_events_event_type_idx
  on public.pantry_events (event_type);
