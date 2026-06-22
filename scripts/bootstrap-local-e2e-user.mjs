import { execFileSync } from "node:child_process";

const householdId =
  process.env.MEALBOARD_E2E_HOUSEHOLD_ID ??
  "00000000-0000-4000-8000-000000000001";
const email =
  process.env.MEALBOARD_E2E_EMAIL ?? "mealboard-e2e-local@example.test";
const password =
  process.env.MEALBOARD_E2E_PASSWORD ?? "Mealboard-e2e-local-12345!";
const databaseContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";

const sql = `
with upserted_user as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    coalesce(
      (select id from auth.users where lower(email) = lower(${sqlString(email)}) limit 1),
      gen_random_uuid()
    ),
    'authenticated',
    'authenticated',
    ${sqlString(email)},
    crypt(${sqlString(password)}, gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
  on conflict (email) where is_sso_user = false do update
    set encrypted_password = excluded.encrypted_password,
        email_confirmed_at = now(),
        updated_at = now(),
        raw_app_meta_data = excluded.raw_app_meta_data
  returning id, email
),
upserted_identity as (
  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    id::text,
    id,
    jsonb_build_object(
      'sub', id::text,
      'email', email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  from upserted_user
  on conflict (provider_id, provider) do update
    set identity_data = excluded.identity_data,
        updated_at = now()
  returning user_id
)
insert into public.household_memberships (household_id, user_id, role)
select ${sqlString(householdId)}, user_id, 'owner'
from upserted_identity
on conflict (household_id, user_id) do nothing;
`;

execFileSync(
  "docker",
  [
    "exec",
    "-i",
    databaseContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1"
  ],
  {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"]
  }
);

console.log(`Seeded local E2E user ${email} for household ${householdId}.`);
console.log("Use these environment variables when running npm run e2e:smoke:");
console.log(`MEALBOARD_E2E_EMAIL=${email}`);
console.log(`MEALBOARD_E2E_PASSWORD=${password}`);

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
