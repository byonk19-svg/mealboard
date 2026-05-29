create type public.source_type as enum (
  'meal_generated',
  'staple',
  'baby_item',
  'backup_meal',
  'manual_add',
  'household_item'
);

create type public.grocery_list_status as enum (
  'draft',
  'finalized',
  'shopping_started',
  'completed'
);

grant usage on type public.source_type to authenticated, service_role;
grant usage on type public.grocery_list_status to authenticated, service_role;

create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_plan_id uuid,
  name text,
  status public.grocery_list_status not null default 'draft',
  generated_at timestamptz,
  finalized_at timestamptz,
  shopping_started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (weekly_plan_id, household_id)
    references public.weekly_plans(id, household_id)
    on delete set null (weekly_plan_id),
  check (name is null or length(trim(name)) > 0),
  check (
    status <> 'completed'
    or shopping_started_at is not null
    or completed_at is null
  )
);

create table public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  grocery_list_id uuid not null,
  food_id uuid,
  display_name text not null,
  quantity numeric,
  unit text,
  preferred_quantity_text text,
  grocery_category_id uuid,
  preferred_product_id uuid references public.preferred_products(id) on delete set null,
  checked boolean not null default false,
  already_have boolean not null default false,
  manual_item boolean not null default false,
  needs_review boolean not null default false,
  review_reason text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (length(trim(display_name)) > 0),
  check (quantity is null or quantity > 0),
  foreign key (grocery_list_id, household_id)
    references public.grocery_lists(id, household_id)
    on delete cascade,
  foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete set null (food_id),
  foreign key (grocery_category_id, household_id)
    references public.grocery_categories(id, household_id)
    on delete set null (grocery_category_id)
);

create table public.grocery_item_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  grocery_list_item_id uuid not null,
  source_type public.source_type not null default 'meal_generated',
  weekly_plan_item_id uuid references public.weekly_plan_items(id) on delete set null,
  recipe_id uuid,
  recipe_ingredient_id uuid,
  meal_profile_id uuid,
  source_label text,
  quantity numeric,
  unit text,
  notes text,
  created_at timestamptz not null default now(),
  check (source_label is null or length(trim(source_label)) > 0),
  check (quantity is null or quantity > 0),
  foreign key (grocery_list_item_id, household_id)
    references public.grocery_list_items(id, household_id)
    on delete cascade,
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete set null (recipe_id),
  foreign key (recipe_ingredient_id, household_id)
    references public.recipe_ingredients(id, household_id)
    on delete set null (recipe_ingredient_id),
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete set null (meal_profile_id)
);

create trigger set_grocery_lists_updated_at
  before update on public.grocery_lists
  for each row execute function public.set_updated_at();

create trigger set_grocery_list_items_updated_at
  before update on public.grocery_list_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.grocery_lists to authenticated, service_role;
grant select, insert, update, delete on public.grocery_list_items to authenticated, service_role;
grant select, insert, update, delete on public.grocery_item_sources to authenticated, service_role;

alter table public.grocery_lists enable row level security;
alter table public.grocery_list_items enable row level security;
alter table public.grocery_item_sources enable row level security;

create policy "Household members can manage grocery lists"
  on public.grocery_lists
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage grocery list items"
  on public.grocery_list_items
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage grocery item sources"
  on public.grocery_item_sources
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index grocery_lists_household_id_idx
  on public.grocery_lists (household_id);

create index grocery_lists_weekly_plan_id_idx
  on public.grocery_lists (weekly_plan_id);

create index grocery_lists_status_idx
  on public.grocery_lists (status);

create index grocery_list_items_household_id_idx
  on public.grocery_list_items (household_id);

create index grocery_list_items_grocery_list_id_idx
  on public.grocery_list_items (grocery_list_id);

create index grocery_list_items_food_id_idx
  on public.grocery_list_items (food_id);

create index grocery_list_items_grocery_category_id_idx
  on public.grocery_list_items (grocery_category_id);

create index grocery_list_items_needs_review_idx
  on public.grocery_list_items (needs_review)
  where needs_review = true;

create index grocery_item_sources_household_id_idx
  on public.grocery_item_sources (household_id);

create index grocery_item_sources_grocery_list_item_id_idx
  on public.grocery_item_sources (grocery_list_item_id);

create index grocery_item_sources_source_type_idx
  on public.grocery_item_sources (source_type);

create index grocery_item_sources_weekly_plan_item_id_idx
  on public.grocery_item_sources (weekly_plan_item_id);
