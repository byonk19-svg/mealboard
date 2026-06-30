alter table public.pantry_items
  add column pantry_lot_revision bigint not null default 0;

comment on column public.pantry_items.pantry_lot_revision is
  'Monotonic lot version incremented on every pantry item update; stock reversal uses this to detect same-quantity stale lot edits.';

create function public.increment_pantry_item_lot_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.pantry_lot_revision = old.pantry_lot_revision + 1;
  return new;
end;
$$;

create trigger increment_pantry_item_lot_revision
  before update on public.pantry_items
  for each row execute function public.increment_pantry_item_lot_revision();

alter table public.pantry_consumption_stock_application_allocations
  add column pantry_updated_at_after timestamptz,
  add column pantry_lot_revision_after bigint;

comment on column public.pantry_consumption_stock_application_allocations.pantry_updated_at_after is
  'Pantry item updated_at captured after the application deduction for audit context.';

comment on column public.pantry_consumption_stock_application_allocations.pantry_lot_revision_after is
  'Pantry item lot revision captured after the application deduction; reversal uses this as the stale-lot guard so later lot edits cannot be silently overwritten.';

create function public.set_pantry_stock_allocation_lot_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pantry_updated_at_after is null or new.pantry_lot_revision_after is null then
    select items.updated_at, items.pantry_lot_revision
    into new.pantry_updated_at_after, new.pantry_lot_revision_after
    from public.pantry_items items
    where items.id = new.pantry_item_id
      and items.household_id = new.household_id;
  end if;

  return new;
end;
$$;

create trigger set_pantry_stock_allocation_lot_snapshot
  before insert on public.pantry_consumption_stock_application_allocations
  for each row execute function public.set_pantry_stock_allocation_lot_snapshot();

create function public.reverse_pantry_consumption_stock(
  p_household_id uuid,
  p_stock_application_id uuid,
  p_note text default null
)
returns table (
  status text,
  stock_application_id uuid,
  stock_application_reversal_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  normalized_note text := nullif(regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g'), '');
  allocation record;
  allocation_count integer;
  application_decision_id uuid;
  invalid_lot_count integer;
  existing_reversal_id uuid;
  new_reversal_id uuid;
begin
  if p_stock_application_id is null then
    raise exception 'Pantry stock reversal requires a stock application.'
      using errcode = '23514';
  end if;

  select applications.pantry_consumption_decision_id
  into application_decision_id
  from public.pantry_consumption_stock_applications applications
  where applications.id = p_stock_application_id
    and applications.household_id = p_household_id;

  if not found then
    raise exception 'Pantry stock reversal requires an existing stock application in this household.'
      using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(replace(application_decision_id::text, '-', ''), 1, 16))::bit(64)::bigint
  );

  select reversals.id
  into existing_reversal_id
  from public.pantry_consumption_stock_application_reversals reversals
  where reversals.household_id = p_household_id
    and reversals.stock_application_id = p_stock_application_id;

  if existing_reversal_id is not null then
    return query
    select 'already_reversed', p_stock_application_id, existing_reversal_id;
    return;
  end if;

  select count(*)::integer
  into allocation_count
  from public.pantry_consumption_stock_application_allocations allocations
  where allocations.household_id = p_household_id
    and allocations.stock_application_id = p_stock_application_id;

  if allocation_count = 0 then
    raise exception 'Pantry stock reversal requires stock application allocations.'
      using errcode = '23514';
  end if;

  with locked_lots as (
    select
      allocations.id as allocation_id,
      items.id as pantry_item_id,
      items.discarded_at,
      items.quantity,
      items.updated_at,
      items.pantry_lot_revision,
      lower(regexp_replace(trim(coalesce(items.unit, '')), '\s+', ' ', 'g')) as current_unit,
      lower(regexp_replace(trim(coalesce(allocations.unit, '')), '\s+', ' ', 'g')) as allocation_unit,
      allocations.pantry_quantity_after,
      allocations.pantry_updated_at_after,
      allocations.pantry_lot_revision_after
    from public.pantry_consumption_stock_application_allocations allocations
    join public.pantry_items items
      on items.id = allocations.pantry_item_id
      and items.household_id = allocations.household_id
    where allocations.household_id = p_household_id
      and allocations.stock_application_id = p_stock_application_id
    order by items.id
    for update of items
  )
  select count(*) filter (
    where locked_lots.discarded_at is not null
      or locked_lots.quantity is null
      or locked_lots.current_unit is distinct from locked_lots.allocation_unit
      or locked_lots.quantity is distinct from locked_lots.pantry_quantity_after
      or locked_lots.pantry_lot_revision is distinct from locked_lots.pantry_lot_revision_after
  )::integer
  into invalid_lot_count
  from locked_lots;

  if invalid_lot_count > 0 then
    raise exception 'Pantry stock reversal selected a stale or unavailable pantry lot.'
      using errcode = '23514';
  end if;

  insert into public.pantry_consumption_stock_application_reversals (
    household_id,
    stock_application_id,
    note
  )
  values (
    p_household_id,
    p_stock_application_id,
    normalized_note
  )
  returning id into new_reversal_id;

  for allocation in
    select
      allocations.id as stock_application_allocation_id,
      allocations.pantry_item_id,
      allocations.applied_quantity,
      allocations.unit,
      items.quantity as pantry_quantity_before
    from public.pantry_consumption_stock_application_allocations allocations
    join public.pantry_items items
      on items.id = allocations.pantry_item_id
      and items.household_id = allocations.household_id
    where allocations.household_id = p_household_id
      and allocations.stock_application_id = p_stock_application_id
    order by items.id
  loop
    update public.pantry_items
    set quantity = allocation.pantry_quantity_before + allocation.applied_quantity
    where id = allocation.pantry_item_id
      and household_id = p_household_id;

    insert into public.pantry_consumption_stock_application_reversal_allocations (
      household_id,
      stock_application_reversal_id,
      stock_application_allocation_id,
      pantry_item_id,
      restored_quantity,
      unit,
      pantry_quantity_before,
      pantry_quantity_after
    )
    values (
      p_household_id,
      new_reversal_id,
      allocation.stock_application_allocation_id,
      allocation.pantry_item_id,
      allocation.applied_quantity,
      allocation.unit,
      allocation.pantry_quantity_before,
      allocation.pantry_quantity_before + allocation.applied_quantity
    );
  end loop;

  return query select 'reversed', p_stock_application_id, new_reversal_id;
exception
  when unique_violation then
    select reversals.id
    into existing_reversal_id
    from public.pantry_consumption_stock_application_reversals reversals
    where reversals.household_id = p_household_id
      and reversals.stock_application_id = p_stock_application_id;

    if existing_reversal_id is not null then
      return query
      select 'already_reversed', p_stock_application_id, existing_reversal_id;
      return;
    end if;

    raise;
end;
$$;

revoke execute on function public.reverse_pantry_consumption_stock(
  uuid,
  uuid,
  text
) from public;

grant execute on function public.reverse_pantry_consumption_stock(
  uuid,
  uuid,
  text
) to authenticated, service_role;
