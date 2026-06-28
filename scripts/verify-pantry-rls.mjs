import { spawnSync } from "node:child_process";

const dbContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";

const sql = String.raw`
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'pantry-one@example.test', 'authenticated', 'authenticated', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'pantry-two@example.test', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.households (id, name)
values
  ('20000000-0000-4000-8000-000000000001', 'Pantry RLS Household One'),
  ('20000000-0000-4000-8000-000000000002', 'Pantry RLS Household Two')
on conflict (id) do nothing;

insert into public.household_memberships (household_id, user_id)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002')
on conflict (household_id, user_id) do nothing;

insert into public.foods (id, household_id, name)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'RLS Apples'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'RLS Bananas')
on conflict (id) do nothing;

insert into public.grocery_lists (id, household_id, name, status)
values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Pantry RLS List One', 'completed'),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Pantry RLS List Two', 'completed')
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
  )
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into public.pantry_items (id, household_id, food_id, display_name)
values (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'RLS apples lot'
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

select case when (
  select count(*) from public.pantry_items where id = '40000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one item read failed ' || (select count(*) from public.pantry_items))::integer::text end as user_one_can_read_item;

select case when (
  select count(*) from public.pantry_events where id = '50000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one event read failed ' || (select count(*) from public.pantry_events))::integer::text end as user_one_can_read_event;

select case when (
  select count(*) from public.pantry_intake_decisions where id = '80000000-0000-4000-8000-000000000001'
) = 1 then 'ok' else ('user one intake decision read failed ' || (select count(*) from public.pantry_intake_decisions))::integer::text end as user_one_can_read_intake_decision;

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
  when foreign_key_violation then
    null;
end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select case when (
  select count(*) from public.pantry_items where id = '40000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two item isolation failed ' || (select count(*) from public.pantry_items))::integer::text end as user_two_cannot_read_item;

select case when (
  select count(*) from public.pantry_events where id = '50000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two event isolation failed ' || (select count(*) from public.pantry_events))::integer::text end as user_two_cannot_read_event;

select case when (
  select count(*) from public.pantry_intake_decisions where id = '80000000-0000-4000-8000-000000000001'
) = 0 then 'ok' else ('user two intake decision isolation failed ' || (select count(*) from public.pantry_intake_decisions))::integer::text end as user_two_cannot_read_intake_decision;

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
