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
    status = 'confirmed'
    or created_pantry_item_id is null
  ),
  foreign key (grocery_list_item_id, household_id)
    references public.grocery_list_items(id, household_id)
    on delete cascade,
  foreign key (created_pantry_item_id, household_id)
    references public.pantry_items(id, household_id)
    on delete set null (created_pantry_item_id)
);

create trigger set_pantry_intake_decisions_updated_at
  before update on public.pantry_intake_decisions
  for each row execute function public.set_updated_at();

grant select, insert, update, delete
  on public.pantry_intake_decisions
  to authenticated, service_role;

alter table public.pantry_intake_decisions enable row level security;

create policy "Household members can manage pantry intake decisions"
  on public.pantry_intake_decisions
  for all
  to authenticated
  using (public.is_household_member(household_id))
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
