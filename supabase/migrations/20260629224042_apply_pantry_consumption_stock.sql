alter table public.pantry_items
  drop constraint if exists pantry_items_quantity_check;

alter table public.pantry_items
  add constraint pantry_items_quantity_check
  check (quantity is null or quantity >= 0);

create function public.apply_pantry_consumption_stock(
  p_household_id uuid,
  p_pantry_consumption_decision_id uuid,
  p_applied_quantity numeric,
  p_applied_unit text,
  p_allocations jsonb,
  p_note text default null
)
returns table (
  status text,
  stock_application_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  normalized_applied_unit text := lower(regexp_replace(trim(coalesce(p_applied_unit, '')), '\s+', ' ', 'g'));
  normalized_note text := nullif(regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g'), '');
  allocation_count integer;
  distinct_lot_count integer;
  invalid_allocation_count integer;
  allocation_quantity numeric;
  selected_lot_count integer;
  ineligible_lot_count integer;
  overdraw_lot_count integer;
  decision_status public.pantry_consumption_decision_status;
  ingredient_food_id uuid;
  session_status public.cooking_session_status;
  existing_application_id uuid;
  existing_reversal_id uuid;
  existing_payload_matches boolean;
  new_application_id uuid;
  allocation record;
begin
  perform pg_advisory_xact_lock(
    ('x' || substr(replace(p_pantry_consumption_decision_id::text, '-', ''), 1, 16))::bit(64)::bigint
  );

  if p_applied_quantity is null or p_applied_quantity <= 0 then
    raise exception 'Pantry stock application quantity must be greater than zero.'
      using errcode = '23514';
  end if;

  if normalized_applied_unit = '' then
    raise exception 'Pantry stock application unit is required.'
      using errcode = '23514';
  end if;

  if jsonb_typeof(p_allocations) is distinct from 'array' then
    raise exception 'Pantry stock application allocations must be an array.'
      using errcode = '23514';
  end if;

  select
    decisions.status,
    ingredients.food_id,
    sessions.status
  into
    decision_status,
    ingredient_food_id,
    session_status
  from public.pantry_consumption_decisions decisions
  join public.cooking_session_ingredients ingredients
    on ingredients.id = decisions.cooking_session_ingredient_id
    and ingredients.household_id = decisions.household_id
  join public.cooking_sessions sessions
    on sessions.id = ingredients.cooking_session_id
    and sessions.household_id = ingredients.household_id
  where decisions.id = p_pantry_consumption_decision_id
    and decisions.household_id = p_household_id;

  if not found then
    raise exception 'Pantry stock application requires an existing consumption decision in this household.'
      using errcode = '23514';
  end if;

  if decision_status is distinct from 'confirmed' then
    raise exception 'Pantry stock application requires a confirmed consumption decision.'
      using errcode = '23514';
  end if;

  if session_status is distinct from 'completed' then
    raise exception 'Pantry stock application requires a completed cooking session.'
      using errcode = '23514';
  end if;

  if ingredient_food_id is null then
    raise exception 'Pantry stock application requires a food-backed cooking ingredient.'
      using errcode = '23514';
  end if;

  select applications.id, reversals.id
  into existing_application_id, existing_reversal_id
  from public.pantry_consumption_stock_applications applications
  left join public.pantry_consumption_stock_application_reversals reversals
    on reversals.stock_application_id = applications.id
    and reversals.household_id = applications.household_id
  where applications.pantry_consumption_decision_id = p_pantry_consumption_decision_id
    and applications.household_id = p_household_id;

  if existing_application_id is not null then
    with parsed_allocations as (
      select
        (value ->> 'pantryItemId')::uuid as pantry_item_id,
        (value ->> 'quantity')::numeric as applied_quantity,
        lower(regexp_replace(trim(coalesce(value ->> 'unit', '')), '\s+', ' ', 'g')) as unit
      from jsonb_array_elements(p_allocations) as elements(value)
    ),
    stored_allocations as (
      select
        allocations.pantry_item_id,
        allocations.applied_quantity,
        allocations.unit
      from public.pantry_consumption_stock_application_allocations allocations
      where allocations.stock_application_id = existing_application_id
        and allocations.household_id = p_household_id
    ),
    allocation_diff as (
      (select * from parsed_allocations except select * from stored_allocations)
      union all
      (select * from stored_allocations except select * from parsed_allocations)
    )
    select
      applications.applied_quantity = p_applied_quantity
      and applications.applied_unit = normalized_applied_unit
      and not exists (select 1 from allocation_diff)
    into existing_payload_matches
    from public.pantry_consumption_stock_applications applications
    where applications.id = existing_application_id
      and applications.household_id = p_household_id;

    if existing_reversal_id is null and not coalesce(existing_payload_matches, false) then
      raise exception 'Pantry stock application already exists with different allocations.'
        using errcode = '23505';
    end if;

    return query
    select
      case when existing_reversal_id is null then 'already_applied' else 'already_reversed' end,
      existing_application_id;
    return;
  end if;

  with parsed_allocations as (
    select
      (value ->> 'pantryItemId')::uuid as pantry_item_id,
      (value ->> 'quantity')::numeric as quantity,
      lower(regexp_replace(trim(coalesce(value ->> 'unit', '')), '\s+', ' ', 'g')) as unit,
      (value ->> 'expectedQuantityBefore')::numeric as expected_quantity_before,
      (value ->> 'expectedUpdatedAt')::timestamptz as expected_updated_at
    from jsonb_array_elements(p_allocations) as elements(value)
  )
  select
    count(*)::integer,
    count(distinct pantry_item_id)::integer,
    count(*) filter (
      where pantry_item_id is null
        or quantity is null
        or quantity <= 0
        or unit = ''
        or unit is distinct from normalized_applied_unit
        or expected_quantity_before is null
        or expected_quantity_before < 0
        or expected_updated_at is null
    )::integer,
    coalesce(sum(quantity), 0)
  into allocation_count, distinct_lot_count, invalid_allocation_count, allocation_quantity
  from parsed_allocations;

  if allocation_count = 0 then
    raise exception 'Pantry stock application requires at least one lot allocation.'
      using errcode = '23514';
  end if;

  if distinct_lot_count <> allocation_count then
    raise exception 'Pantry stock application allocations cannot repeat a pantry lot.'
      using errcode = '23514';
  end if;

  if invalid_allocation_count > 0 then
    raise exception 'Pantry stock application allocations require positive quantities, matching units, and lot snapshots.'
      using errcode = '23514';
  end if;

  if allocation_quantity <> p_applied_quantity then
    raise exception 'Pantry stock application allocations must sum to the applied quantity.'
      using errcode = '23514';
  end if;

  with parsed_allocations as (
    select
      (value ->> 'pantryItemId')::uuid as pantry_item_id,
      (value ->> 'quantity')::numeric as quantity,
      lower(regexp_replace(trim(coalesce(value ->> 'unit', '')), '\s+', ' ', 'g')) as unit,
      (value ->> 'expectedQuantityBefore')::numeric as expected_quantity_before,
      (value ->> 'expectedUpdatedAt')::timestamptz as expected_updated_at
    from jsonb_array_elements(p_allocations) as elements(value)
  ),
  selected_lots as (
    select
      items.id,
      items.food_id,
      items.discarded_at,
      items.quantity,
      items.stock_status,
      lower(regexp_replace(trim(coalesce(items.unit, '')), '\s+', ' ', 'g')) as unit,
      allocations.quantity as allocation_quantity,
      allocations.expected_quantity_before,
      allocations.expected_updated_at,
      items.updated_at
    from parsed_allocations allocations
    join public.pantry_items items
      on items.id = allocations.pantry_item_id
      and items.household_id = p_household_id
    order by items.id
    for update of items
  )
  select
    count(*)::integer,
    count(*) filter (
      where selected_lots.food_id is distinct from ingredient_food_id
        or selected_lots.discarded_at is not null
        or selected_lots.stock_status in ('out', 'unknown')
        or selected_lots.quantity is null
        or selected_lots.quantity <= 0
        or selected_lots.unit is distinct from normalized_applied_unit
    )::integer,
    count(*) filter (
      where selected_lots.quantity is not null
        and selected_lots.quantity < selected_lots.allocation_quantity
    )::integer,
    count(*) filter (
      where selected_lots.quantity is distinct from selected_lots.expected_quantity_before
        or selected_lots.updated_at is distinct from selected_lots.expected_updated_at
    )::integer
  into selected_lot_count, ineligible_lot_count, overdraw_lot_count, invalid_allocation_count
  from selected_lots;

  if selected_lot_count <> allocation_count then
    raise exception 'Pantry stock application selected a stale or unavailable pantry lot.'
      using errcode = '23514';
  end if;

  if ineligible_lot_count > 0 then
    raise exception 'Pantry stock application selected an incompatible pantry lot.'
      using errcode = '23514';
  end if;

  if overdraw_lot_count > 0 then
    raise exception 'Pantry stock application would overdraw a pantry lot.'
      using errcode = '23514';
  end if;

  if invalid_allocation_count > 0 then
    raise exception 'Pantry stock application selected a stale pantry lot.'
      using errcode = '23514';
  end if;

  begin
    insert into public.pantry_consumption_stock_applications (
      household_id,
      pantry_consumption_decision_id,
      applied_quantity,
      applied_unit,
      note
    )
    values (
      p_household_id,
      p_pantry_consumption_decision_id,
      p_applied_quantity,
      normalized_applied_unit,
      normalized_note
    )
    returning id into new_application_id;
  exception
    when unique_violation then
      select applications.id, reversals.id
      into existing_application_id, existing_reversal_id
      from public.pantry_consumption_stock_applications applications
      left join public.pantry_consumption_stock_application_reversals reversals
        on reversals.stock_application_id = applications.id
        and reversals.household_id = applications.household_id
      where applications.pantry_consumption_decision_id = p_pantry_consumption_decision_id
        and applications.household_id = p_household_id;

      if existing_application_id is not null then
        with parsed_allocations as (
          select
            (value ->> 'pantryItemId')::uuid as pantry_item_id,
            (value ->> 'quantity')::numeric as applied_quantity,
            lower(regexp_replace(trim(coalesce(value ->> 'unit', '')), '\s+', ' ', 'g')) as unit
          from jsonb_array_elements(p_allocations) as elements(value)
        ),
        stored_allocations as (
          select
            allocations.pantry_item_id,
            allocations.applied_quantity,
            allocations.unit
          from public.pantry_consumption_stock_application_allocations allocations
          where allocations.stock_application_id = existing_application_id
            and allocations.household_id = p_household_id
        ),
        allocation_diff as (
          (select * from parsed_allocations except select * from stored_allocations)
          union all
          (select * from stored_allocations except select * from parsed_allocations)
        )
        select
          applications.applied_quantity = p_applied_quantity
          and applications.applied_unit = normalized_applied_unit
          and not exists (select 1 from allocation_diff)
        into existing_payload_matches
        from public.pantry_consumption_stock_applications applications
        where applications.id = existing_application_id
          and applications.household_id = p_household_id;

        if existing_reversal_id is null and not coalesce(existing_payload_matches, false) then
          raise exception 'Pantry stock application already exists with different allocations.'
            using errcode = '23505';
        end if;

        return query
        select
          case when existing_reversal_id is null then 'already_applied' else 'already_reversed' end,
          existing_application_id;
        return;
      end if;

      raise;
  end;

  for allocation in
    with parsed_allocations as (
      select
        (value ->> 'pantryItemId')::uuid as pantry_item_id,
        (value ->> 'quantity')::numeric as quantity,
        lower(regexp_replace(trim(coalesce(value ->> 'unit', '')), '\s+', ' ', 'g')) as unit
      from jsonb_array_elements(p_allocations) as elements(value)
    )
    select
      items.id as pantry_item_id,
      items.quantity as pantry_quantity_before,
      parsed_allocations.quantity as applied_quantity,
      parsed_allocations.unit as unit
    from parsed_allocations
    join public.pantry_items items
      on items.id = parsed_allocations.pantry_item_id
      and items.household_id = p_household_id
    order by items.id
  loop
    update public.pantry_items
    set quantity = allocation.pantry_quantity_before - allocation.applied_quantity
    where id = allocation.pantry_item_id
      and household_id = p_household_id;

    insert into public.pantry_consumption_stock_application_allocations (
      household_id,
      stock_application_id,
      pantry_item_id,
      applied_quantity,
      unit,
      pantry_quantity_before,
      pantry_quantity_after
    )
    values (
      p_household_id,
      new_application_id,
      allocation.pantry_item_id,
      allocation.applied_quantity,
      allocation.unit,
      allocation.pantry_quantity_before,
      allocation.pantry_quantity_before - allocation.applied_quantity
    );
  end loop;

  return query select 'applied', new_application_id;
end;
$$;

revoke execute on function public.apply_pantry_consumption_stock(
  uuid,
  uuid,
  numeric,
  text,
  jsonb,
  text
) from public;

grant execute on function public.apply_pantry_consumption_stock(
  uuid,
  uuid,
  numeric,
  text,
  jsonb,
  text
) to authenticated, service_role;
