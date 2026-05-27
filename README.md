# MealBoard

MealBoard is a private family meal-planning and grocery-list web app.

This repo is separate from RT Scheduler. Product and technical decisions should follow:

- `docs/PRD.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/CODEX_TASKS.md`

## Current Slice

This repo currently contains the Task 02 database foundation:

- Next.js App Router
- TypeScript
- Tailwind
- shadcn/ui-compatible project structure
- Placeholder pages for the main navigation
- Supabase environment placeholders
- Supabase migrations for household, profile, category, food, preference, and preferred-product foundation tables
- Local Supabase seed data for one household, core profiles, grocery categories, and sample foods

It does not implement recipes, meal planning, grocery generation, auth UI, baby planning, or nutrition yet.

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
copy .env.example .env.local
```

Fill in Supabase values when connecting the app to a local or hosted Supabase project. The current UI placeholders do not require real Supabase credentials yet.

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
    dashboard/
    grocery-list/
    plan-week/
    recipes/
    settings/
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
