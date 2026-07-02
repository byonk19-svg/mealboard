# MealBoard Dogfood Findings

## Date / Branch / Environment

- Date: 2026-07-02
- Branch: `main` (`main...origin/main [ahead 1]` before this report)
- Local URL: `http://localhost:3120` for the manual browser pass; Playwright scripts used their configured local ports
- Browser: Chromium via Playwright
- Commands run:
  - `git status -sb`
  - `git diff --stat`
  - `docker ps --filter "name=supabase"`
  - `docker ps --filter "name=supabase_storage_mealboard"`
  - `docker logs supabase_storage_mealboard --tail=100`
  - `supabase db reset`
  - `supabase db reset --debug`
  - `supabase stop`
  - `supabase start`
  - `supabase db reset`
  - `npm run e2e:seed-local-user`
  - `npm run e2e:smoke`
  - browser-driven manual dogfood pass through Chromium
  - `npm run e2e:dogfood`

## Summary

MealBoard feels usable for private family MVP use. The main planning -> grocery -> shopping -> dashboard/wrap-up loop completed in a real browser, including recipe/staple setup, rule-based suggestions, profile/day views, grocery generation, manual grocery add, protected-list review after finalization, mobile grocery review, shopping completion, and weekly wrap-up.

The strongest product signal is positive: MealBoard prevented silent grocery-list mutation after finalization and required an explicit reviewed update. The observed issues are not core flow blockers. They are mostly accessibility/testability and console reliability cleanup.

## What Worked Well

- Dashboard gave a clear next action for a household with no current-week plan.
- Recipe creation, staple creation, weekly setup, and adding a saved recipe all worked through visible UI controls.
- Rule-based suggestions were discoverable and stayed in a needs-review state until approval.
- Profile view made Brianna, Elaine, Baby, and Shared/Family sections visible.
- Grocery generation worked from an approved meal plus selected staple.
- Shopping, Profile, and Meal grocery views all rendered source context.
- Manual grocery item add worked while shopping.
- Checked item state updated immediately from `Check off` to `Uncheck`.
- Protected finalized-list behavior was clear: removing a planned meal showed `Protected grocery list: Finalized`, said MealBoard would not silently change the list, and required `Apply reviewed grocery updates`.
- Mobile grocery buttons were usable at a 390px-wide viewport. The sampled primary buttons were about 48-50px tall.
- Weekly wrap-up opened after shopping completion.

Evidence screenshots:

- Dashboard: `test-results/dogfood-1783011541177/01-dashboard.png`
- Desktop grocery list: `test-results/dogfood-1783011541177/03-grocery-shopping-desktop.png`
- Mobile grocery list: `test-results/dogfood-1783011541177/04-grocery-mobile.png`
- Weekly wrap-up: `test-results/dogfood-1783011541177/05-weekly-wrap-up.png`

## High-Confidence Issues

### Weekly wrap-up logs a React hydration mismatch

- Severity: medium
- Where it happened: `/weekly-wrap-up/[weeklyPlanId]`
- Steps to reproduce:
  1. Complete the planning -> grocery -> shopping flow.
  2. Open the weekly wrap-up route.
  3. Inspect browser console output.
- Expected behavior: weekly wrap-up opens without React hydration errors.
- Actual behavior: the page opened, but Chromium logged a React hydration mismatch. The warning included hidden and text inputs whose client-side attributes differed from server HTML, including `style={{caret-color:"transparent"}}`.
- Evidence: browser console captured:

  ```txt
  A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up.
  ```

- Suggested fix: inspect the weekly-wrap-up form inputs for client-only attributes or browser-mutated styles during hydration. Keep the server and client-rendered input attributes deterministic.

### Core smoke initially hit an ambiguous planned-meal Remove target

- Severity: medium
- Where it happened: `npm run e2e:smoke`, Plan Week post-finalization removal step
- Steps to reproduce:
  1. Run the local setup and seed the default E2E user.
  2. Run `npm run e2e:smoke`.
- Expected behavior: the smoke removes the intended planned meal after grocery finalization and verifies pending grocery updates.
- Actual behavior: one smoke run failed because `getByRole('article', { name: 'Planned meal ...' }).getByRole('button', { name: 'Remove' })` resolved to 8 matching Remove buttons. A later headed `npm run e2e:dogfood` run passed, so this appears intermittent or state-sensitive rather than a confirmed product blocker.
- Evidence:

  ```txt
  strict mode violation: getByRole('article', { name: 'Planned meal E2E Turkey Wrap ...' }).getByRole('button', { name: 'Remove' }) resolved to 8 elements
  ```

  Trace: `test-results/core-loop.smoke-MealBoard--4529c-shops-and-reaches-dashboard-chromium/trace.zip`

- Suggested fix: tighten the smoke selector to the exact planned-meal card, or make planned meal accessible names unique by day/profile/slot so assistive-tech and test queries cannot accidentally match ancestor or repeated meal regions.

### Grocery page has ambiguous `Groceries` heading names

- Severity: low
- Where it happened: `/grocery-list`
- Steps to reproduce:
  1. Open the grocery list page with a generated list.
  2. Query headings by accessible name `Groceries` without exact matching.
- Expected behavior: the top-level `Groceries` heading is distinct from section headings.
- Actual behavior: `Groceries` matched both the H1 and `Groceries for week of ...`.
- Evidence: manual browser pass recorded `Non-exact heading query for Groceries matches 2 headings.`
- Suggested fix: rename the section heading to something distinct, such as `Current list for week of ...`, or ensure tests target the H1 exactly.

## UX Friction / Confusing Moments

- The dashboard correctly guided the current real week, but the dogfood-created future planning week did not change the dashboard because it was intentionally outside the current week. That is correct behavior, but future dogfood should use a current or near-current week if the goal is to judge dashboard follow-through after shopping.
- The initial Supabase reset blocker was local environment friction, not product UX. It cleared after a normal `supabase stop`, `supabase start`, and `supabase db reset`.

## Mobile Grocery Notes

- The mobile grocery page was usable at 390px width.
- Primary actions were reachable: `Copy list`, `Show emergency backup`, `Complete shopping`, `Add item`, `Check off`, and `Already have`.
- Sampled mobile button dimensions were roughly 48-50px tall, which is appropriate for one-handed tapping.
- The mobile page preserved lifecycle state and item counts clearly: `Shopping Started`, `2 items left to buy`, totals, remaining, checked, and already-have counts were visible.

## Recommended Next Tasks

1. Run one current-week dogfood pass to judge dashboard follow-through after shopping completion, not only future-week planning.
2. Keep issue #34 separate: this pass did not exercise real household pantry stock application during actual meals.

## Resolution Notes

Follow-up completed on 2026-07-02.

- Weekly wrap-up hydration mismatch: rechecked with a browser flow that opened `/weekly-wrap-up/[weeklyPlanId]` without taking a Playwright screenshot on the route. No console warnings or errors were logged. The original `caret-color: transparent` mismatch appears to have been caused by Playwright screenshot caret-hiding mutating form inputs during capture, not by MealBoard-rendered weekly-wrap-up markup. No app code change was made for this.
- Planned-meal Remove ambiguity: fixed. Day/profile plan containers now have explicit accessible names, planned meal cards include day/profile/slot context in their accessible names, and the Remove action has a meal-specific accessible label. The core smoke now targets that specific Remove action.
- Grocery heading ambiguity: fixed. The grocery overview card now uses a distinct heading, `Current grocery run` or `Completed grocery run`, instead of repeating the page-level `Groceries` heading.

Validation for the fix pass:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run e2e:grocery-mobile` passed.
- `npm run verify` passed.
- `npm run e2e:smoke` passed.
- `npm run e2e:dogfood -- --list` passed.
- `npm run e2e:dogfood` passed.
