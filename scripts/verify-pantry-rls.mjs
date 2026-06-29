import { spawnSync } from "node:child_process";

const dbContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";

const sql = String.raw`
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'pantry-one@example.test', 'authenticated', 'authenticated', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'pantry-two@example.test', 'authenticated', 'authenticated', now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'pantry-one-peer@example.test', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.households (id, name)
values
  ('20000000-0000-4000-8000-000000000001', 'Pantry RLS Household One'),
  ('20000000-0000-4000-8000-000000000002', 'Pantry RLS Household Two')
on conflict (id) do nothing;

insert into public.household_memberships (household_id, user_id)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002')
on conflict (household_id, user_id) do nothing;

insert into public.foods (id, household_id, name)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'RLS Apples'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'RLS Bananas')
on conflict (id) do nothing;

insert into public.recipes (id, household_id, name)
values
  ('90000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'RLS Pantry Consumption Recipe One'),
  ('90000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'RLS Pantry Consumption Recipe Two'),
  ('90000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'RLS Active Consumption Recipe'),
  ('90000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'RLS Unlinked Consumption Recipe')
on conflict (id) do nothing;

insert into public.cooking_sessions (
  id,
  household_id,
  recipe_id,
  recipe_name_snapshot,
  status
)
values
  (
    '91000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    'RLS completed cooking session one',
    'active'
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000002',
    'RLS completed cooking session two',
    'active'
  ),
  (
    '91000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000003',
    'RLS active cooking session',
    'active'
  ),
  (
    '91000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000004',
    'RLS completed cooking session with unlinked ingredient',
    'active'
  )
on conflict (id) do nothing;

insert into public.cooking_session_ingredients (
  id,
  household_id,
  cooking_session_id,
  food_id,
  display_name,
  sort_order
)
values
  (
    '92000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS consumed apples',
    0
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    'RLS consumed bananas',
    0
  ),
  (
    '92000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000001',
    'RLS active-session apples',
    0
  ),
  (
    '92000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000004',
    null,
    'RLS unlinked ingredient',
    0
  ),
  (
    '92000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS spoof actor consumed apples',
    1
  ),
  (
    '92000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS peer consumed apples',
    2
  ),
  (
    '92000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS service actor consumed apples',
    3
  ),
  (
    '92000000-0000-4000-8000-000000000008',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS missing service actor consumed apples',
    4
  ),
  (
    '92000000-0000-4000-8000-000000000009',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS stock application spoof actor apples',
    5
  ),
  (
    '92000000-0000-4000-8000-000000000010',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS stock application service apples',
    6
  ),
  (
    '92000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS skipped stock application apples',
    7
  ),
  (
    '92000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS stock application missing actor apples',
    8
  ),
  (
    '92000000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS stock reversal missing actor apples',
    9
  )
on conflict (id) do nothing;

update public.cooking_sessions
set status = 'completed',
    completed_at = now()
where id in (
  '91000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000004'
);

insert into public.grocery_lists (id, household_id, name, status)
values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Pantry RLS List One', 'completed'),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Pantry RLS List Two', 'completed'),
  ('60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Pantry RLS Draft List', 'draft')
on conflict (id) do nothing;

insert into public.grocery_list_items (
  id,
  household_id,
  grocery_list_id,
  food_id,
  display_name,
  checked
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    'RLS bananas grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000001',
    'RLS draft apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS confirmed-null apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS skipped-with-pantry apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS cross-pantry apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS spoof actor apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000008',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS peer actor apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000009',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS service actor apples grocery item',
    true
  ),
  (
    '70000000-0000-4000-8000-000000000010',
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS missing service actor apples grocery item',
    true
  )
on conflict (id) do nothing;

insert into public.pantry_items (id, household_id, food_id, display_name, quantity, unit)
values (
  '40000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  'RLS bananas lot',
  5,
  'count'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into public.pantry_items (id, household_id, food_id, display_name, quantity, unit)
values (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'RLS apples lot',
  5,
  'count'
);

insert into public.pantry_events (id, household_id, pantry_item_id, event_type, note)
values (
  '50000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'created',
  'Created during RLS smoke.'
);

insert into public.pantry_intake_decisions (
  id,
  household_id,
  grocery_list_item_id,
  status,
  created_pantry_item_id,
  note
)
values (
  '80000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'confirmed',
  '40000000-0000-4000-8000-000000000001',
  'Confirmed during RLS smoke.'
);

insert into public.pantry_consumption_decisions (
  id,
  household_id,
  cooking_session_ingredient_id,
  status,
  note
)
values (
  '88000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  'confirmed',
  'Confirmed consumption during RLS smoke.'
);

select case when (
  select decided_by_user_id
  from public.pantry_intake_decisions
  where id = '80000000-0000-4000-8000-000000000001'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'intake decision actor was not captured from auth context' end as intake_decision_records_actor;

select case when (
  select decided_by_user_id
  from public.pantry_consumption_decisions
  where id = '88000000-0000-4000-8000-000000000001'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'consumption decision actor was not captured from auth context' end as consumption_decision_records_actor;

insert into public.pantry_consumption_decisions (
  id,
  household_id,
  cooking_session_ingredient_id,
  status,
  note
)
values
  (
    '88000000-0000-4000-8000-000000000018',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000009',
    'confirmed',
    'Confirmed for stock application reversal spoof smoke.'
  ),
  (
    '88000000-0000-4000-8000-000000000019',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000010',
    'confirmed',
    'Confirmed for service stock application smoke.'
  ),
  (
    '88000000-0000-4000-8000-000000000020',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000011',
    'skipped',
    'Skipped decisions must not support stock application.'
  ),
  (
    '88000000-0000-4000-8000-000000000021',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000012',
    'confirmed',
    'Confirmed for missing reversal actor smoke.'
  ),
  (
    '88000000-0000-4000-8000-000000000022',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000013',
    'confirmed',
    'Confirmed for wrong actor service smoke.'
  );

insert into public.pantry_consumption_stock_applications (
  id,
  household_id,
  pantry_consumption_decision_id,
  applied_quantity,
  applied_unit,
  note
)
values (
  '89000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000001',
  1,
  'count',
  'Application audit row during RLS smoke.'
);

insert into public.pantry_consumption_stock_application_allocations (
  id,
  household_id,
  stock_application_id,
  pantry_item_id,
  applied_quantity,
  unit,
  pantry_quantity_before,
  pantry_quantity_after
)
values (
  '89100000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '89000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  1,
  'count',
  5,
  4
);

insert into public.pantry_consumption_stock_application_reversals (
  id,
  household_id,
  stock_application_id,
  note
)
values (
  '89200000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '89000000-0000-4000-8000-000000000001',
  'Reversal audit row during RLS smoke.'
);

insert into public.pantry_consumption_stock_application_reversal_allocations (
  id,
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
  '89300000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '89200000-0000-4000-8000-000000000001',
  '89100000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  1,
  'count',
  4,
  5
);

insert into public.pantry_consumption_stock_applications (
  id,
  household_id,
  pantry_consumption_decision_id,
  applied_quantity,
  applied_unit,
  note
)
values (
  '89000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000018',
  1,
  'count',
  'Application audit row for reversal spoof smoke.'
);

insert into public.pantry_consumption_stock_application_allocations (
  id,
  household_id,
  stock_application_id,
  pantry_item_id,
  applied_quantity,
  unit,
  pantry_quantity_before,
  pantry_quantity_after
)
values (
  '89100000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  '89000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000001',
  1,
  'count',
  5,
  4
);

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000023',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000022',
    1,
    'count',
    'This should fail because stock applications require an allocation before commit.'
  );

  set constraints pantry_stock_application_allocations_complete immediate;

  raise exception 'stock application without allocations unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

set constraints all deferred;

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000025',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000022',
    1,
    'count',
    'This should fail because allocation quantities must sum to the application quantity.'
  );

  insert into public.pantry_consumption_stock_application_allocations (
    id,
    household_id,
    stock_application_id,
    pantry_item_id,
    applied_quantity,
    unit,
    pantry_quantity_before,
    pantry_quantity_after
  )
  values (
    '89100000-0000-4000-8000-000000000025',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000025',
    '40000000-0000-4000-8000-000000000001',
    0.5,
    'count',
    5,
    4.5
  );

  set constraints pantry_stock_application_allocations_complete immediate;

  raise exception 'stock application with mismatched allocation sum unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

set constraints all deferred;

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000026',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000022',
    1,
    'count',
    'This should fail because allocation units must match the application unit.'
  );

  insert into public.pantry_consumption_stock_application_allocations (
    id,
    household_id,
    stock_application_id,
    pantry_item_id,
    applied_quantity,
    unit,
    pantry_quantity_before,
    pantry_quantity_after
  )
  values (
    '89100000-0000-4000-8000-000000000026',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000026',
    '40000000-0000-4000-8000-000000000001',
    1,
    'bag',
    5,
    4
  );

  set constraints pantry_stock_application_allocations_complete immediate;

  raise exception 'stock application with mismatched allocation unit unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

set constraints all deferred;

do $$
begin
  insert into public.pantry_consumption_stock_application_reversals (
    id,
    household_id,
    stock_application_id,
    note
  )
  values (
    '89200000-0000-4000-8000-000000000023',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000002',
    'This should fail because stock reversals require reversal allocations before commit.'
  );

  set constraints pantry_stock_reversal_allocations_complete immediate;

  raise exception 'stock reversal without reversal allocations unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

set constraints all deferred;

select case when (
  select applied_by_user_id
  from public.pantry_consumption_stock_applications
  where id = '89000000-0000-4000-8000-000000000001'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'stock application actor was not captured from auth context' end as stock_application_records_actor;

select case when (
  select reversed_by_user_id
  from public.pantry_consumption_stock_application_reversals
  where id = '89200000-0000-4000-8000-000000000001'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'stock reversal actor was not captured from auth context' end as stock_reversal_records_actor;

select case when (
  select quantity
  from public.pantry_items
  where id = '40000000-0000-4000-8000-000000000001'
) = 5 then 'ok' else 'stock application schema smoke mutated pantry quantity' end as stock_application_schema_is_audit_only;

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    applied_by_user_id,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000014',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000019',
    1,
    'count',
    '10000000-0000-4000-8000-000000000003',
    'This should fail because authenticated users cannot spoof another application actor.'
  );

  raise exception 'spoofed stock application actor unexpectedly succeeded';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_application_reversals (
    id,
    household_id,
    stock_application_id,
    reversed_by_user_id,
    note
  )
  values (
    '89200000-0000-4000-8000-000000000014',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    'This should fail because authenticated users cannot spoof another reversal actor.'
  );

  raise exception 'spoofed stock reversal actor unexpectedly succeeded';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  insert into public.pantry_intake_decisions (
    id,
    household_id,
    grocery_list_item_id,
    status,
    decided_by_user_id,
    note
  )
  values (
    '80000000-0000-4000-8000-000000000014',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000007',
    'skipped',
    '10000000-0000-4000-8000-000000000003',
    'This should fail because authenticated users cannot spoof another actor.'
  );

  raise exception 'spoofed intake decision actor unexpectedly succeeded';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_decisions (
    id,
    household_id,
    cooking_session_ingredient_id,
    status,
    decided_by_user_id,
    note
  )
  values (
    '88000000-0000-4000-8000-000000000014',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000005',
    'skipped',
    '10000000-0000-4000-8000-000000000003',
    'This should fail because authenticated users cannot spoof another actor.'
  );

  raise exception 'spoofed consumption decision actor unexpectedly succeeded';
exception
  when insufficient_privilege then
    null;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  insert into public.pantry_intake_decisions (
    id,
    household_id,
    grocery_list_item_id,
    status,
    note
  )
  values (
    '80000000-0000-4000-8000-000000000016',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000010',
    'skipped',
    'This should fail because privileged inserts must identify an actor.'
  );

  raise exception 'service role intake decision without actor unexpectedly succeeded';
exception
  when not_null_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_decisions (
    id,
    household_id,
    cooking_session_ingredient_id,
    status,
    note
  )
  values (
    '88000000-0000-4000-8000-000000000016',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000008',
    'skipped',
    'This should fail because privileged inserts must identify an actor.'
  );

  raise exception 'service role consumption decision without actor unexpectedly succeeded';
exception
  when not_null_violation then
    null;
end $$;

insert into public.pantry_intake_decisions (
  id,
  household_id,
  grocery_list_item_id,
  status,
  decided_by_user_id,
  note
)
values (
  '80000000-0000-4000-8000-000000000017',
  '20000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000009',
  'skipped',
  '10000000-0000-4000-8000-000000000001',
  'Skipped by service role with explicit actor during RLS smoke.'
);

insert into public.pantry_consumption_decisions (
  id,
  household_id,
  cooking_session_ingredient_id,
  status,
  decided_by_user_id,
  note
)
values (
  '88000000-0000-4000-8000-000000000017',
  '20000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000007',
  'skipped',
  '10000000-0000-4000-8000-000000000001',
  'Skipped by service role with explicit actor during RLS smoke.'
);

select case when (
  select decided_by_user_id
  from public.pantry_intake_decisions
  where id = '80000000-0000-4000-8000-000000000017'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'service role intake decision actor was not preserved' end as service_intake_decision_records_actor;

select case when (
  select decided_by_user_id
  from public.pantry_consumption_decisions
  where id = '88000000-0000-4000-8000-000000000017'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'service role consumption decision actor was not preserved' end as service_consumption_decision_records_actor;

insert into public.pantry_consumption_decisions (
  id,
  household_id,
  cooking_session_ingredient_id,
  status,
  decided_by_user_id,
  note
)
values (
  '88000000-0000-4000-8000-000000000024',
  '20000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000002',
  'confirmed',
  '10000000-0000-4000-8000-000000000002',
  'Confirmed by service role for cross-household stock application smoke.'
);

insert into public.pantry_consumption_stock_applications (
  id,
  household_id,
  pantry_consumption_decision_id,
  applied_quantity,
  applied_unit,
  note
)
values (
  '89000000-0000-4000-8000-000000000016',
  '20000000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000021',
  1,
  'count',
  'Service stock application without auth context keeps a null actor.'
);

insert into public.pantry_consumption_stock_application_allocations (
  id,
  household_id,
  stock_application_id,
  pantry_item_id,
  applied_quantity,
  unit,
  pantry_quantity_before,
  pantry_quantity_after
)
values (
  '89100000-0000-4000-8000-000000000018',
  '20000000-0000-4000-8000-000000000001',
  '89000000-0000-4000-8000-000000000016',
  '40000000-0000-4000-8000-000000000001',
  1,
  'count',
  5,
  4
);

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    applied_by_user_id,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000022',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000022',
    1,
    'count',
    '10000000-0000-4000-8000-000000000002',
    'This should fail because the actor is not a member of the stock application household.'
  );

  raise exception 'service role stock application with cross-household actor unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

insert into public.pantry_consumption_stock_applications (
  id,
  household_id,
  pantry_consumption_decision_id,
  applied_quantity,
  applied_unit,
  applied_by_user_id,
  note
)
values (
  '89000000-0000-4000-8000-000000000017',
  '20000000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000019',
  1,
  'count',
  '10000000-0000-4000-8000-000000000001',
  'Application by service role with explicit actor during RLS smoke.'
);

insert into public.pantry_consumption_stock_application_allocations (
  id,
  household_id,
  stock_application_id,
  pantry_item_id,
  applied_quantity,
  unit,
  pantry_quantity_before,
  pantry_quantity_after
)
values (
  '89100000-0000-4000-8000-000000000017',
  '20000000-0000-4000-8000-000000000001',
  '89000000-0000-4000-8000-000000000017',
  '40000000-0000-4000-8000-000000000001',
  1,
  'count',
  5,
  4
);

insert into public.pantry_consumption_stock_application_reversals (
  id,
  household_id,
  stock_application_id,
  reversed_by_user_id,
  note
)
values (
  '89200000-0000-4000-8000-000000000017',
  '20000000-0000-4000-8000-000000000001',
  '89000000-0000-4000-8000-000000000017',
  '10000000-0000-4000-8000-000000000001',
  'Reversal by service role with explicit actor during RLS smoke.'
);

insert into public.pantry_consumption_stock_application_reversal_allocations (
  id,
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
  '89300000-0000-4000-8000-000000000017',
  '20000000-0000-4000-8000-000000000001',
  '89200000-0000-4000-8000-000000000017',
  '89100000-0000-4000-8000-000000000017',
  '40000000-0000-4000-8000-000000000001',
  1,
  'count',
  4,
  5
);

insert into public.pantry_consumption_stock_application_reversals (
  id,
  household_id,
  stock_application_id,
  note
)
values (
  '89200000-0000-4000-8000-000000000018',
  '20000000-0000-4000-8000-000000000001',
  '89000000-0000-4000-8000-000000000016',
  'Service stock reversal without auth context keeps a null actor.'
);

insert into public.pantry_consumption_stock_application_reversal_allocations (
  id,
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
  '89300000-0000-4000-8000-000000000018',
  '20000000-0000-4000-8000-000000000001',
  '89200000-0000-4000-8000-000000000018',
  '89100000-0000-4000-8000-000000000018',
  '40000000-0000-4000-8000-000000000001',
  1,
  'count',
  4,
  5
);

select case when (
  select applied_by_user_id
  from public.pantry_consumption_stock_applications
  where id = '89000000-0000-4000-8000-000000000017'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'service role stock application actor was not preserved' end as service_stock_application_records_actor;

select case when (
  select applied_by_user_id
  from public.pantry_consumption_stock_applications
  where id = '89000000-0000-4000-8000-000000000016'
) is null
then 'ok' else 'service role stock application without auth context should keep a null actor' end as service_stock_application_allows_null_actor;

select case when (
  select reversed_by_user_id
  from public.pantry_consumption_stock_application_reversals
  where id = '89200000-0000-4000-8000-000000000017'
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'service role stock reversal actor was not preserved' end as service_stock_reversal_records_actor;

select case when (
  select reversed_by_user_id
  from public.pantry_consumption_stock_application_reversals
  where id = '89200000-0000-4000-8000-000000000018'
) is null
then 'ok' else 'service role stock reversal without auth context should keep a null actor' end as service_stock_reversal_allows_null_actor;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

insert into public.pantry_intake_decisions (
  id,
  household_id,
  grocery_list_item_id,
  status,
  note
)
values (
  '80000000-0000-4000-8000-000000000015',
  '20000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000008',
  'skipped',
  'Skipped by same-household peer during RLS smoke.'
);

insert into public.pantry_consumption_decisions (
  id,
  household_id,
  cooking_session_ingredient_id,
  status,
  note
)
values (
  '88000000-0000-4000-8000-000000000015',
  '20000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000006',
  'skipped',
  'Skipped by same-household peer during RLS smoke.'
);

select case when (
  select decided_by_user_id
  from public.pantry_intake_decisions
  where id = '80000000-0000-4000-8000-000000000015'
) = '10000000-0000-4000-8000-000000000003'
then 'ok' else 'same-household peer intake actor was not captured' end as peer_intake_decision_records_actor;

select case when (
  select decided_by_user_id
  from public.pantry_consumption_decisions
  where id = '88000000-0000-4000-8000-000000000015'
) = '10000000-0000-4000-8000-000000000003'
then 'ok' else 'same-household peer consumption actor was not captured' end as peer_consumption_decision_records_actor;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
begin
  insert into public.pantry_consumption_decisions (
    id,
    household_id,
    cooking_session_ingredient_id,
    status,
    note
  )
  values (
    '88000000-0000-4000-8000-000000000010',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000003',
    'skipped',
    'This should fail because the cooking session is not completed.'
  );

  raise exception 'active cooking session ingredient consumption decision unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_decisions (
    id,
    household_id,
    cooking_session_ingredient_id,
    status,
    note
  )
  values (
    '88000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000004',
    'skipped',
    'This should fail because the cooking session ingredient has no food identity.'
  );

  raise exception 'unlinked cooking session ingredient consumption decision unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_decisions (
    id,
    household_id,
    cooking_session_ingredient_id,
    status,
    note
  )
  values (
    '88000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000001',
    'skipped',
    'This should fail because the cooking session ingredient already has a decision.'
  );

  raise exception 'duplicate pantry consumption decision unexpectedly succeeded';
exception
  when unique_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_decisions (
    id,
    household_id,
    cooking_session_ingredient_id,
    status,
    note
  )
  values (
    '88000000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000002',
    'skipped',
    'This should fail because the cooking session ingredient is in another household.'
  );

  raise exception 'cross-household cooking session ingredient consumption decision unexpectedly succeeded';
exception
  when check_violation then
    null;
  when foreign_key_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000020',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000020',
    1,
    'count',
    'This should fail because skipped consumption decisions cannot be stock-applied.'
  );

  raise exception 'stock application for skipped consumption decision unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000001',
    1,
    'count',
    'This should fail because the confirmed decision already has a stock application.'
  );

  raise exception 'duplicate stock application unexpectedly succeeded';
exception
  when unique_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_applications (
    id,
    household_id,
    pantry_consumption_decision_id,
    applied_quantity,
    applied_unit,
    note
  )
  values (
    '89000000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000024',
    1,
    'count',
    'This should fail because the consumption decision is in another household.'
  );

  raise exception 'cross-household stock application decision reference unexpectedly succeeded';
exception
  when check_violation then
    null;
  when foreign_key_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_application_allocations (
    id,
    household_id,
    stock_application_id,
    pantry_item_id,
    applied_quantity,
    unit,
    pantry_quantity_before,
    pantry_quantity_after
  )
  values (
    '89100000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000002',
    1,
    'count',
    5,
    4
  );

  raise exception 'cross-household stock allocation pantry item reference unexpectedly succeeded';
exception
  when foreign_key_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_application_allocations (
    id,
    household_id,
    stock_application_id,
    pantry_item_id,
    applied_quantity,
    unit,
    pantry_quantity_before,
    pantry_quantity_after
  )
  values (
    '89100000-0000-4000-8000-000000000014',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    0,
    'count',
    5,
    5
  );

  raise exception 'zero stock allocation quantity unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_application_allocations (
    id,
    household_id,
    stock_application_id,
    pantry_item_id,
    applied_quantity,
    unit,
    pantry_quantity_before,
    pantry_quantity_after
  )
  values (
    '89100000-0000-4000-8000-000000000015',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    1,
    '',
    5,
    4
  );

  raise exception 'blank stock allocation unit unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_application_allocations (
    id,
    household_id,
    stock_application_id,
    pantry_item_id,
    applied_quantity,
    unit,
    pantry_quantity_before,
    pantry_quantity_after
  )
  values (
    '89100000-0000-4000-8000-000000000016',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    1,
    'count',
    5,
    4
  );

  raise exception 'allocation after stock application reversal unexpectedly succeeded';
exception
  when check_violation then
    null;
  when unique_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_application_reversals (
    id,
    household_id,
    stock_application_id,
    note
  )
  values (
    '89200000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    '89000000-0000-4000-8000-000000000001',
    'This should fail because the stock application already has a reversal.'
  );

  raise exception 'duplicate stock application reversal unexpectedly succeeded';
exception
  when unique_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_consumption_stock_application_reversal_allocations (
    id,
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
    '89300000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    '89200000-0000-4000-8000-000000000001',
    '89100000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    1,
    'count',
    4,
    5
  );

  raise exception 'mismatched stock reversal allocation unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  update public.pantry_consumption_decisions
  set note = 'This should fail because authenticated clients cannot update decisions.'
  where id = '88000000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry consumption decision update unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  delete from public.pantry_consumption_decisions
  where id = '88000000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry consumption decision delete unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  update public.pantry_consumption_stock_applications
  set note = 'This should fail because authenticated clients cannot update stock applications.'
  where id = '89000000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry stock application update unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  delete from public.pantry_consumption_stock_applications
  where id = '89000000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry stock application delete unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  update public.pantry_consumption_stock_application_reversals
  set note = 'This should fail because authenticated clients cannot update stock reversals.'
  where id = '89200000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry stock reversal update unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  delete from public.pantry_consumption_stock_application_reversals
  where id = '89200000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry stock reversal delete unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  insert into public.pantry_intake_decisions (
    id,
    household_id,
    grocery_list_item_id,
    status,
    note
  )
  values (
    '80000000-0000-4000-8000-000000000010',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000004',
    'confirmed',
    'This should fail because confirmed decisions require a pantry item.'
  );

  raise exception 'confirmed intake decision without pantry item unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_intake_decisions (
    id,
    household_id,
    grocery_list_item_id,
    status,
    created_pantry_item_id,
    note
  )
  values (
    '80000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000005',
    'skipped',
    '40000000-0000-4000-8000-000000000001',
    'This should fail because skipped decisions cannot reference pantry stock.'
  );

  raise exception 'skipped intake decision with pantry item unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_intake_decisions (
    id,
    household_id,
    grocery_list_item_id,
    status,
    note
  )
  values (
    '80000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000003',
    'skipped',
    'This should fail because the grocery list is not completed.'
  );

  raise exception 'draft grocery item intake decision unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  insert into public.pantry_intake_decisions (
    id,
    household_id,
    grocery_list_item_id,
    status,
    created_pantry_item_id,
    note
  )
  values (
    '80000000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000006',
    'confirmed',
    '40000000-0000-4000-8000-000000000002',
    'This should fail because the pantry item is in another household.'
  );

  raise exception 'cross-household pantry item reference unexpectedly succeeded';
exception
  when check_violation then
    null;
  when foreign_key_violation then
    null;
end $$;

do $$
begin
  update public.pantry_intake_decisions
  set note = 'This should fail because authenticated clients cannot update decisions.'
  where id = '80000000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry intake decision update unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  delete from public.pantry_intake_decisions
  where id = '80000000-0000-4000-8000-000000000001';

  if found then
    raise exception 'authenticated pantry intake decision delete unexpectedly succeeded';
  end if;
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  delete from public.pantry_items
  where id = '40000000-0000-4000-8000-000000000001';

  raise exception 'authenticated pantry item hard delete with confirmed intake decision unexpectedly succeeded';
exception
  when foreign_key_violation then
    null;
  when restrict_violation then
    null;
end $$;

update public.pantry_items
set discarded_at = now()
where id = '40000000-0000-4000-8000-000000000001'
  and discarded_at is null;

select case when (
  select count(*)
  from public.pantry_intake_decisions
  where id = '80000000-0000-4000-8000-000000000001'
    and created_pantry_item_id = '40000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else 'discard flow broke decision traceability' end as discard_preserves_intake_decision_link;

reset role;

do $$
begin
  delete from public.pantry_items
  where id = '40000000-0000-4000-8000-000000000001';

  raise exception 'service role pantry item hard delete with confirmed intake decision unexpectedly succeeded';
exception
  when foreign_key_violation then
    null;
  when restrict_violation then
    null;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select case when (
  select count(*) from public.pantry_items where id = '40000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one item read failed ' || (select count(*) from public.pantry_items))::integer::text end as user_one_can_read_item;

select case when (
  select count(*) from public.pantry_events where id = '50000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one event read failed ' || (select count(*) from public.pantry_events))::integer::text end as user_one_can_read_event;

select case when (
  select count(*) from public.pantry_intake_decisions where id = '80000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one intake decision read failed ' || (select count(*) from public.pantry_intake_decisions))::integer::text end as user_one_can_read_intake_decision;

select case when (
  select count(*) from public.pantry_consumption_decisions where id = '88000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one consumption decision read failed ' || (select count(*) from public.pantry_consumption_decisions))::integer::text end as user_one_can_read_consumption_decision;

select case when (
  select count(*) from public.pantry_consumption_stock_applications where id = '89000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one stock application read failed ' || (select count(*) from public.pantry_consumption_stock_applications))::integer::text end as user_one_can_read_stock_application;

select case when (
  select count(*) from public.pantry_consumption_stock_application_allocations where id = '89100000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one stock allocation read failed ' || (select count(*) from public.pantry_consumption_stock_application_allocations))::integer::text end as user_one_can_read_stock_allocation;

select case when (
  select count(*) from public.pantry_consumption_stock_application_reversals where id = '89200000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one stock reversal read failed ' || (select count(*) from public.pantry_consumption_stock_application_reversals))::integer::text end as user_one_can_read_stock_reversal;

select case when (
  select count(*) from public.pantry_consumption_stock_application_reversal_allocations where id = '89300000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one stock reversal allocation read failed ' || (select count(*) from public.pantry_consumption_stock_application_reversal_allocations))::integer::text end as user_one_can_read_stock_reversal_allocation;

do $$
begin
  insert into public.pantry_intake_decisions (
    id,
    household_id,
    grocery_list_item_id,
    status,
    note
  )
  values (
    '80000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000002',
    'skipped',
    'This should fail because the grocery item is in another household.'
  );

  raise exception 'cross-household grocery item reference unexpectedly succeeded';
exception
  when check_violation then
    null;
  when foreign_key_violation then
    null;
end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

do $$
begin
  insert into public.pantry_consumption_stock_application_reversals (
    id,
    household_id,
    stock_application_id,
    note
  )
  values (
    '89200000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000002',
    '89000000-0000-4000-8000-000000000002',
    'This should fail because the stock application is in another household.'
  );

  raise exception 'cross-household stock reversal application reference unexpectedly succeeded';
exception
  when check_violation then
    null;
  when foreign_key_violation then
    null;
end $$;

select case when (
  select count(*) from public.pantry_items where id = '40000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two item isolation failed ' || (select count(*) from public.pantry_items))::integer::text end as user_two_cannot_read_item;

select case when (
  select count(*) from public.pantry_events where id = '50000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two event isolation failed ' || (select count(*) from public.pantry_events))::integer::text end as user_two_cannot_read_event;

select case when (
  select count(*) from public.pantry_intake_decisions where id = '80000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two intake decision isolation failed ' || (select count(*) from public.pantry_intake_decisions))::integer::text end as user_two_cannot_read_intake_decision;

select case when (
  select count(*) from public.pantry_consumption_decisions where id = '88000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two consumption decision isolation failed ' || (select count(*) from public.pantry_consumption_decisions))::integer::text end as user_two_cannot_read_consumption_decision;

select case when (
  select count(*) from public.pantry_consumption_stock_applications where id = '89000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two stock application isolation failed ' || (select count(*) from public.pantry_consumption_stock_applications))::integer::text end as user_two_cannot_read_stock_application;

select case when (
  select count(*) from public.pantry_consumption_stock_application_allocations where id = '89100000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two stock allocation isolation failed ' || (select count(*) from public.pantry_consumption_stock_application_allocations))::integer::text end as user_two_cannot_read_stock_allocation;

select case when (
  select count(*) from public.pantry_consumption_stock_application_reversals where id = '89200000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two stock reversal isolation failed ' || (select count(*) from public.pantry_consumption_stock_application_reversals))::integer::text end as user_two_cannot_read_stock_reversal;

select case when (
  select count(*) from public.pantry_consumption_stock_application_reversal_allocations where id = '89300000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two stock reversal allocation isolation failed ' || (select count(*) from public.pantry_consumption_stock_application_reversal_allocations))::integer::text end as user_two_cannot_read_stock_reversal_allocation;

reset role;

insert into public.recipes (id, household_id, name)
values
  ('90000000-0000-4000-8000-000000000099', '20000000-0000-4000-8000-000000000001', 'RLS stock apply recipe'),
  ('90000000-0000-4000-8000-000000000098', '20000000-0000-4000-8000-000000000001', 'RLS stock apply stale recipe')
on conflict (id) do nothing;

insert into public.cooking_sessions (
  id,
  household_id,
  recipe_id,
  recipe_name_snapshot,
  status,
  completed_at
)
values
  (
    '91000000-0000-4000-8000-000000000099',
    '20000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000099',
    'RLS stock apply completed session',
    'active',
    null
  ),
  (
    '91000000-0000-4000-8000-000000000098',
    '20000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000098',
    'RLS stock apply stale session',
    'active',
    null
  )
on conflict (id) do nothing;

insert into public.cooking_session_ingredients (
  id,
  household_id,
  cooking_session_id,
  food_id,
  display_name,
  sort_order
)
values
  (
    '92000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000099',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples success',
    101
  ),
  (
    '92000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000099',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples skipped',
    102
  ),
  (
    '92000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000098',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples active stale',
    103
  ),
  (
    '92000000-0000-4000-8000-000000000104',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000099',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples overdraw',
    104
  ),
  (
    '92000000-0000-4000-8000-000000000105',
    '20000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000099',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples cross lot',
    105
  )
on conflict (id) do nothing;

update public.cooking_sessions
set status = 'completed',
    completed_at = now()
where id in (
  '91000000-0000-4000-8000-000000000099',
  '91000000-0000-4000-8000-000000000098'
);

insert into public.pantry_items (id, household_id, food_id, display_name, quantity, unit, stock_status)
values
  (
    '40000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples lot one',
    4,
    'count',
    'in_stock'
  ),
  (
    '40000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples lot two',
    3,
    'count',
    'in_stock'
  ),
  (
    '40000000-0000-4000-8000-000000000104',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'RLS apply apples overdraw lot',
    1,
    'count',
    'in_stock'
  )
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into public.pantry_consumption_decisions (
  id,
  household_id,
  cooking_session_ingredient_id,
  status,
  note
)
values
  (
    '88000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000101',
    'confirmed',
    'Confirmed for RPC stock apply success.'
  ),
  (
    '88000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000102',
    'skipped',
    'Skipped for RPC stock apply rejection.'
  ),
  (
    '88000000-0000-4000-8000-000000000103',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000103',
    'confirmed',
    'Confirmed before parent session becomes active.'
  ),
  (
    '88000000-0000-4000-8000-000000000104',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000104',
    'confirmed',
    'Confirmed for RPC stock apply overdraw.'
  ),
  (
    '88000000-0000-4000-8000-000000000105',
    '20000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000105',
    'confirmed',
    'Confirmed for RPC stock apply cross-household lot.'
  );

create temp table pantry_apply_result as
select *
from public.apply_pantry_consumption_stock(
  '20000000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000101',
  3,
  'COUNT',
  jsonb_build_array(
    jsonb_build_object(
      'pantryItemId',
      '40000000-0000-4000-8000-000000000101',
      'quantity',
      1,
      'unit',
      'count',
      'expectedQuantityBefore',
      (select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000101'),
      'expectedUpdatedAt',
      (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000101')
    ),
    jsonb_build_object(
      'pantryItemId',
      '40000000-0000-4000-8000-000000000102',
      'quantity',
      2,
      'unit',
      'count',
      'expectedQuantityBefore',
      (select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000102'),
      'expectedUpdatedAt',
      (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000102')
    )
  ),
  'Applied from RLS verifier.'
);

select case when (
  select status from pantry_apply_result
) = 'applied' then 'ok' else 'RPC stock application did not report applied' end as rpc_stock_application_reports_applied;

select case when (
  select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000101'
) = 3 and (
  select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000102'
) = 1 then 'ok' else 'RPC stock application did not deduct selected lots' end as rpc_stock_application_deducts_selected_lots;

select case when (
  select count(*)
  from public.pantry_consumption_stock_application_allocations allocations
  join pantry_apply_result result
    on result.stock_application_id = allocations.stock_application_id
) = 2 then 'ok' else 'RPC stock application did not write allocation audit rows' end as rpc_stock_application_writes_allocations;

select case when (
  select applied_by_user_id
  from public.pantry_consumption_stock_applications applications
  join pantry_apply_result result
    on result.stock_application_id = applications.id
) = '10000000-0000-4000-8000-000000000001'
then 'ok' else 'RPC stock application actor was not captured' end as rpc_stock_application_records_actor;

create temp table pantry_apply_retry_result as
select *
from public.apply_pantry_consumption_stock(
  '20000000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000101',
  3,
  'count',
  jsonb_build_array(
    jsonb_build_object(
      'pantryItemId',
      '40000000-0000-4000-8000-000000000101',
      'quantity',
      1,
      'unit',
      'count',
      'expectedQuantityBefore',
      4,
      'expectedUpdatedAt',
      (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000101')
    ),
    jsonb_build_object(
      'pantryItemId',
      '40000000-0000-4000-8000-000000000102',
      'quantity',
      2,
      'unit',
      'count',
      'expectedQuantityBefore',
      3,
      'expectedUpdatedAt',
      (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000102')
    )
  ),
  'Retried from RLS verifier.'
);

select case when (
  select status from pantry_apply_retry_result
) = 'already_applied' then 'ok' else 'RPC stock application retry did not report already_applied' end as rpc_stock_application_retry_is_idempotent;

select case when (
  select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000101'
) = 3 and (
  select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000102'
) = 1 then 'ok' else 'RPC stock application retry deducted stock twice' end as rpc_stock_application_retry_does_not_deduct_twice;

do $$
begin
  perform 1
  from public.apply_pantry_consumption_stock(
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000101',
    1,
    'count',
    jsonb_build_array(
      jsonb_build_object(
        'pantryItemId',
        '40000000-0000-4000-8000-000000000101',
        'quantity',
        1,
        'unit',
        'count',
        'expectedQuantityBefore',
        4,
        'expectedUpdatedAt',
        (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000101')
      )
    ),
    'This should fail because the existing application has a different payload.'
  );

  raise exception 'RPC stock application retry with different payload unexpectedly succeeded';
exception
  when unique_violation then
    null;
end $$;

drop table pantry_apply_result;
drop table pantry_apply_retry_result;

do $$
begin
  perform 1
  from public.apply_pantry_consumption_stock(
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000102',
    1,
    'count',
    jsonb_build_array(
      jsonb_build_object(
        'pantryItemId',
        '40000000-0000-4000-8000-000000000101',
        'quantity',
        1,
        'unit',
        'count',
        'expectedQuantityBefore',
        (select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000101'),
        'expectedUpdatedAt',
        (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000101')
      )
    ),
    'This should fail because skipped decisions cannot apply stock.'
  );

  raise exception 'RPC stock application for skipped decision unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

reset role;

set session_replication_role = replica;
update public.cooking_sessions
set status = 'active',
    completed_at = null
where id = '91000000-0000-4000-8000-000000000098';
set session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
begin
  perform 1
  from public.apply_pantry_consumption_stock(
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000103',
    1,
    'count',
    jsonb_build_array(
      jsonb_build_object(
        'pantryItemId',
        '40000000-0000-4000-8000-000000000101',
        'quantity',
        1,
        'unit',
        'count',
        'expectedQuantityBefore',
        (select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000101'),
        'expectedUpdatedAt',
        (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000101')
      )
    ),
    'This should fail because the cooking session is no longer completed.'
  );

  raise exception 'RPC stock application for active session unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

do $$
begin
  perform 1
  from public.apply_pantry_consumption_stock(
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000104',
    2,
    'count',
    jsonb_build_array(
      jsonb_build_object(
        'pantryItemId',
        '40000000-0000-4000-8000-000000000104',
        'quantity',
        2,
        'unit',
        'count',
        'expectedQuantityBefore',
        (select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000104'),
        'expectedUpdatedAt',
        (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000104')
      )
    ),
    'This should fail because the selected lot cannot cover the quantity.'
  );

  raise exception 'RPC stock application overdraw unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

select case when (
  select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000104'
) = 1 and not exists (
  select 1
  from public.pantry_consumption_stock_applications
  where pantry_consumption_decision_id = '88000000-0000-4000-8000-000000000104'
) then 'ok' else 'RPC stock application overdraw left partial writes' end as rpc_stock_application_overdraw_has_no_partial_writes;

do $$
begin
  perform 1
  from public.apply_pantry_consumption_stock(
    '20000000-0000-4000-8000-000000000001',
    '88000000-0000-4000-8000-000000000105',
    1,
    'count',
    jsonb_build_array(
      jsonb_build_object(
        'pantryItemId',
        '40000000-0000-4000-8000-000000000002',
        'quantity',
        1,
        'unit',
        'count',
        'expectedQuantityBefore',
        (select quantity from public.pantry_items where id = '40000000-0000-4000-8000-000000000002'),
        'expectedUpdatedAt',
        (select updated_at from public.pantry_items where id = '40000000-0000-4000-8000-000000000002')
      )
    ),
    'This should fail because the selected lot is in another household.'
  );

  raise exception 'RPC stock application with cross-household lot unexpectedly succeeded';
exception
  when check_violation then
    null;
end $$;

rollback;
`;

const result = spawnSync(
  "docker",
  ["exec", "-i", dbContainer, "psql", "-U", "postgres", "-d", "postgres"],
  {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"]
  }
);

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
