create type public.pantry_consumption_decision_status as enum (
  'confirmed',
  'skipped'
);

grant usage on type public.pantry_consumption_decision_status to authenticated, service_role;

create table public.pantry_consumption_decisions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  cooking_session_ingredient_id uuid not null,
  status public.pantry_consumption_decision_status not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (cooking_session_ingredient_id),
  check (note is null or length(trim(note)) > 0),
  foreign key (cooking_session_ingredient_id, household_id)
    references public.cooking_session_ingredients(id, household_id)
    on delete cascade
);

create function public.assert_consumption_decision_completed_food_ingredient()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status public.cooking_session_status;
  ingredient_food_id uuid;
begin
  select cs.status, csi.food_id
  into parent_status, ingredient_food_id
  from public.cooking_session_ingredients csi
  join public.cooking_sessions cs
    on cs.id = csi.cooking_session_id
    and cs.household_id = csi.household_id
  where csi.id = new.cooking_session_ingredient_id
    and csi.household_id = new.household_id;

  if parent_status is distinct from 'completed' then
    raise exception 'Pantry consumption decisions require a completed cooking session ingredient.'
      using errcode = '23514';
  end if;

  if ingredient_food_id is null then
    raise exception 'Pantry consumption decisions require a food-backed cooking session ingredient.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger set_pantry_consumption_decisions_updated_at
  before update on public.pantry_consumption_decisions
  for each row execute function public.set_updated_at();

create trigger assert_consumption_decision_completed_food_ingredient
  before insert or update on public.pantry_consumption_decisions
  for each row execute function public.assert_consumption_decision_completed_food_ingredient();

grant select, insert
  on public.pantry_consumption_decisions
  to authenticated;

grant select, insert, update, delete
  on public.pantry_consumption_decisions
  to service_role;

alter table public.pantry_consumption_decisions enable row level security;

create policy "Household members can read pantry consumption decisions"
  on public.pantry_consumption_decisions
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can create pantry consumption decisions"
  on public.pantry_consumption_decisions
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create index pantry_consumption_decisions_household_id_idx
  on public.pantry_consumption_decisions (household_id);

create index pantry_consumption_decisions_cooking_session_ingredient_id_idx
  on public.pantry_consumption_decisions (cooking_session_ingredient_id);

create index pantry_consumption_decisions_status_idx
  on public.pantry_consumption_decisions (status);
