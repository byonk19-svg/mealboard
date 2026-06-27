# Cooking Mode V0 Implementation Issues

Source docs:

- `docs/COOKING_MODE_V0_PRD.md`
- `docs/ISSUE_LABELS.md`

This is a local issue plan only. Do not publish these issues to GitHub, Linear, or any external tracker unless explicitly requested later.

## Assumptions

- Cooking Mode V0 is post-MVP and recipe-backed; ad hoc non-recipe cooking is out of scope.
- The first implementation can add new Supabase tables and RLS policies locally, but should not push cloud migrations without explicit approval.
- Existing household/auth, recipe, weekly plan, recipe review, and wrap-up patterns should be reused.
- Current step persistence can be modeled as explicit session progress, with a fallback to the first unchecked step when no current step is set.
- Timers are in-app only. They persist enough to recover after reload, but do not use push notifications, background timers, or OS-level alerts.
- The canonical Cooking Mode route is `/recipes/[recipeId]/cook`.
- Plan Week links into the canonical Cooking Mode route with optional planned meal context: `/recipes/[recipeId]/cook?plannedMealId=<id>`.
- Direct recipe Cooking Sessions use recipe default servings in V0; direct serving or scale adjustment inside Cooking Mode is out of scope.
- If launched from Plan Week, Cooking Mode uses the planned meal servings or scale snapshot only when that data already exists.
- Completing a Cooking Session records made/tried evidence. If the existing recipe status is exactly Idea, completion may promote it to Tried. Completion must not downgrade or otherwise mutate recipe status.
- Dashboard resume is out of scope for V0.

## Resolved Product Decisions

- Route names: use `/recipes/[recipeId]/cook` as the canonical route. Plan Week should link to `/recipes/[recipeId]/cook?plannedMealId=<id>` when launching from a planned meal.
- Recipe scale: direct recipe sessions use recipe default servings in V0. Planned meal context may supply planned meal servings or scale only if that data already exists.
- Completion evidence: completion records made/tried evidence. If the recipe status is exactly Idea, completion may promote it to Tried. No other recipe status mutation is allowed.
- Dashboard resume: Dashboard resume is a V1 follow-up and should not be included in V0 implementation issues.

## V1 Follow-Up Notes

- Add Dashboard resume for active or paused Cooking Sessions after V0 proves recipe and Plan Week entry points.

## Issue 1: Add Cooking Mode Schema and RLS Foundation

### Goal

Create the database foundation for reviewed Recipe Steps, Cooking Sessions, session ingredient/step snapshots, and Cooking Timers with household-scoped access rules.

### Scope

- Add schema for reviewed Recipe Steps linked to saved recipes.
- Add schema for Cooking Sessions with active, paused, completed, and abandoned states.
- Add schema for session ingredient snapshots and session step snapshots.
- Add schema for Cooking Timers owned by Cooking Sessions.
- Add household-scoped RLS, grants, constraints, and indexes for the new tables.
- Preserve the existing freeform recipe instructions field as display/source text.

### Out of Scope

- Cooking Mode UI.
- Recipe Step conversion UI.
- Timer controls.
- Completion side effects.
- Voice controls, pantry deduction, Smart Pantry integration, grocery mutations, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- Migrations create all Cooking Mode V0 tables, constraints, indexes, grants, and RLS policies.
- Recipe Steps support global sort order and optional section label.
- Cooking Sessions require a recipe and may optionally reference a weekly plan item.
- Session snapshots can preserve effective ingredient and step text independent of later recipe edits.
- Cooking Timer records support ready, running, paused, expired, dismissed, and canceled states.
- Household members can only access Cooking Mode rows for their household.

### Test Expectations

- Run local migration verification when available.
- Add RLS/household access verification appropriate to the repo's existing Supabase patterns.
- Add schema-adjacent tests or migration checks proving cross-household access is blocked.

### Dependencies

- None - can start immediately.

### Suggested Labels

- `feature:cooking-mode`
- `area:database`
- `area:recipes`
- `area:rls`
- `type:schema`
- `priority:p0`
- `size:medium`

### Estimated Size

medium

## Issue 2: Build Cooking Mode Data Access and Domain Helpers

### Goal

Add the data-access and pure domain helpers needed to create, read, and transition Cooking Sessions safely before building the full UI.

### Scope

- Add data-access functions for Recipe Steps, Cooking Sessions, session snapshots, session progress, and timers.
- Add pure helpers for valid Cooking Session lifecycle transitions.
- Add pure helpers for snapshot creation from a recipe.
- Add pure helpers for applying planned meal servings or scale to a Cooking Session snapshot when that data already exists.
- Add helper behavior for completion warnings when ingredients or steps are unchecked.
- Ensure abandoned sessions are inert in helper behavior.

### Out of Scope

- User-facing Cooking Mode page.
- Timer UI.
- Recipe Step authoring UI.
- Completion side effects that update recipe/weekly-plan state.
- Voice controls, pantry deduction, Smart Pantry integration, grocery mutations, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- The app can create a valid recipe-backed Cooking Session snapshot through data-access helpers.
- Direct recipe sessions use recipe default servings and scale.
- Weekly-plan sessions use the linked weekly plan item's planned servings or scale snapshot when that data already exists.
- Active sessions keep their snapshot even when the underlying recipe changes later.
- Lifecycle helpers allow active, paused, completed, and abandoned transitions and reject invalid transitions.
- Completion warning helpers report unchecked ingredients and steps without blocking completion.

### Test Expectations

- Unit tests cover direct recipe snapshot creation.
- Unit tests cover weekly-plan snapshot creation with planned meal servings or scale when that data already exists.
- Unit tests cover valid and invalid lifecycle transitions.
- Unit tests cover completion warnings with unchecked ingredients and steps.
- Unit tests prove abandoned sessions do not request downstream side effects.

### Dependencies

- Issue 1.

### Suggested Labels

- `feature:cooking-mode`
- `area:recipes`
- `area:database`
- `area:tests`
- `type:data-layer`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 3: Add Reviewed Recipe Steps Management

### Goal

Let users create and maintain reviewed Recipe Steps for a saved recipe so Cooking Mode has a reliable step source of truth.

### Scope

- Add a recipe-facing way to view, add, edit, reorder, and delete reviewed Recipe Steps.
- Support optional section labels on steps.
- Add a review-first conversion helper from freeform recipe instructions into step candidates.
- Require user review before step candidates become reviewed Recipe Steps.
- Show clear empty state when a recipe has freeform instructions but no reviewed steps.

### Out of Scope

- Starting a Cooking Session.
- Cooking Mode page.
- Branching or conditional structured steps.
- Separate section records.
- Voice controls, pantry deduction, Smart Pantry integration, grocery mutations, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- A recipe can have reviewed, ordered Recipe Steps.
- Freeform recipe instructions remain unchanged when Recipe Steps are created or edited.
- Conversion from freeform instructions creates editable candidates, not silently accepted steps.
- Section labels can be assigned and displayed as lightweight grouping labels.
- Recipes with no reviewed steps clearly prompt the user to review or create Cooking Steps before Cooking Mode.

### Test Expectations

- Unit tests cover instruction-to-step candidate splitting.
- Unit tests cover section label preservation when detectable.
- Unit tests prove candidate conversion does not mutate freeform instructions by itself.
- Add focused UI or server-action tests following existing patterns where practical.

### Dependencies

- Issue 1.
- Issue 2.

### Suggested Labels

- `feature:cooking-mode`
- `area:recipes`
- `area:ui`
- `area:tests`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 4: Add Recipe and Plan Week Cooking Mode Entry Points

### Goal

Provide clear entry points to start or resume a recipe-backed Cooking Session from saved recipes and planned weekly meals.

### Scope

- Add Start Cooking behavior from a saved recipe when reviewed Recipe Steps exist.
- Add a Review Cooking Steps path when a recipe has no reviewed steps.
- Add Start Cooking behavior from a weekly plan item with a recipe by linking to `/recipes/[recipeId]/cook?plannedMealId=<id>`.
- Use planned meal servings or scale snapshot when launching from a weekly plan item if that data already exists.
- Add resume behavior when an active or paused session already exists for the relevant recipe/session context.
- Avoid duplicate active sessions for the same recipe context unless the user explicitly abandons or resumes.

### Out of Scope

- Full Cooking Mode checklist page beyond a minimal start/resume target.
- Timer UI.
- Completion and abandon lifecycle UI.
- Dashboard resume affordance.
- Separate Plan Week Cooking Mode route unless the existing app architecture clearly requires it.
- Voice controls, pantry deduction, Smart Pantry integration, grocery mutations, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- Users can start a Cooking Session from a saved recipe with reviewed steps.
- Users are directed to review/create Recipe Steps before cooking recipes without reviewed steps.
- Users can start a Cooking Session from a weekly plan item through `/recipes/[recipeId]/cook?plannedMealId=<id>`.
- Users can preserve planned meal servings or scale in the snapshot when that data already exists.
- Users can resume an active or paused session instead of creating accidental duplicates.
- Entry points respect household scoping and protected route behavior.

### Test Expectations

- Unit or integration tests cover direct recipe start behavior.
- Unit or integration tests cover weekly-plan start behavior with planned meal servings or scale when that data already exists.
- Tests cover duplicate active-session handling.
- Add a focused browser smoke step if routes are introduced.

### Dependencies

- Issue 2.
- Issue 3.

### Suggested Labels

- `feature:cooking-mode`
- `area:recipes`
- `area:ui`
- `area:database`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 5: Build Manual Cooking Mode Checklist Page

### Goal

Build the core Cooking Mode page with session snapshot display, ingredient readiness checks, step checks, and current-step persistence.

### Scope

- Display Cooking Session recipe name, serving/scale context, ingredient snapshot, and step snapshot.
- Let users check and uncheck ingredient readiness.
- Let users check and uncheck Recipe Step completion.
- Persist current step/progress across reloads.
- Show section labels from the session step snapshot.
- Show a stale recipe warning if the underlying recipe changed after session start.
- Keep the UI usable on phone and kitchen-tablet widths.

### Out of Scope

- Cooking Timers.
- Completion and abandon controls beyond any minimal navigation needed.
- Recipe Step editing inside Cooking Mode.
- Pantry deduction or consumption candidates.
- Voice controls, Smart Pantry integration, grocery mutations, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- Ingredient checks persist and remain reversible.
- Step checks persist and remain reversible.
- Ingredient checks clearly mean ready/prepped, not consumed.
- Step checks clearly mean instruction completed.
- Reloading the Cooking Mode page preserves checklist and current-step state.
- Later recipe edits do not rewrite the active session snapshot.
- The page remains readable and usable at mobile width.

### Test Expectations

- Unit tests cover ingredient readiness state changes.
- Unit tests cover step completion/current-step state changes.
- Tests prove checklist changes do not create pantry or grocery mutations.
- Add a browser smoke covering check, uncheck, reload, and resume.

### Dependencies

- Issue 4.

### Suggested Labels

- `feature:cooking-mode`
- `area:recipes`
- `area:ui`
- `area:tests`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 6: Add Basic In-App Cooking Timers

### Goal

Add simple Cooking Timers inside an active Cooking Session, including step-linked and ad hoc timers with durable in-app state.

### Scope

- Let users create a timer linked to a session step.
- Let users create an ad hoc timer.
- Support timer states: ready, running, paused, expired, dismissed, and canceled.
- Let users start, pause, resume, dismiss, and cancel timers.
- Recover timer state after reload using persisted timer data and current time calculations.
- Show expired timers clearly inside Cooking Mode.

### Out of Scope

- Push notifications.
- Background timers.
- OS-level alerts.
- Voice timer controls.
- Timer-driven session completion.
- Pantry deduction, Smart Pantry integration, grocery mutations, or recipe photos.

### Acceptance Criteria

- Users can create and control at least one active timer in a Cooking Session.
- Step-linked timers show which step they belong to.
- Ad hoc timers are allowed.
- Timer expiry is visible but does not complete the Cooking Session.
- Reloading the page recovers running, paused, expired, dismissed, and canceled timers deterministically.
- Editing or replacing a timer does not create hidden duplicate timers.

### Test Expectations

- Unit tests cover timer state transitions.
- Unit tests cover elapsed/remaining calculations after reload.
- Unit tests cover expired timer behavior without session completion.
- Browser smoke covers creating, pausing, resuming, expiring or simulating expiry, dismissing, and canceling a timer.

### Dependencies

- Issue 5.

### Suggested Labels

- `feature:cooking-mode`
- `area:recipes`
- `area:ui`
- `area:tests`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 7: Add Pause, Resume, Complete, and Abandon Lifecycle UI

### Goal

Expose the Cooking Session lifecycle in the UI and make completion and abandonment deterministic.

### Scope

- Add pause and resume controls for active sessions.
- Add abandon control that ends a session without downstream effects.
- Add complete control with warning for unchecked ingredients or steps.
- Preserve historical completed session state without editing the old session.
- Prevent abandoned sessions from updating recipe history, weekly plan made state, wrap-up prompts, pantry, or grocery lists.
- Keep lifecycle actions explicit and reversible only where the domain allows.

### Out of Scope

- Made/tried evidence side effects beyond wiring needed for completion UI.
- Recipe approval or favorite updates.
- Pantry deduction.
- Voice controls, Smart Pantry integration, grocery mutations, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- Users can pause and resume a Cooking Session.
- Users can abandon a Cooking Session.
- Users can complete a Cooking Session even when some checklist items are unchecked.
- Completion displays unchecked ingredient/step warnings before final confirmation.
- Abandoned sessions do not produce downstream changes.
- Completed sessions are not edited by later recipe changes.

### Test Expectations

- Unit tests cover pause, resume, complete, and abandon transitions.
- Unit tests cover unchecked item warning behavior.
- Tests prove abandoned sessions have no downstream side effects.
- Browser smoke covers pause/resume and abandon/complete confirmation paths.

### Dependencies

- Issue 5.
- Issue 6.

### Suggested Labels

- `feature:cooking-mode`
- `area:recipes`
- `area:ui`
- `area:tests`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 8: Record Made/Tried Evidence on Completion

### Goal

Connect completed Cooking Sessions to MealBoard's recipe and weekly plan feedback model without automatically approving or favoriting recipes.

### Scope

- On completion, record made/tried evidence for the recipe.
- When linked to a weekly plan item, mark the planned meal as made where the existing weekly review model supports it.
- If the existing recipe status is exactly Idea, completion may promote it to Tried.
- Do not downgrade or otherwise mutate recipe status on completion.
- Capture session notes and substitutions as review/wrap-up context.
- Preserve the rule that Approved and Favorite require explicit recipe review.

### Out of Scope

- Recipe approval or favorite updates without review.
- Any recipe status mutation except optional Idea to Tried promotion on completion.
- Full weekly wrap-up redesign.
- Pantry consumption candidates.
- Grocery mutations.
- Voice controls, Smart Pantry integration, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- Completing a Cooking Session creates durable made/tried evidence.
- Linked weekly plan item made state is updated only on completion, not pause or abandon.
- Session notes remain session-scoped and can be surfaced for review or wrap-up.
- Session substitutions remain session-scoped and can be surfaced for review.
- Completion does not automatically approve or favorite a recipe.
- Abandoned sessions create no made/tried evidence.

### Test Expectations

- Tests cover completion creating made/tried evidence.
- Tests cover linked weekly plan item made behavior.
- Tests cover optional Idea-to-Tried promotion on completion.
- Tests prove completion does not downgrade or otherwise mutate non-Idea recipe statuses.
- Tests cover notes and substitutions flowing to review context without editing the saved recipe.
- Tests cover no side effects from abandoned sessions.

### Dependencies

- Issue 7.

### Suggested Labels

- `feature:cooking-mode`
- `area:recipes`
- `area:ui`
- `area:tests`
- `type:data-layer`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 9: Add Focused Cooking Mode Verification and Mobile Smoke Coverage

### Goal

Add focused automated verification for the end-to-end Cooking Mode V0 path after the core feature slices exist.

### Scope

- Add a browser smoke that starts or resumes a Cooking Session from a recipe.
- Cover step review prerequisite if the seeded/test recipe lacks reviewed steps.
- Cover ingredient readiness check, step check, reload/resume, timer control, pause/resume, and completion.
- Add a mobile-width smoke or viewport pass for checklist and timer usability.
- Ensure tests assert that pantry, grocery list, and Smart Pantry behavior are not mutated by Cooking Mode.
- Document any test credentials or seed requirements following existing E2E conventions.

### Out of Scope

- New implementation behavior except test hooks or small accessibility/testability fixes.
- Broad visual redesign.
- Voice controls, pantry deduction, Smart Pantry integration, grocery mutations, recipe photos, push notifications, or background timers.

### Acceptance Criteria

- A focused Cooking Mode smoke test can run locally with the existing Playwright setup.
- The smoke covers start/resume, checklist persistence, timer controls, pause/resume, and completion.
- A mobile-width check confirms the core Cooking Mode surface remains usable.
- Verification documentation names the command to run.
- Test assertions keep Cooking Mode V0 inside its boundaries.

### Test Expectations

- Add or update Playwright smoke coverage for the Cooking Mode route.
- Keep unit tests from earlier issues as the main source of lifecycle and timer correctness.
- Run lint, typecheck, unit tests, build, and the focused Cooking Mode smoke when this issue is implemented.

### Dependencies

- Issue 8.

### Suggested Labels

- `feature:cooking-mode`
- `area:tests`
- `area:ui`
- `area:recipes`
- `type:test`
- `priority:p2`
- `size:medium`

### Estimated Size

medium
