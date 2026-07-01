# MealBoard Release Readiness

Use this checklist before treating a MealBoard branch, deploy, or private MVP
build as ready for household use.

## Scope

MealBoard is a private family meal-planning and grocery-list app. Release work
should preserve the current review-first product boundaries:

- no hidden pantry stock mutation,
- no unapproved cloud Supabase migration pushes,
- no committed secrets or smoke credentials,
- no new AI, H-E-B, barcode, offline sync, or public signup behavior unless a
  task explicitly reopens that slice.

## Required Local Environment

Create `.env.local` from `.env.example` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is used by trusted local setup,
E2E helpers, and owner/admin flows. Never expose it in browser code or commit
it to the repo.

After `supabase db reset`, confirm `.env.local` still matches the active local
stack. If Supabase reports a new local URL or keys, either update the ignored
local env file or run commands with temporary environment overrides.

## Local Database Readiness

For schema, RLS, seed, pantry, household, or auth-adjacent work:

```powershell
supabase start
supabase db reset
```

If the local Supabase vector container enters a restart loop, follow the
targeted recovery in `docs/MVP_READINESS.md`; do not delete Docker volumes or
unrelated containers.

For database type refreshes, use the local schema:

```powershell
supabase gen types typescript --local > src/types/database.ts
```

If `npm run types:supabase:local` is available in the current branch, use that
script instead of typing the command manually.

## Standard Verification

The standard gate is:

```powershell
npm run verify
```

That runs unit/integration tests, lint, typecheck, production build, and
`git diff --check`.

Add focused smokes when the changed area requires browser proof:

```powershell
npm run e2e:auth-boundary
npm run e2e:smoke
npm run e2e:grocery-mobile
npm run e2e:recipe-import
npm run e2e:pwa
npm run e2e:pantry-consumption
npm run verify:pantry-rls
```

Authenticated smokes require a linked local household user:

```powershell
npm run e2e:seed-local-user
$env:MEALBOARD_E2E_EMAIL='mealboard-e2e-local@example.test'
$env:MEALBOARD_E2E_PASSWORD='Mealboard-e2e-local-12345!'
npm run e2e:smoke
Remove-Item Env:\MEALBOARD_E2E_EMAIL
Remove-Item Env:\MEALBOARD_E2E_PASSWORD
```

Do not copy generated smoke passwords into tracked docs or PR descriptions
beyond documented local defaults.

## Cloud Supabase Approval

Local migration verification is allowed during implementation. Cloud migration
pushes are not a casual side effect.

Before any cloud migration push:

1. Review the migration diff and affected RLS policies.
2. Run local `supabase db reset`.
3. Run the relevant app verification and RLS scripts.
4. Ask for explicit human approval naming the target cloud project.

## Pre-PR Checklist

- Working branch is based on current `origin/main`.
- No `.env*`, service-role keys, tokens, Playwright traces, screenshots, local
  logs, or Supabase temp files are staged.
- `next-env.d.ts` route-type churn is restored unless there is a deliberate
  Next config change.
- The diff is one intent and does not mix product work with cleanup.
- Verification commands and any skipped checks are listed in the PR body.

## Private Deploy Smoke

After a private deploy, use `docs/MVP_READINESS.md` as the manual smoke source
of truth. At minimum, verify:

- login reaches the protected app,
- Dashboard current-week card renders,
- Plan Week can create/select a week,
- a recipe can be created or opened,
- grocery list generation and lifecycle still work,
- pantry intake/consumption review remains explicit,
- PWA manifest and icons are served,
- no deferred feature appeared accidentally.

## Rollback Notes

For normal app code or docs, revert the focused PR or commit.

For schema changes, rollback must consider:

- whether the migration has reached cloud,
- whether data was written using the new schema,
- whether RLS behavior changed,
- whether application code and generated database types need to be reverted
  together.

If a deploy is bad but no cloud migration was pushed, prefer reverting the app
branch and redeploying. If a cloud migration was pushed, stop and plan the data
rollback explicitly before applying another migration.
