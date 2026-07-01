# MealBoard Agent Guidance

This repo is MealBoard, not RT Scheduler.

MealBoard is a private family meal-planning and grocery-list web app. It is not a generic recipe app, diet tracker, pantry automation app, or H-E-B integration project.

## Critical Next.js Rule

This is not the Next.js you know.

This project uses a newer Next.js version with breaking changes. APIs, conventions, compiler behavior, routing behavior, and file structure may differ from model training data.

Before writing or editing Next.js code:

- Check the installed versions in `package.json`.
- Read the relevant installed guide in `node_modules/next/dist/docs/`.
- Prefer local installed docs over memory or generic examples.
- Heed deprecation notices.
- Do not introduce old Next.js patterns unless the installed docs confirm they are still valid.

Useful discovery commands:

- List local Next docs with PowerShell: `Get-ChildItem -LiteralPath node_modules/next/dist/docs -Recurse -File | Select-Object -First 100 -ExpandProperty FullName`
- Search local Next docs with PowerShell: `Select-String -Path node_modules/next/dist/docs/**/*.md -Pattern "search term" | Select-Object -First 50`
- Read a relevant doc with PowerShell: `Get-Content -LiteralPath node_modules/next/dist/docs/path/to/doc.md -TotalCount 220`
- List local Next docs with POSIX shell: `find node_modules/next/dist/docs -maxdepth 3 -type f | sort | head -100`
- Search local Next docs with POSIX shell: `grep -R "search term" node_modules/next/dist/docs | head -50`
- Read a relevant doc with POSIX shell: `sed -n '1,220p' node_modules/next/dist/docs/path/to/doc.md`

If `node_modules` is missing, run `npm install` before relying on local Next docs.

## Source of Truth

Read these before making product or architecture changes:

- `README.md` for current app status, setup, scripts, and implemented surfaces.
- `docs/MVP_READINESS.md` for the current private MVP state, manual smoke checklist, known gaps, and deferred features.
- `docs/PRD.md` for product intent and user-facing rules.
- `docs/TECHNICAL_PLAN.md` for architecture, data model, algorithms, and testing strategy.
- `docs/CODEX_TASKS.md` for small-slice implementation discipline.

When these docs appear to conflict:

1. Current code, `README.md`, and `docs/MVP_READINESS.md` describe what exists now.
2. `docs/PRD.md` and `docs/TECHNICAL_PLAN.md` describe product and technical intent.
3. `docs/CODEX_TASKS.md` describes original task order and slice discipline.

Do not remove or downgrade implemented features just because an older roadmap section described them as future-phase.

## Current Product Loop

The core MealBoard loop is:

Recipes -> Plan Week -> Staples -> Grocery List -> Dashboard

Do not rebuild this loop from scratch. Inspect the existing implementation first and make the smallest maintainable change.

Current implemented areas include:

- Email/password auth and household-scoped app routes.
- Household settings and owner-linked member management.
- Household profiles, preferences, grocery categories, saved-food administration, and staples.
- Recipe library with structured ingredients, profile approvals, nutrition estimate fields, recipe import review, and private Chrome capture.
- Weekly planning with adult work/off days, goals, suggestions, swaps, approvals, locks, removals, staples review, and baby plan persistence.
- Grocery generation with Shopping/Profile/Meal views, source context, manual add-ons, checked/already-have state, lifecycle status, pending grocery-change review, plain-text copy, and recovery tools.
- Baby settings and baby solids planning.
- Dashboard next-action and needs-attention flow.
- Weekly wrap-up learning.
- Smart Pantry review flows and Cooking Mode consumption review.
- PWA install metadata without offline/service-worker behavior.
- Playwright smoke coverage for key flows.

## MVP and Deferred-Feature Boundaries

Do not add or expand these unless the user explicitly asks for that slice:

- AI meal planning, AI nutrition estimation, or AI-first recipe cleanup.
- H-E-B integration, H-E-B export, aisle mapping, price behavior, or product availability.
- Native iPhone or Android apps.
- Barcode scanning.
- Expiration reminders or automated expiration behavior.
- Hidden or automatic pantry stock mutation.
- Recipe photos or photo/screenshot recipe extraction.
- Public Chrome Web Store extension release.
- Full macro tracking, nutrition API integrations, strict nutrition dashboards, or punitive diet messaging.
- Baby milk intake, formula tracking, or medical/reaction tracking.
- Email-delivered household invitations.
- Role editing beyond current owner-transfer/member-management behavior.
- Multi-household switching.
- Full offline/PWA service-worker behavior.
- Grocery history intelligence beyond current recent completed-list access.

Smart Pantry and Cooking Mode review flows already exist. Preserve their review-first behavior. Do not make grocery completion, Cooking Mode completion, Already Have toggles, intake review, or consumption review silently mutate stock.

## Product Principles

MealBoard should feel calm, practical, family-friendly, mobile-first, and not diet-shamey or medical-feeling.

Important product rules:

- The user stays in control. Plans start as drafts and require review.
- Rule-based reliability comes before AI.
- Weekly planning should support Brianna, Elaine, Baby, and Shared/Family needs separately.
- Auth users are not the same as meal profiles.
- Elaine can have a meal profile without having a separate login.
- Baby planning is solids-focused guidance, not a medical tracker.
- Baby guidance should be calm, lightweight, and grounded.
- New baby foods belong in Try This and should not automatically enter groceries.
- Allergies and Hard No foods block meals for the affected profile.
- Dislikes warn but do not block by default.
- Shared/family meals must respect every assigned profile's allergy and Hard No rules.
- Nutrition totals come from meal plan items, not grocery list items.
- Snacks and drinks count toward nutrition only when intentionally assigned to a person/day.
- Grocery items must preserve source context so the user can answer, "Why is this on my list?"
- Meal plan changes after grocery finalization or shopping start must go through pending grocery-change review. Do not silently rewrite protected grocery lists.

## Architecture Rules

Prefer this structure:

- `src/app/` - Next.js App Router routes and route groups.
- `src/components/` - focused UI components.
- `src/components/ui/` - shared UI primitives.
- `src/lib/` - business logic, Supabase helpers, and testable rules.
- `src/types/` - app and database types.
- `supabase/migrations/` - schema changes.
- `supabase/seed.sql` - local seed data.
- `e2e/` - Playwright smoke coverage.
- `scripts/` - local verification and E2E helpers.
- `extension/mealboard-recipe-capture/` - private unpacked Chrome recipe capture extension.

Keep core business logic out of large UI components when practical.

Good homes for pure logic include:

- `src/lib/meal-planning/`
- `src/lib/grocery/`
- `src/lib/nutrition/`
- `src/lib/baby/`
- `src/lib/preferences/`
- `src/lib/recipes/`
- `src/lib/dates/`
- `src/lib/validation/`
- `src/lib/supabase/`

Add or update unit tests for pure business logic.

## Supabase and Security Rules

Use Row Level Security for household-owned data.

A user should only access rows for households they belong to.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

Service-role access is allowed only in trusted server-only scripts, seed scripts, local E2E setup, or admin operations.

Do not commit:

- `.env.local`
- `.env.cloud.local`
- access tokens
- service-role keys
- Supabase temp files
- smoke-test credentials

Cloud Supabase migration pushes require explicit human approval. Do not push cloud migrations as a casual side effect of another task.

For local database verification, prefer `supabase db reset` when the task touches migrations, RLS, seed data, household access, pantry flows, or database assumptions.

## Recipe Import and Extension Rules

Recipe URL import and private Chrome capture are review-first.

Imported or captured recipes must open a review screen before saving.

Do not save raw source-page content as the final recipe.

Do not collect recipe photos.

The Chrome extension should capture only after the user clicks it. It should send URL, title, JSON-LD recipe data, and selected text fallback into MealBoard review. It must not save recipes directly.

## Pantry and Cooking Mode Rules

Pantry behavior must stay explicit and review-first.

Do not silently deduct stock from Cooking Mode completion.

Do not silently add pantry stock from grocery completion.

Do not silently mutate stock from Already Have, checked state, intake review, or consumption review.

When adding pantry-related behavior:

- Preserve household scoping.
- Preserve actor attribution when authenticated.
- Preserve audit/event history.
- Prefer explicit confirm/skip/apply/reverse flows.
- Add focused tests and the relevant E2E smoke.

## Dependency Rules

Do not add new dependencies without asking first.

Prefer existing project utilities, browser APIs, Supabase helpers, and simple TypeScript before adding packages.

Do not run `npm audit fix --force`. It may choose unsafe downgrade paths. Inspect audit output and dependency trees before changing package versions.

## Commands

Install dependencies:

- `npm install`

Run dev server:

- `npm run dev`

Run the standard local verification sequence:

- `npm run verify`

The standard verification script runs tests, lint, typecheck, build, and `git diff --check`.

Individual checks:

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Playwright setup:

- `npm run e2e:install`
- `npm run e2e:seed-local-user`

Focused E2E scripts:

- `npm run e2e:auth-boundary`
- `npm run e2e:smoke`
- `npm run e2e:grocery-mobile`
- `npm run e2e:settings-foods`
- `npm run e2e:household-members`
- `npm run e2e:baby-settings`
- `npm run e2e:extension-capture`
- `npm run e2e:recipe-import`
- `npm run e2e:pwa`
- `npm run e2e:cooking-mode`
- `npm run e2e:pantry`
- `npm run e2e:pantry-intake`
- `npm run e2e:pantry-consumption`
- `npm run e2e:plan-week-pantry-aware`

Other verification:

- `npm run verify:pantry-rls`
- `supabase db reset`

## Validation Expectations

For documentation-only changes:

- Run `git diff --check`.
- Run `npm run lint` if markdown-adjacent tooling or code snippets changed.

For copy-only UI changes:

- Run `npm run lint`.
- Run `npm run typecheck` if component props or rendered branches changed.

For `src/lib/*` business logic:

- Run `npm test`.
- Run `npm run typecheck`.
- Run the focused E2E script when behavior touches a covered flow.

For Next.js routes, app structure, server actions, middleware, or package changes:

- Read relevant local Next docs first.
- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run build`.

For Supabase migrations, RLS, seed data, auth, household access, or service-role behavior:

- Run `supabase db reset` when local Supabase is available.
- Run `npm run verify:pantry-rls` for pantry RLS changes.
- Run `npm run e2e:auth-boundary` for protected route/auth changes.
- Run `npm run e2e:household-members` for household member lifecycle changes.

For recipe import or extension changes:

- Run `npm run e2e:recipe-import`.
- Run `npm run e2e:extension-capture` when the extension handoff is touched.

For grocery list changes:

- Run `npm test`.
- Run `npm run e2e:grocery-mobile`.
- Run `npm run e2e:smoke`.
- Verify source context, manual items, checked/already-have state, and lifecycle behavior are preserved.

For Plan Week changes:

- Run `npm test`.
- Run `npm run e2e:smoke`.
- Run `npm run e2e:plan-week-pantry-aware` when pantry-aware planning is touched.

For baby planning/settings changes:

- Run `npm run e2e:baby-settings`.
- Confirm Try This foods do not automatically enter groceries.

For pantry or Cooking Mode changes:

- Run the relevant tests.
- Run one or more of:
  - `npm run e2e:pantry`
  - `npm run e2e:pantry-intake`
  - `npm run e2e:pantry-consumption`
  - `npm run e2e:cooking-mode`
  - `npm run e2e:plan-week-pantry-aware`
  - `npm run verify:pantry-rls`

For PWA/install metadata changes:

- Run `npm run e2e:pwa`.
- Do not add service-worker/offline behavior unless explicitly requested.

If a check cannot be run, say exactly why. Do not claim a check passed unless it actually ran.

## Workflow Expectations

Before coding:

- Start from a clean working tree.
- Read this file.
- Read the relevant docs.
- Inspect existing implementation before adding new code.
- Search narrowly before opening large files.
- Keep work to one small, reviewable slice.

During coding:

- Make the smallest maintainable change.
- Prefer existing patterns.
- Avoid broad refactors.
- Do not mix unrelated cleanup with feature work.
- Do not rename domain concepts casually.
- Do not add new architecture unless the current task needs it.
- Keep mobile grocery use in mind.
- Keep household scoping and RLS in mind.

After coding:

- Run the narrowest useful verification, or the full `npm run verify` when risk is broad.
- Update docs when behavior, setup, boundaries, scripts, or known gaps change.
- Review the diff.
- Make sure no secrets or local env files are included.

## Context Discipline

Avoid dumping huge files, logs, JSON, generated output, full build output, or full diffs.

For commands with potentially large output, cap output before reporting it.

PowerShell examples:

- `COMMAND 2>&1 | Select-Object -First 80`
- `COMMAND 2>&1 | Select-Object -Last 80`

POSIX shell examples:

- `COMMAND 2>&1 | head -c 4000`
- `COMMAND 2>&1 | tail -c 4000`

Prefer targeted reads:

- `Get-Content -LiteralPath path/to/file -TotalCount 220`
- `Select-String -Path path/to/folder/* -Pattern "term" | Select-Object -First 50`
- `Get-ChildItem -LiteralPath path -Recurse -File | Select-Object -First 100`
- `sed -n '1,220p' path/to/file`
- `grep -R "term" path/to/folder | head -50`
- `find path -maxdepth 3 -type f | sort | head -100`

## Final Response Format

After each task, summarize:

- What changed.
- Files touched.
- What verification ran.
- Any verification that could not run.
- Any risk or follow-up needed.

Do not hide uncertainty. Do not claim tests passed unless they were run.
