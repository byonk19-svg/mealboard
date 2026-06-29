create type public.pantry_intake_decision_status as enum (
  'confirmed',
  'skipped'
);

grant usage on type public.pantry_intake_decision_status to authenticated, service_role;

create table public.pantry_intake_decisions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  grocery_list_item_id uuid not null,
  status public.pantry_intake_decision_status not null,
  created_pantry_item_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  unique (grocery_list_item_id),
  check (note is null or length(trim(note)) > 0),
  check (
    (status = 'confirmed' and created_pantry_item_id is not null)
    or (status = 'skipped' and created_pantry_item_id is null)
  ),
  foreign key (grocery_list_item_id, household_id)
    references public.grocery_list_items(id, household_id)
    on delete cascade,
  foreign key (created_pantry_item_id, household_id)
    references public.pantry_items(id, household_id)
    on delete set null (created_pantry_item_id)
);

create function public.assert_completed_grocery_item_for_intake_decision()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  grocery_list_status public.grocery_list_status;
begin
  select gl.status
  into grocery_list_status
  from public.grocery_list_items gli
  join public.grocery_lists gl
    on gl.id = gli.grocery_list_id
    and gl.household_id = gli.household_id
  where gli.id = new.grocery_list_item_id
    and gli.household_id = new.household_id;

  if grocery_list_status is distinct from 'completed' then
    raise exception 'Pantry intake decisions require a completed grocery list item.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger set_pantry_intake_decisions_updated_at
  before update on public.pantry_intake_decisions
  for each row execute function public.set_updated_at();

create trigger assert_completed_grocery_item_for_intake_decision
  before insert or update on public.pantry_intake_decisions
  for each row execute function public.assert_completed_grocery_item_for_intake_decision();

grant select, insert
  on public.pantry_intake_decisions
  to authenticated;

grant select, insert, update, delete
  on public.pantry_intake_decisions
  to service_role;

alter table public.pantry_intake_decisions enable row level security;

create policy "Household members can read pantry intake decisions"
  on public.pantry_intake_decisions
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can create pantry intake decisions"
  on public.pantry_intake_decisions
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create index pantry_intake_decisions_household_id_idx
  on public.pantry_intake_decisions (household_id);

create index pantry_intake_decisions_grocery_list_item_id_idx
  on public.pantry_intake_decisions (grocery_list_item_id);

create index pantry_intake_decisions_created_pantry_item_id_idx
  on public.pantry_intake_decisions (created_pantry_item_id)
  where created_pantry_item_id is not null;

create index pantry_intake_decisions_status_idx
  on public.pantry_intake_decisions (status);
