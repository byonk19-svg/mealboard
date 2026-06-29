create table public.pantry_consumption_stock_applications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pantry_consumption_decision_id uuid not null,
  applied_quantity numeric not null,
  applied_unit text not null,
  applied_by_user_id uuid references auth.users(id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  unique (pantry_consumption_decision_id),
  check (applied_quantity > 0),
  check (length(trim(applied_unit)) > 0),
  check (note is null or length(trim(note)) > 0),
  foreign key (pantry_consumption_decision_id, household_id)
    references public.pantry_consumption_decisions(id, household_id)
    on delete restrict
);

comment on table public.pantry_consumption_stock_applications is
  'Append-only audit header for explicit stock application from a confirmed pantry consumption decision. One row per decision keeps reversal terminal in V0; deferred constraints require one or more same-unit lot allocations whose sum equals applied_quantity.';

create table public.pantry_consumption_stock_application_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  stock_application_id uuid not null,
  pantry_item_id uuid not null,
  applied_quantity numeric not null,
  unit text not null,
  pantry_quantity_before numeric not null,
  pantry_quantity_after numeric not null,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  unique (stock_application_id, pantry_item_id),
  check (applied_quantity > 0),
  check (length(trim(unit)) > 0),
  check (pantry_quantity_before >= 0),
  check (pantry_quantity_after >= 0),
  check (pantry_quantity_before >= pantry_quantity_after),
  check (pantry_quantity_before - pantry_quantity_after = applied_quantity),
  foreign key (stock_application_id, household_id)
    references public.pantry_consumption_stock_applications(id, household_id)
    on delete restrict,
  foreign key (pantry_item_id, household_id)
    references public.pantry_items(id, household_id)
    on delete restrict
);

create table public.pantry_consumption_stock_application_reversals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  stock_application_id uuid not null,
  reversed_by_user_id uuid references auth.users(id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  unique (stock_application_id),
  check (note is null or length(trim(note)) > 0),
  foreign key (stock_application_id, household_id)
    references public.pantry_consumption_stock_applications(id, household_id)
    on delete restrict
);

comment on table public.pantry_consumption_stock_application_reversals is
  'Append-only terminal reversal marker for a stock application. V0 does not permit re-application after reversal; deferred constraints require reversal allocations for the original allocation rows.';

create table public.pantry_consumption_stock_application_reversal_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  stock_application_reversal_id uuid not null,
  stock_application_allocation_id uuid not null,
  pantry_item_id uuid not null,
  restored_quantity numeric not null,
  unit text not null,
  pantry_quantity_before numeric not null,
  pantry_quantity_after numeric not null,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  unique (stock_application_reversal_id, stock_application_allocation_id),
  check (restored_quantity > 0),
  check (length(trim(unit)) > 0),
  check (pantry_quantity_before >= 0),
  check (pantry_quantity_after >= 0),
  check (pantry_quantity_after >= pantry_quantity_before),
  check (pantry_quantity_after - pantry_quantity_before = restored_quantity),
  foreign key (stock_application_reversal_id, household_id)
    references public.pantry_consumption_stock_application_reversals(id, household_id)
    on delete restrict,
  foreign key (stock_application_allocation_id, household_id)
    references public.pantry_consumption_stock_application_allocations(id, household_id)
    on delete restrict,
  foreign key (pantry_item_id, household_id)
    references public.pantry_items(id, household_id)
    on delete restrict
);

create function public.assert_stock_application_confirmed_decision()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  decision_status public.pantry_consumption_decision_status;
begin
  select status
  into decision_status
  from public.pantry_consumption_decisions
  where id = new.pantry_consumption_decision_id
    and household_id = new.household_id;

  if decision_status is distinct from 'confirmed' then
    raise exception 'Pantry stock applications require a confirmed consumption decision.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.set_pantry_stock_application_actor()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
begin
  if acting_user_id is not null then
    if new.applied_by_user_id is null then
      new.applied_by_user_id := acting_user_id;
    elsif new.applied_by_user_id is distinct from acting_user_id then
      raise exception 'Pantry stock application actor must match the authenticated user.'
        using errcode = '42501';
    end if;
  end if;

  if new.applied_by_user_id is not null and not exists (
    select 1
    from public.household_memberships memberships
    where memberships.household_id = new.household_id
      and memberships.user_id = new.applied_by_user_id
  ) then
    raise exception 'Pantry stock application actor must be a household member.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.set_pantry_stock_reversal_actor()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
begin
  if acting_user_id is not null then
    if new.reversed_by_user_id is null then
      new.reversed_by_user_id := acting_user_id;
    elsif new.reversed_by_user_id is distinct from acting_user_id then
      raise exception 'Pantry stock reversal actor must match the authenticated user.'
        using errcode = '42501';
    end if;
  end if;

  if new.reversed_by_user_id is not null and not exists (
    select 1
    from public.household_memberships memberships
    where memberships.household_id = new.household_id
      and memberships.user_id = new.reversed_by_user_id
  ) then
    raise exception 'Pantry stock reversal actor must be a household member.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.assert_stock_application_not_reversed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.pantry_consumption_stock_application_reversals reversals
    where reversals.stock_application_id = new.stock_application_id
      and reversals.household_id = new.household_id
  ) then
    raise exception 'Reversed pantry stock applications cannot receive new allocations.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.assert_stock_application_allocations_complete()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_application_id uuid;
  target_household_id uuid;
  application_quantity numeric;
  application_unit text;
  allocation_count integer;
  allocation_quantity numeric;
  incompatible_unit_count integer;
begin
  if tg_table_name = 'pantry_consumption_stock_applications' then
    target_application_id := coalesce(new.id, old.id);
  else
    target_application_id := coalesce(new.stock_application_id, old.stock_application_id);
  end if;

  target_household_id := coalesce(new.household_id, old.household_id);

  select applied_quantity, applied_unit
  into application_quantity, application_unit
  from public.pantry_consumption_stock_applications
  where id = target_application_id
    and household_id = target_household_id;

  if not found then
    return coalesce(new, old);
  end if;

  select
    count(*)::integer,
    coalesce(sum(allocations.applied_quantity), 0),
    count(*) filter (where allocations.unit is distinct from application_unit)::integer
  into allocation_count, allocation_quantity, incompatible_unit_count
  from public.pantry_consumption_stock_application_allocations allocations
  where allocations.stock_application_id = target_application_id
    and allocations.household_id = target_household_id;

  if allocation_count = 0 then
    raise exception 'Pantry stock applications require at least one lot allocation.'
      using errcode = '23514';
  end if;

  if incompatible_unit_count > 0 then
    raise exception 'Pantry stock allocation units must match the application unit.'
      using errcode = '23514';
  end if;

  if allocation_quantity <> application_quantity then
    raise exception 'Pantry stock allocation quantities must sum to the application quantity.'
      using errcode = '23514';
  end if;

  return coalesce(new, old);
end;
$$;

create function public.assert_stock_reversal_allocation_matches_application()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  reversal_application_id uuid;
  allocation_application_id uuid;
  allocation_pantry_item_id uuid;
  allocation_quantity numeric;
  allocation_unit text;
begin
  select stock_application_id
  into reversal_application_id
  from public.pantry_consumption_stock_application_reversals
  where id = new.stock_application_reversal_id
    and household_id = new.household_id;

  select stock_application_id, pantry_item_id, applied_quantity, unit
  into allocation_application_id, allocation_pantry_item_id, allocation_quantity, allocation_unit
  from public.pantry_consumption_stock_application_allocations
  where id = new.stock_application_allocation_id
    and household_id = new.household_id;

  if reversal_application_id is distinct from allocation_application_id then
    raise exception 'Pantry stock reversal allocations must reference allocations from the same stock application.'
      using errcode = '23514';
  end if;

  if allocation_pantry_item_id is distinct from new.pantry_item_id then
    raise exception 'Pantry stock reversal allocation pantry item must match the original allocation.'
      using errcode = '23514';
  end if;

  if allocation_quantity is distinct from new.restored_quantity then
    raise exception 'Pantry stock reversal allocation quantity must match the original allocation.'
      using errcode = '23514';
  end if;

  if allocation_unit is distinct from new.unit then
    raise exception 'Pantry stock reversal allocation unit must match the original allocation.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.assert_stock_reversal_allocations_complete()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_reversal_id uuid;
  target_household_id uuid;
  target_application_id uuid;
  original_allocation_count integer;
  reversal_allocation_count integer;
begin
  if tg_table_name = 'pantry_consumption_stock_application_reversals' then
    target_reversal_id := coalesce(new.id, old.id);
  else
    target_reversal_id := coalesce(new.stock_application_reversal_id, old.stock_application_reversal_id);
  end if;

  target_household_id := coalesce(new.household_id, old.household_id);

  select stock_application_id
  into target_application_id
  from public.pantry_consumption_stock_application_reversals
  where id = target_reversal_id
    and household_id = target_household_id;

  if not found then
    return coalesce(new, old);
  end if;

  select count(*)::integer
  into original_allocation_count
  from public.pantry_consumption_stock_application_allocations allocations
  where allocations.stock_application_id = target_application_id
    and allocations.household_id = target_household_id;

  select count(*)::integer
  into reversal_allocation_count
  from public.pantry_consumption_stock_application_reversal_allocations reversal_allocations
  where reversal_allocations.stock_application_reversal_id = target_reversal_id
    and reversal_allocations.household_id = target_household_id;

  if original_allocation_count = 0 then
    raise exception 'Pantry stock reversals require an application with lot allocations.'
      using errcode = '23514';
  end if;

  if reversal_allocation_count <> original_allocation_count then
    raise exception 'Pantry stock reversals require reversal allocations for each original allocation.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger assert_stock_application_confirmed_decision
  before insert or update on public.pantry_consumption_stock_applications
  for each row execute function public.assert_stock_application_confirmed_decision();

create trigger set_pantry_stock_application_actor
  before insert on public.pantry_consumption_stock_applications
  for each row execute function public.set_pantry_stock_application_actor();

create trigger assert_stock_application_not_reversed
  before insert or update on public.pantry_consumption_stock_application_allocations
  for each row execute function public.assert_stock_application_not_reversed();

create constraint trigger pantry_stock_application_allocations_complete
  after insert or update on public.pantry_consumption_stock_applications
  deferrable initially deferred
  for each row execute function public.assert_stock_application_allocations_complete();

create constraint trigger pantry_stock_application_allocations_complete
  after insert or update or delete on public.pantry_consumption_stock_application_allocations
  deferrable initially deferred
  for each row execute function public.assert_stock_application_allocations_complete();

create trigger set_pantry_stock_reversal_actor
  before insert on public.pantry_consumption_stock_application_reversals
  for each row execute function public.set_pantry_stock_reversal_actor();

create trigger assert_stock_reversal_allocation_matches_application
  before insert or update on public.pantry_consumption_stock_application_reversal_allocations
  for each row execute function public.assert_stock_reversal_allocation_matches_application();

create constraint trigger pantry_stock_reversal_allocations_complete
  after insert or update on public.pantry_consumption_stock_application_reversals
  deferrable initially deferred
  for each row execute function public.assert_stock_reversal_allocations_complete();

create constraint trigger pantry_stock_reversal_allocations_complete
  after insert or update or delete on public.pantry_consumption_stock_application_reversal_allocations
  deferrable initially deferred
  for each row execute function public.assert_stock_reversal_allocations_complete();

grant select, insert
  on public.pantry_consumption_stock_applications,
     public.pantry_consumption_stock_application_allocations,
     public.pantry_consumption_stock_application_reversals,
     public.pantry_consumption_stock_application_reversal_allocations
  to authenticated;

grant select, insert, update, delete
  on public.pantry_consumption_stock_applications,
     public.pantry_consumption_stock_application_allocations,
     public.pantry_consumption_stock_application_reversals,
     public.pantry_consumption_stock_application_reversal_allocations
  to service_role;

alter table public.pantry_consumption_stock_applications enable row level security;
alter table public.pantry_consumption_stock_application_allocations enable row level security;
alter table public.pantry_consumption_stock_application_reversals enable row level security;
alter table public.pantry_consumption_stock_application_reversal_allocations enable row level security;

create policy "Household members can read pantry stock applications"
  on public.pantry_consumption_stock_applications
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can create pantry stock applications"
  on public.pantry_consumption_stock_applications
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy "Household members can read pantry stock allocations"
  on public.pantry_consumption_stock_application_allocations
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can create pantry stock allocations"
  on public.pantry_consumption_stock_application_allocations
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy "Household members can read pantry stock reversals"
  on public.pantry_consumption_stock_application_reversals
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can create pantry stock reversals"
  on public.pantry_consumption_stock_application_reversals
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy "Household members can read pantry stock reversal allocations"
  on public.pantry_consumption_stock_application_reversal_allocations
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "Household members can create pantry stock reversal allocations"
  on public.pantry_consumption_stock_application_reversal_allocations
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create index pantry_stock_applications_household_id_idx
  on public.pantry_consumption_stock_applications (household_id);

create index pantry_stock_applications_created_at_idx
  on public.pantry_consumption_stock_applications (household_id, created_at desc);

create index pantry_stock_applications_actor_idx
  on public.pantry_consumption_stock_applications (household_id, applied_by_user_id)
  where applied_by_user_id is not null;

create index pantry_stock_allocations_application_id_idx
  on public.pantry_consumption_stock_application_allocations (stock_application_id);

create index pantry_stock_allocations_created_at_idx
  on public.pantry_consumption_stock_application_allocations (household_id, created_at desc);

create index pantry_stock_allocations_pantry_item_id_idx
  on public.pantry_consumption_stock_application_allocations (household_id, pantry_item_id);

create index pantry_stock_allocations_item_created_at_idx
  on public.pantry_consumption_stock_application_allocations (household_id, pantry_item_id, created_at desc);

create index pantry_stock_reversals_household_id_idx
  on public.pantry_consumption_stock_application_reversals (household_id);

create index pantry_stock_reversals_created_at_idx
  on public.pantry_consumption_stock_application_reversals (household_id, created_at desc);

create index pantry_stock_reversals_actor_idx
  on public.pantry_consumption_stock_application_reversals (household_id, reversed_by_user_id)
  where reversed_by_user_id is not null;

create index pantry_stock_reversal_allocations_reversal_id_idx
  on public.pantry_consumption_stock_application_reversal_allocations (stock_application_reversal_id);

create index pantry_stock_reversal_allocations_created_at_idx
  on public.pantry_consumption_stock_application_reversal_allocations (household_id, created_at desc);

create index pantry_stock_reversal_allocations_original_allocation_id_idx
  on public.pantry_consumption_stock_application_reversal_allocations (stock_application_allocation_id);

create index pantry_stock_reversal_allocations_pantry_item_id_idx
  on public.pantry_consumption_stock_application_reversal_allocations (household_id, pantry_item_id);
