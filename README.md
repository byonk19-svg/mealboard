# MealBoard

MealBoard is a private family meal-planning and grocery-list web app.

This repo is separate from RT Scheduler. Product and technical decisions should follow:

- `docs/PRD.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/CODEX_TASKS.md`

## Current MVP Status

MealBoard has reached a private family MVP readiness checkpoint for the
planning and grocery loop, with newer foundations for rule-based suggestions,
baby solids previews, pending grocery-change visibility, weekly wrap-up, and
E2E smoke coverage.

The current core loop is:

```txt
Recipes -> Plan Week -> Staples -> Grocery List -> Dashboard
```

Implemented MVP surfaces include:

- Email/password auth and household-scoped app routes
- Household profiles, preferences, grocery categories, and foods foundation
- Recipe library with structured ingredients, profile approvals, and calorie/protein estimate fields
- Weekly planning with adult work/off days, planned recipe items, approval/lock/remove actions, staples review, and a small nutrition estimate summary
- Rule-based adult meal suggestion drafts with reason labels and why-this context
- Staples settings CRUD, weekly staple selection, and selected staples flowing into grocery generation
- Grocery list generation from approved planned meals and selected staples
- Pending grocery-change visibility when a finalized or shopping-started list would differ from the current approved plan
- Mobile-friendly grocery shopping list with Shopping/Profile/Meal views, source context, manual add-ons, checked/already-have state, and Draft -> Finalized -> Shopping Started -> Completed lifecycle
- Baby settings with stage context, baby food statuses, Baby Meal 1/2 routine preview, and Try This preview
- Dashboard current-week summary with planning status, grocery status, next best action, and optional weekly wrap-up entry after completed shopping
- Minimal Playwright smoke coverage for protected route auth boundaries, plus a credential-gated core-loop smoke

See `docs/MVP_READINESS.md` for the manual smoke checklist, known gaps, deferred features, and local environment notes.

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

For local smoke tests, seed a repeatable local auth user and membership:

```bash
npm run e2e:seed-local-user
```

By default this creates or reuses:

```txt
MEALBOARD_E2E_EMAIL=mealboard-e2e-local@example.test
MEALBOARD_E2E_PASSWORD=Mealboard-e2e-local-12345!
```

Run the authenticated smoke with those values in your shell environment:

```bash
npm run e2e:smoke
```

For ad hoc local development, create an auth user through the login page or Supabase Studio. Then link that user to the seeded household by running this SQL in local Supabase Studio after replacing the email:

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
npm test
npm run lint
npm run typecheck
npm run build
```

If the Supabase CLI is installed and Docker is running, also verify the local database with:

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
