create type public.adult_day_type as enum (
  'work_day',
  'off_day'
);

create type public.weekly_plan_status as enum (
  'draft',
  'ready_for_grocery_review',
  'grocery_generated',
  'shopping_started',
  'completed'
);

create type public.weekly_goal_type as enum (
  'weight_loss',
  'high_protein',
  'easy_week',
  'low_effort',
  'use_leftovers',
  'grill_night',
  'family_favorites',
  'picky_eater_safe',
  'low_prep_work_meals',
  'baby_variety_week'
);

create type public.calorie_strictness as enum (
  'strict',
  'flexible',
  'loose'
);

create type public.meal_component_type as enum (
  'main',
  'side',
  'add_on',
  'snack',
  'drink',
  'dessert',
  'baby_food',
  'sauce',
  'topping',
  'other'
);

grant usage on type public.adult_day_type to authenticated, service_role;
grant usage on type public.weekly_plan_status to authenticated, service_role;
grant usage on type public.weekly_goal_type to authenticated, service_role;
grant usage on type public.calorie_strictness to authenticated, service_role;
grant usage on type public.meal_component_type to authenticated, service_role;

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start_date date not null,
  status public.weekly_plan_status not null default 'draft',
  calorie_strictness public.calorie_strictness not null default 'flexible',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (household_id, week_start_date)
);

create table public.weekly_plan_profile_days (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_plan_id uuid not null,
  meal_profile_id uuid not null,
  plan_date date not null,
  adult_day_type public.adult_day_type,
  day_label text,
  calorie_target_override integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekly_plan_id, meal_profile_id, plan_date),
  check (calorie_target_override is null or calorie_target_override > 0),
  foreign key (weekly_plan_id, household_id)
    references public.weekly_plans(id, household_id)
    on delete cascade,
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete cascade
);

create table public.weekly_plan_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_plan_id uuid not null,
  meal_profile_id uuid,
  goal public.weekly_goal_type not null,
  created_at timestamptz not null default now(),
  foreign key (weekly_plan_id, household_id)
    references public.weekly_plans(id, household_id)
    on delete cascade,
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete cascade
);

create unique index weekly_plan_goals_plan_profile_goal_key
  on public.weekly_plan_goals (
    weekly_plan_id,
    coalesce(meal_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
    goal
  );

create table public.weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_plan_id uuid not null,
  meal_profile_id uuid,
  plan_date date not null,
  meal_type public.meal_type not null,
  component_type public.meal_component_type not null default 'main',
  recipe_id uuid,
  display_name text not null,
  scale_factor numeric not null default 1,
  is_locked boolean not null default false,
  is_approved boolean not null default false,
  is_try_this boolean not null default false,
  is_backup boolean not null default false,
  reason_labels text[] not null default '{}',
  why_this text,
  notes text,
  estimated_calories integer,
  estimated_protein_grams integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(display_name)) > 0),
  check (scale_factor > 0),
  check (estimated_calories is null or estimated_calories >= 0),
  check (estimated_protein_grams is null or estimated_protein_grams >= 0),
  foreign key (weekly_plan_id, household_id)
    references public.weekly_plans(id, household_id)
    on delete cascade,
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete set null (meal_profile_id),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete set null (recipe_id)
);

create trigger set_weekly_plans_updated_at
  before update on public.weekly_plans
  for each row execute function public.set_updated_at();

create trigger set_weekly_plan_profile_days_updated_at
  before update on public.weekly_plan_profile_days
  for each row execute function public.set_updated_at();

create trigger set_weekly_plan_items_updated_at
  before update on public.weekly_plan_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.weekly_plans to authenticated, service_role;
grant select, insert, update, delete on public.weekly_plan_profile_days to authenticated, service_role;
grant select, insert, update, delete on public.weekly_plan_goals to authenticated, service_role;
grant select, insert, update, delete on public.weekly_plan_items to authenticated, service_role;

alter table public.weekly_plans enable row level security;
alter table public.weekly_plan_profile_days enable row level security;
alter table public.weekly_plan_goals enable row level security;
alter table public.weekly_plan_items enable row level security;

create policy "Household members can manage weekly plans"
  on public.weekly_plans
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage weekly plan profile days"
  on public.weekly_plan_profile_days
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage weekly plan goals"
  on public.weekly_plan_goals
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage weekly plan items"
  on public.weekly_plan_items
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index weekly_plans_household_id_idx
  on public.weekly_plans (household_id);

create index weekly_plan_profile_days_household_id_idx
  on public.weekly_plan_profile_days (household_id);

create index weekly_plan_profile_days_weekly_plan_id_idx
  on public.weekly_plan_profile_days (weekly_plan_id);

create index weekly_plan_profile_days_meal_profile_id_idx
  on public.weekly_plan_profile_days (meal_profile_id);

create index weekly_plan_goals_household_id_idx
  on public.weekly_plan_goals (household_id);

create index weekly_plan_goals_weekly_plan_id_idx
  on public.weekly_plan_goals (weekly_plan_id);

create index weekly_plan_items_household_id_idx
  on public.weekly_plan_items (household_id);

create index weekly_plan_items_weekly_plan_id_idx
  on public.weekly_plan_items (weekly_plan_id);

create index weekly_plan_items_plan_date_idx
  on public.weekly_plan_items (plan_date);
