create type public.cooking_session_status as enum (
  'active',
  'paused',
  'completed',
  'abandoned'
);

create type public.cooking_timer_status as enum (
  'ready',
  'running',
  'paused',
  'expired',
  'dismissed',
  'canceled'
);

grant usage on type public.cooking_session_status to authenticated, service_role;
grant usage on type public.cooking_timer_status to authenticated, service_role;

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null,
  section_label text,
  instruction text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (recipe_id, sort_order),
  check (length(trim(instruction)) > 0),
  check (section_label is null or length(trim(section_label)) > 0),
  check (sort_order >= 0),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete cascade
);

create table public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid not null,
  weekly_plan_item_id uuid,
  status public.cooking_session_status not null default 'active',
  current_step_sort_order integer,
  recipe_name_snapshot text not null,
  servings_snapshot numeric,
  scale_factor_snapshot numeric not null default 1,
  recipe_updated_at_snapshot timestamptz,
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  completed_at timestamptz,
  abandoned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (length(trim(recipe_name_snapshot)) > 0),
  check (current_step_sort_order is null or current_step_sort_order >= 0),
  check (servings_snapshot is null or servings_snapshot > 0),
  check (scale_factor_snapshot > 0),
  check (
    (status = 'completed' and completed_at is not null and abandoned_at is null)
    or (status = 'abandoned' and abandoned_at is not null and completed_at is null)
    or (status = 'paused' and paused_at is not null and completed_at is null and abandoned_at is null)
    or (status = 'active' and completed_at is null and abandoned_at is null)
  ),
  foreign key (recipe_id, household_id)
    references public.recipes(id, household_id)
    on delete cascade,
  foreign key (weekly_plan_item_id, household_id)
    references public.weekly_plan_items(id, household_id)
    on delete set null (weekly_plan_item_id)
);

create table public.cooking_session_ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cooking_session_id uuid not null,
  recipe_ingredient_id uuid,
  food_id uuid,
  display_name text not null,
  quantity numeric,
  unit text,
  preparation text,
  notes text,
  optional boolean not null default false,
  sort_order integer not null default 0,
  is_ready boolean not null default false,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (cooking_session_id, sort_order),
  check (length(trim(display_name)) > 0),
  check (quantity is null or quantity > 0),
  check (sort_order >= 0),
  check (is_ready or ready_at is null),
  foreign key (cooking_session_id, household_id)
    references public.cooking_sessions(id, household_id)
    on delete cascade,
  foreign key (recipe_ingredient_id, household_id)
    references public.recipe_ingredients(id, household_id)
    on delete set null (recipe_ingredient_id),
  foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete set null (food_id)
);

create table public.cooking_session_steps (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cooking_session_id uuid not null,
  recipe_step_id uuid,
  section_label text,
  instruction text not null,
  sort_order integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (id, household_id, cooking_session_id),
  unique (cooking_session_id, sort_order),
  check (length(trim(instruction)) > 0),
  check (section_label is null or length(trim(section_label)) > 0),
  check (sort_order >= 0),
  check (is_completed or completed_at is null),
  foreign key (cooking_session_id, household_id)
    references public.cooking_sessions(id, household_id)
    on delete cascade,
  foreign key (recipe_step_id, household_id)
    references public.recipe_steps(id, household_id)
    on delete set null (recipe_step_id)
);

create table public.cooking_timers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cooking_session_id uuid not null,
  cooking_session_step_id uuid,
  label text,
  status public.cooking_timer_status not null default 'ready',
  duration_seconds integer not null,
  remaining_seconds integer,
  started_at timestamptz,
  paused_at timestamptz,
  expires_at timestamptz,
  expired_at timestamptz,
  dismissed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (label is null or length(trim(label)) > 0),
  check (duration_seconds > 0),
  check (remaining_seconds is null or remaining_seconds >= 0),
  check (
    (status = 'ready' and started_at is null and expires_at is null and expired_at is null and dismissed_at is null and canceled_at is null)
    or (status = 'running' and started_at is not null and expires_at is not null and expired_at is null and dismissed_at is null and canceled_at is null)
    or (status = 'paused' and started_at is not null and paused_at is not null and remaining_seconds is not null and expired_at is null and dismissed_at is null and canceled_at is null)
    or (status = 'expired' and expired_at is not null and dismissed_at is null and canceled_at is null)
    or (status = 'dismissed' and dismissed_at is not null and canceled_at is null)
    or (status = 'canceled' and canceled_at is not null)
  ),
  foreign key (cooking_session_id, household_id)
    references public.cooking_sessions(id, household_id)
    on delete cascade,
  foreign key (cooking_session_step_id, household_id, cooking_session_id)
    references public.cooking_session_steps(id, household_id, cooking_session_id)
    on delete set null (cooking_session_step_id)
);

create trigger set_recipe_steps_updated_at
  before update on public.recipe_steps
  for each row execute function public.set_updated_at();

create trigger set_cooking_sessions_updated_at
  before update on public.cooking_sessions
  for each row execute function public.set_updated_at();

create trigger set_cooking_session_ingredients_updated_at
  before update on public.cooking_session_ingredients
  for each row execute function public.set_updated_at();

create trigger set_cooking_session_steps_updated_at
  before update on public.cooking_session_steps
  for each row execute function public.set_updated_at();

create trigger set_cooking_timers_updated_at
  before update on public.cooking_timers
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.recipe_steps to authenticated, service_role;
grant select, insert, update, delete on public.cooking_sessions to authenticated, service_role;
grant select, insert, update, delete on public.cooking_session_ingredients to authenticated, service_role;
grant select, insert, update, delete on public.cooking_session_steps to authenticated, service_role;
grant select, insert, update, delete on public.cooking_timers to authenticated, service_role;

alter table public.recipe_steps enable row level security;
alter table public.cooking_sessions enable row level security;
alter table public.cooking_session_ingredients enable row level security;
alter table public.cooking_session_steps enable row level security;
alter table public.cooking_timers enable row level security;

create policy "Household members can manage recipe steps"
  on public.recipe_steps
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage cooking sessions"
  on public.cooking_sessions
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage cooking session ingredients"
  on public.cooking_session_ingredients
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage cooking session steps"
  on public.cooking_session_steps
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can manage cooking timers"
  on public.cooking_timers
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index recipe_steps_household_id_idx
  on public.recipe_steps (household_id);

create index recipe_steps_recipe_id_idx
  on public.recipe_steps (recipe_id);

create index recipe_steps_recipe_sort_order_idx
  on public.recipe_steps (recipe_id, sort_order);

create index cooking_sessions_household_id_idx
  on public.cooking_sessions (household_id);

create index cooking_sessions_recipe_id_idx
  on public.cooking_sessions (recipe_id);

create index cooking_sessions_weekly_plan_item_id_idx
  on public.cooking_sessions (weekly_plan_item_id);

create index cooking_sessions_status_idx
  on public.cooking_sessions (status);

create index cooking_sessions_active_recipe_idx
  on public.cooking_sessions (household_id, recipe_id, updated_at desc)
  where status in ('active', 'paused');

create index cooking_sessions_active_weekly_plan_item_idx
  on public.cooking_sessions (household_id, weekly_plan_item_id, updated_at desc)
  where weekly_plan_item_id is not null and status in ('active', 'paused');

create index cooking_session_ingredients_household_id_idx
  on public.cooking_session_ingredients (household_id);

create index cooking_session_ingredients_session_id_idx
  on public.cooking_session_ingredients (cooking_session_id);

create index cooking_session_ingredients_recipe_ingredient_id_idx
  on public.cooking_session_ingredients (recipe_ingredient_id);

create index cooking_session_ingredients_food_id_idx
  on public.cooking_session_ingredients (food_id);

create index cooking_session_steps_household_id_idx
  on public.cooking_session_steps (household_id);

create index cooking_session_steps_session_sort_order_idx
  on public.cooking_session_steps (cooking_session_id, sort_order);

create index cooking_session_steps_recipe_step_id_idx
  on public.cooking_session_steps (recipe_step_id);

create index cooking_timers_household_id_idx
  on public.cooking_timers (household_id);

create index cooking_timers_session_id_idx
  on public.cooking_timers (cooking_session_id);

create index cooking_timers_session_step_id_idx
  on public.cooking_timers (cooking_session_step_id);

create index cooking_timers_status_idx
  on public.cooking_timers (status);

create index cooking_timers_running_expires_at_idx
  on public.cooking_timers (expires_at)
  where status = 'running';
