# MealBoard

MealBoard is a private family meal-planning and grocery-list web app.

This repo is separate from RT Scheduler. Product and technical decisions should follow:

- `docs/PRD.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/CODEX_TASKS.md`

## Current Slice

This repo currently contains the Task 01 app foundation only:

- Next.js App Router
- TypeScript
- Tailwind
- shadcn/ui-compatible project structure
- Placeholder pages for the main navigation
- Supabase environment placeholders

It does not implement recipes, meal planning, grocery generation, database schema, or auth yet.

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
copy .env.example .env.local
```

Fill in Supabase values when the Supabase task is implemented. The foundation app does not require real Supabase credentials yet.

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Verification

Run the available checks:

```bash
npm run lint
npm run typecheck
npm run build
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
```

Business logic should live in `src/lib` where practical, with tests for pure logic as features are added.
