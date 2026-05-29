create type public.staple_frequency as enum (
  'weekly',
  'every_two_weeks',
  'as_needed'
);

grant usage on type public.staple_frequency to authenticated, service_role;

create table public.staples (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  meal_profile_id uuid,
  food_id uuid,
  display_name text not null,
  default_quantity numeric,
  default_unit text,
  preferred_quantity_text text,
  grocery_category_id uuid,
  frequency public.staple_frequency not null default 'as_needed',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  check (length(trim(display_name)) > 0),
  check (default_quantity is null or default_quantity > 0),
  check (default_unit is null or length(trim(default_unit)) > 0),
  check (
    preferred_quantity_text is null
    or length(trim(preferred_quantity_text)) > 0
  ),
  foreign key (meal_profile_id, household_id)
    references public.meal_profiles(id, household_id)
    on delete set null (meal_profile_id),
  foreign key (food_id, household_id)
    references public.foods(id, household_id)
    on delete set null (food_id),
  foreign key (grocery_category_id, household_id)
    references public.grocery_categories(id, household_id)
    on delete set null (grocery_category_id)
);

create trigger set_staples_updated_at
  before update on public.staples
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.staples to authenticated, service_role;

alter table public.staples enable row level security;

create policy "Household members can manage staples"
  on public.staples
  for all
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create index staples_household_id_idx
  on public.staples (household_id);

create index staples_meal_profile_id_idx
  on public.staples (meal_profile_id);

create index staples_food_id_idx
  on public.staples (food_id);

create index staples_grocery_category_id_idx
  on public.staples (grocery_category_id);

create index staples_active_idx
  on public.staples (active)
  where active = true;

create index staples_frequency_idx
  on public.staples (frequency);
