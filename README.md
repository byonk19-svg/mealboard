# MealBoard

MealBoard is a private family meal-planning and grocery-list web app.

This repo is separate from RT Scheduler. Product and technical decisions should follow:

- `docs/PRD.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/CODEX_TASKS.md`

## Current Slice

This repo currently contains the Task 03 auth and household bootstrap foundation:

- Next.js App Router
- TypeScript
- Tailwind
- shadcn/ui-compatible project structure
- Protected placeholder pages for the main navigation
- Supabase auth client helpers
- Simple email/password auth flow
- Current household membership lookup
- Supabase migrations for household, profile, category, food, preference, and preferred-product foundation tables
- Local Supabase seed data for one household, core profiles, grocery categories, and sample foods

It does not implement recipes, meal planning, grocery generation, profile editing, baby planning, or nutrition yet.

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
copy .env.example .env.local
```

Fill in Supabase values before using the protected app routes or login flow.

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Supabase Local Setup

Install the Supabase CLI if it is not already available:

```bash
npm install -g supabase
```

Start or reset the local database from the migrations and seed file:

```bash
supabase start
supabase db reset
```

The reset command applies files in `supabase/migrations/` and then runs `supabase/seed.sql`.

Task 02 seed data creates:

- `Yonkin-Lowery Household`
- Meal profiles: Brianna, Elaine, Baby, Shared/Family
- Default grocery categories
- Sample foods

`household_memberships` references `auth.users`, so this seed does not create a membership until a local auth user exists. A later auth/bootstrap task should connect the logged-in user to the seeded household.

## Auth and Household Bootstrap

Task 03 adds a simple Supabase email/password login at:

```txt
http://localhost:3000/login
```

Main app routes are protected. Unauthenticated users are redirected to `/login`.

For local development, create an auth user through the login page or Supabase Studio. Then link that user to the seeded household by running this SQL in local Supabase Studio after replacing the email:

```sql
insert into public.household_memberships (household_id, user_id, role)
select
  '00000000-0000-4000-8000-000000000001',
  id,
  'owner'
from auth.users
where email = 'you@example.com'
on conflict (household_id, user_id) do nothing;
```

Local Studio is available after `supabase start`; check your CLI output for the exact Studio URL. Do not commit `.env.local`, `.env.cloud.local`, access tokens, service-role keys, or Supabase temp files.

## Verification

Run the available checks:

```bash
npm run lint
npm run typecheck
npm run build
```

If the Supabase CLI is installed and Docker is running, also verify the database foundation with:

```bash
supabase db reset
```

## Project Structure

```txt
src/
  app/
    (app)/
      dashboard/
      grocery-list/
      plan-week/
      recipes/
      settings/
    login/
  components/
    app-shell/
    shared/
    ui/
  lib/
    supabase/
supabase/
  config.toml
  migrations/
  seed.sql
```

Business logic should live in `src/lib` where practical, with tests for pure logic as features are added.
