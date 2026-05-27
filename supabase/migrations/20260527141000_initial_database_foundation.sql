create extension if not exists pgcrypto with schema extensions;

create type public.profile_type as enum (
  'adult',
  'baby',
  'shared',
  'household'
);

create type public.food_preference_level as enum (
  'love',
  'like',
  'okay',
  'dislike',
  'hard_no',
  'allergy'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.meal_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  profile_type public.profile_type not null,
  color_label text,
  birthdate date,
  baby_stage_override_months integer,
  default_daily_calorie_target integer,
  work_day_calorie_target integer,
  off_day_calorie_target integer,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, household_id),
  unique (household_id, name),
  check (baby_stage_override_months is null or baby_stage_override_months >= 0),
  check (default_daily_calorie_target is null or default_daily_calorie_target > 0),
  check (work_day_calorie_target is null or work_day_calorie_target > 0),
  check (off_day_calorie_target is null or off_day_calorie_target > 0)
);

create table public.grocery_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  heb_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, household_id)
);

create unique index grocery_categories_household_lower_name_key
  on public.grocery_categories (household_id, lower(name));

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  default_grocery_category_id uuid,
  default_unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, household_id),
  foreign key (default_grocery_category_id, household_id)
    references public.grocery_categories(id, household_id)
);

create unique index foods_household_lower_name_key
  on public.foods (household_id, lower(name));

create table public.food_preferences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  meal_profile_id uuid not null,
  food_id uuid not null,
  preference public.food_preference_level not null,
  notes text,
  prep_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meal_profile_id, food_id),
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete cascade,
  foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete cascade
);

create table public.preferred_products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  food_id uuid,
  name text not null,
  store text default 'H-E-B',
  search_term text,
  preferred_quantity text,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete cascade
);

create trigger set_households_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

create trigger set_meal_profiles_updated_at
  before update on public.meal_profiles
  for each row execute function public.set_updated_at();

create trigger set_grocery_categories_updated_at
  before update on public.grocery_categories
  for each row execute function public.set_updated_at();

create trigger set_foods_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

create trigger set_food_preferences_updated_at
  before update on public.food_preferences
  for each row execute function public.set_updated_at();

create trigger set_preferred_products_updated_at
  before update on public.preferred_products
  for each row execute function public.set_updated_at();

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_memberships memberships
    where memberships.household_id = target_household_id
      and memberships.user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_member(uuid) to service_role;

alter table public.households enable row level security;
alter table public.household_memberships enable row level security;
alter table public.meal_profiles enable row level security;
alter table public.grocery_categories enable row level security;
alter table public.foods enable row level security;
alter table public.food_preferences enable row level security;
alter table public.preferred_products enable row level security;

create policy "Household members can view households"
  on public.households
  for select
  to authenticated
  using (public.is_household_member(id));

create policy "Household members can update households"
  on public.households
  for update
  to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

create policy "Household members can view memberships"
  on public.household_memberships
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can manage meal profiles"
  on public.meal_profiles
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage grocery categories"
  on public.grocery_categories
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage foods"
  on public.foods
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage food preferences"
  on public.food_preferences
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage preferred products"
  on public.preferred_products
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index household_memberships_user_id_idx
  on public.household_memberships (user_id);

create index household_memberships_household_id_idx
  on public.household_memberships (household_id);

create index meal_profiles_household_id_idx
  on public.meal_profiles (household_id);

create index grocery_categories_household_id_idx
  on public.grocery_categories (household_id);

create index foods_household_id_idx
  on public.foods (household_id);

create index foods_default_grocery_category_id_idx
  on public.foods (default_grocery_category_id);

create index food_preferences_household_id_idx
  on public.food_preferences (household_id);

create index food_preferences_meal_profile_id_idx
  on public.food_preferences (meal_profile_id);

create index food_preferences_food_id_idx
  on public.food_preferences (food_id);

create index preferred_products_household_id_idx
  on public.preferred_products (household_id);

create index preferred_products_food_id_idx
  on public.preferred_products (food_id);

