# MealBoard

MealBoard is a private family meal-planning and grocery-list web app.

This repo is separate from RT Scheduler. Product and technical decisions should follow:

- `docs/PRD.md`
- `docs/TECHNICAL_PLAN.md`
- `docs/CODEX_TASKS.md`

## Current MVP Status

MealBoard has reached a private family MVP readiness checkpoint for the
planning and grocery loop, with rule-based suggestions, smart swaps, baby
solids planning, an actionable dashboard queue, pending grocery-change
review/apply handling, owner-linked household members, install metadata,
weekly wrap-up learning, and E2E smoke coverage.

The current core loop is:

```txt
Recipes -> Plan Week -> Staples -> Grocery List -> Dashboard
```

Implemented MVP surfaces include:

- Email/password auth and household-scoped app routes
- Household settings for owner-only linking, ownership transfer, and removal of existing member users
- Household profiles, preferences, grocery categories, dedicated saved-food administration, and a Preferences food-create flow
- Recipe library with structured ingredients, profile approvals, calorie/protein estimate fields, review-first structured URL import, source attribution, and a private unpacked Chrome recipe capture extension
- Weekly planning with adult work/off days, Day/Profile views, planned recipe items, approval/lock/remove/swap actions, staples review, and a small nutrition estimate summary
- Rule-based adult meal suggestion drafts with reason labels, why-this context, and recent wrap-up review signals
- Current-week repeat awareness and too-much-leftover feedback in rule-based suggestion scoring
- Smart swap suggestions with confirmation and grocery add/remove/keep impact preview
- Staples settings CRUD, weekly staple selection, and selected staples flowing into grocery generation
- Grocery list generation from approved planned meals, persisted approved baby foods, and selected staples
- Pending grocery-change review/apply handling when a finalized or shopping-started list would differ from the current approved plan
- Mobile-friendly grocery shopping list with Shopping/Profile/Meal views, source context, generic copyable plain text, manual add-ons, checked/already-have state, bounded spotty-service retry/manual recovery for item state taps, and Draft -> Finalized -> Shopping Started -> Completed lifecycle
- Baby settings with stage context, baby food statuses, Baby Meal 1/2 routine preview, Try This preview with manual status handoff, and Plan Week Baby Meal 1/2 persistence
- Dashboard current-week summary with planning status, grocery status, next best action, setup-aware and calorie-guidance needs-attention items, and optional weekly wrap-up entry after completed shopping
- Weekly wrap-up capture for made/skipped meals, leftovers, recipe/profile feedback, source-aware unused groceries, and explicit staple/quantity review handoff
- Recipe library filters for search, status, planning approval, and nutrition-review needs
- PWA install metadata and app icons without offline/service-worker behavior
- Playwright smoke coverage for protected route auth boundaries, plus credential-gated core-loop, settings-foods, household-member, and mobile grocery smokes

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
`SUPABASE_SERVICE_ROLE_KEY` is used only by server-side household member
linking and local E2E setup; never expose it to browser code.

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Recipe URL Import And Private Chrome Capture

MealBoard can import structured recipe data from `/recipes/import`. Imported
recipes always open a review screen before saving, and final recipes store only
reviewed fields plus source URL/title attribution.

The private unpacked Chrome capture extension lives at:

```txt
extension/mealboard-recipe-capture
```

To use it locally:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked".
4. Select `extension/mealboard-recipe-capture`.
5. In the extension popup, keep the MealBoard URL pointed at the local app, such as `http://localhost:3000`.

The extension captures only the active tab after clicking it. It sends page URL,
title, JSON-LD recipe data, and selected text fallback into MealBoard review; it
does not save recipes directly or collect recipe photos.

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
npm run e2e:grocery-mobile
npm run e2e:settings-foods
npm run e2e:household-members
npm run e2e:baby-settings
npm run e2e:recipe-import
npm run e2e:pwa
```

For `npm run e2e:household-members`, also seed an unlinked second auth user:

```powershell
$env:MEALBOARD_E2E_EMAIL='mealboard-e2e-member-local@example.test'
$env:MEALBOARD_E2E_PASSWORD='Mealboard-e2e-member-local-12345!'
$env:MEALBOARD_E2E_SKIP_MEMBERSHIP='true'
npm run e2e:seed-local-user
Remove-Item Env:\MEALBOARD_E2E_SKIP_MEMBERSHIP
```

The household-member smoke derives the local email-to-user-id lookup from the seeded auth user. Set `MEALBOARD_LOCAL_AUTH_USER_LOOKUP` manually only for non-Docker or non-default local auth setups.

The Playwright smoke scripts use separate default ports to avoid common local
dev-server collisions. Override with `PLAYWRIGHT_PORT=3128` or another free
port when needed.

For ad hoc local development, create the first owner auth user through the login
page or Supabase Studio. Then link that first owner to the seeded household by
running this SQL in local Supabase Studio after replacing the email:

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

After the first owner can sign in, open `/settings/household` to link additional
existing auth users by email, transfer ownership to another household member,
or remove a non-owner member. This MVP prep slice does not send email
invitations or support multiple households per login yet.

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

Current dependency-audit note: Next is pinned to the current stable patch and
`package.json` uses a targeted override so Next's vendored PostCSS resolves to
the patched `8.5.10` line. Do not run `npm audit fix --force`; it can still
choose unsafe downgrade paths on future advisories.

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
