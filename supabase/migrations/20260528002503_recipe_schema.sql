create type public.recipe_status as enum (
  'idea',
  'tried',
  'approved',
  'favorite',
  'retired'
);

create type public.recipe_rating as enum (
  'love',
  'like',
  'okay',
  'dislike',
  'hard_no'
);

create type public.meal_type as enum (
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'drink',
  'side',
  'baby_meal',
  'other'
);

create type public.estimate_confidence as enum (
  'low',
  'medium',
  'high'
);

create type public.recipe_repeat_rule as enum (
  'weekly',
  'every_two_weeks',
  'monthly',
  'rarely'
);

grant usage on type public.recipe_status to authenticated, service_role;
grant usage on type public.recipe_rating to authenticated, service_role;
grant usage on type public.meal_type to authenticated, service_role;
grant usage on type public.estimate_confidence to authenticated, service_role;
grant usage on type public.recipe_repeat_rule to authenticated, service_role;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  description text,
  status public.recipe_status not null default 'idea',
  meal_type public.meal_type not null default 'dinner',
  servings numeric,
  prep_minutes integer,
  cook_minutes integer,
  effort_level text,
  repeat_rule public.recipe_repeat_rule,
  instructions text,
  notes text,
  estimated_calories_per_serving integer,
  estimated_protein_grams_per_serving integer,
  nutrition_confidence public.estimate_confidence,
  last_planned_at date,
  last_made_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, household_id),
  check (length(trim(name)) > 0),
  check (servings is null or servings > 0),
  check (prep_minutes is null or prep_minutes >= 0),
  check (cook_minutes is null or cook_minutes >= 0),
  check (estimated_calories_per_serving is null or estimated_calories_per_serving > 0),
  check (estimated_protein_grams_per_serving is null or estimated_protein_grams_per_serving >= 0)
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null,
  food_id uuid,
  display_name text not null,
  quantity numeric,
  unit text,
  grocery_category_id uuid,
  preparation text,
  notes text,
  optional boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (length(trim(display_name)) > 0),
  check (quantity is null or quantity > 0),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete cascade,
  foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete set null,
  foreign key (grocery_category_id, household_id)
    references public.grocery_categories(id, household_id)
    on delete set null
);

create table public.recipe_tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null,
  tag text not null,
  created_at timestamptz not null default now(),
  check (length(trim(tag)) > 0),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete cascade
);

create unique index recipe_tags_recipe_lower_tag_key
  on public.recipe_tags (recipe_id, lower(tag));

create table public.recipe_profile_approvals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null,
  meal_profile_id uuid not null,
  status public.recipe_status not null default 'idea',
  rating public.recipe_rating,
  approved_for_planning boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, meal_profile_id),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete cascade,
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete cascade
);

create table public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null,
  meal_profile_id uuid,
  weekly_plan_item_id uuid,
  rating public.recipe_rating,
  notes text,
  quick_tags text[] not null default '{}',
  made_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete cascade,
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete set null
);

create trigger set_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create trigger set_recipe_ingredients_updated_at
  before update on public.recipe_ingredients
  for each row execute function public.set_updated_at();

create trigger set_recipe_profile_approvals_updated_at
  before update on public.recipe_profile_approvals
  for each row execute function public.set_updated_at();

create trigger set_recipe_reviews_updated_at
  before update on public.recipe_reviews
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.recipes to authenticated, service_role;
grant select, insert, update, delete on public.recipe_ingredients to authenticated, service_role;
grant select, insert, update, delete on public.recipe_tags to authenticated, service_role;
grant select, insert, update, delete on public.recipe_profile_approvals to authenticated, service_role;
grant select, insert, update, delete on public.recipe_reviews to authenticated, service_role;

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.recipe_profile_approvals enable row level security;
alter table public.recipe_reviews enable row level security;

create policy "Household members can manage recipes"
  on public.recipes
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage recipe ingredients"
  on public.recipe_ingredients
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage recipe tags"
  on public.recipe_tags
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage recipe profile approvals"
  on public.recipe_profile_approvals
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage recipe reviews"
  on public.recipe_reviews
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index recipes_household_id_idx
  on public.recipes (household_id);

create index recipes_status_idx
  on public.recipes (status);

create index recipe_ingredients_household_id_idx
  on public.recipe_ingredients (household_id);

create index recipe_ingredients_recipe_id_idx
  on public.recipe_ingredients (recipe_id);

create index recipe_ingredients_food_id_idx
  on public.recipe_ingredients (food_id);

create index recipe_tags_household_id_idx
  on public.recipe_tags (household_id);

create index recipe_tags_recipe_id_idx
  on public.recipe_tags (recipe_id);

create index recipe_profile_approvals_household_id_idx
  on public.recipe_profile_approvals (household_id);

create index recipe_profile_approvals_recipe_id_idx
  on public.recipe_profile_approvals (recipe_id);

create index recipe_profile_approvals_meal_profile_id_idx
  on public.recipe_profile_approvals (meal_profile_id);

create index recipe_reviews_household_id_idx
  on public.recipe_reviews (household_id);

create index recipe_reviews_recipe_id_idx
  on public.recipe_reviews (recipe_id);
