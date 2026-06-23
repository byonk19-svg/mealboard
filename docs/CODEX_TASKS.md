# MealBoard CODEX_TASKS.md

**Project:** MealBoard
**Purpose:** Ordered Codex task playbook for building MealBoard in small, reviewable slices.
**Companion docs:** `docs/PRD.md` and `docs/TECHNICAL_PLAN.md`
**Stack:** Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase
**Repo:** Brand-new repo, completely separate from RT Scheduler

---

## How to Use This File

Use these tasks **one at a time**. Do not paste all tasks into Codex at once.

For each task:

1. Start from a clean working tree.
2. Create a branch for the task.
3. Paste the task prompt into Codex.
4. Let Codex implement only that task.
5. Review the diff.
6. Run the requested checks.
7. Commit only if the slice is focused and clean.
8. Open a PR or keep the branch ready for review.

The goal is not speed. The goal is a clean app that does not turn into a messy half-built monster.

---

## Global Codex Rules

Every Codex task should follow these rules:

* Use `docs/PRD.md` and `docs/TECHNICAL_PLAN.md` as the source of truth.
* Keep changes focused on the current task only.
* Do not build future-phase features unless the task explicitly asks for them.
* Do not add AI features yet.
* Do not add H-E-B integration yet.
* Do not add recipe photos yet.
* Do not add full pantry inventory yet.
* Do not add reminders/notifications.
* Do not add a native mobile app.
* Prefer simple, readable, testable code.
* Keep business logic out of UI components when practical.
* Put reusable logic in `src/lib/*`.
* Add or update tests for pure logic.
* Update docs when behavior or setup changes.
* Run lint/typecheck/tests when available.
* Summarize changed files, verification results, and any risks.

---

## Recommended Branch Naming

Use branch names like:

```txt
setup/app-foundation
setup/supabase-foundation
feature/profiles-preferences
feature/recipe-library
feature/grocery-consolidation
feature/weekly-plan-thin-slice
feature/mobile-grocery-list
```

---

## Human Prerequisite: Create the New Repo

Before running Codex, create a brand-new repo for MealBoard.

Recommended local path on Windows:

```txt
C:\dev\mealboard
```

Keep this repo completely separate from RT Scheduler.

Do **not** put MealBoard inside the RT Scheduler repo.

---

# Task 00 — Create Project Guidance Files

## Goal

Create the documentation and agent guidance files that will keep Codex consistent.

## Codex Prompt

```text
Create the initial project guidance files for MealBoard.

This is a brand-new repo for a private family meal-planning and grocery-list app called MealBoard.

Create:
- docs/PRD.md
- docs/TECHNICAL_PLAN.md
- docs/CODEX_TASKS.md if it does not exist yet
- AGENTS.md

For now, if PRD.md and TECHNICAL_PLAN.md content is not available in the repo, create clear placeholders with headings and TODO notes saying the user should paste the approved MealBoard PRD and Technical Plan content from ChatGPT before implementation continues.

Create AGENTS.md with these instructions:
- This repo is MealBoard, not RT Scheduler.
- Follow docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.
- Keep work in small, reviewable slices.
- Do not implement future-phase features unless explicitly asked.
- Do not add AI, H-E-B integration, native apps, full pantry inventory, reminders, recipe photos, or full macro tracking in MVP.
- Keep business logic in src/lib where practical.
- Add tests for pure business logic.
- Run lint/typecheck/tests when available.
- Summarize changed files and verification results after each task.

Do not create the Next.js app yet in this task unless the repo is already initialized and it is trivial. This task is only for docs and agent guidance.
```

## Acceptance Criteria

* `docs/` exists.
* `AGENTS.md` exists.
* Guidance clearly says MealBoard is separate from RT Scheduler.
* Future-phase features are explicitly excluded from MVP.
* No app/domain code is created yet.

---

# Task 01 — App Foundation

## Goal

Create the basic Next.js app foundation with navigation and placeholders only.

## Codex Prompt

```text
Create the initial MealBoard app foundation.

Use:
- Next.js App Router
- TypeScript
- Tailwind
- shadcn/ui if practical in this slice
- Supabase client setup placeholders

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as the source of truth.

Create:
- Basic app layout
- Top-level navigation: Dashboard, Plan Week, Recipes, Grocery List, Settings
- Placeholder pages for:
  - /dashboard
  - /plan-week
  - /recipes
  - /grocery-list
  - /settings
- A simple responsive app shell
- .env.example with Supabase env vars
- README with local setup instructions

Important boundaries:
- Do not implement meal planning yet.
- Do not implement recipes yet.
- Do not implement grocery generation yet.
- Do not implement database migrations yet.
- Do not add AI features.

Keep this slice focused on app foundation only.
Run lint/typecheck if available and report results.
```

## Acceptance Criteria

* App runs locally.
* Navigation links work.
* Placeholder pages render.
* README explains basic setup.
* `.env.example` exists.
* No domain features are half-built.

## Suggested Verification

```bash
npm install
npm run lint
npm run typecheck
npm run dev
```

If `typecheck` does not exist yet, Codex should either add a reasonable script or report that it is not available.

---

# Task 02 — Supabase Database Foundation

## Goal

Create the initial household/profile/preferences database foundation.

## Codex Prompt

```text
Implement the initial Supabase database foundation for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as the source of truth.

Create Supabase migrations for:
- households
- household_memberships
- meal_profiles
- grocery_categories
- foods
- food_preferences
- preferred_products

Add PostgreSQL enum types needed for these tables.

Add Row Level Security policies so authenticated users can only access rows for households they belong to.

Create seed data for local development:
- one household: Yonkin-Lowery Household
- meal profiles: Brianna, Elaine, Baby, Shared/Family
- default grocery categories:
  - Produce
  - Meat/Seafood
  - Dairy/Eggs
  - Bakery/Bread
  - Frozen
  - Pantry
  - Baby
  - Snacks
  - Drinks
  - Household
  - Other
- sample foods such as tortillas, eggs, shredded cheese, black beans, rice, chicken, strawberries, bananas, yogurt, baby yogurt, milk, crackers, salsa, potatoes

Update README with Supabase migration/seed instructions.

Do not implement recipes, weekly plans, grocery lists, baby planning, or nutrition yet.
Run lint/typecheck and any migration checks available. Report verification results.
```

## Acceptance Criteria

* Supabase migrations exist for foundation tables.
* RLS is enabled on household-owned tables.
* Seed data creates core profiles/categories/foods.
* README includes migration/seed instructions.
* No recipe/planning/grocery schema yet.

## Suggested Verification

```bash
supabase db reset
npm run lint
npm run typecheck
```

---

# Task 03 — Supabase Auth and Household Bootstrap

## Goal

Wire up login and ensure the app can find the current user’s household.

## Codex Prompt

```text
Implement basic Supabase Auth and household bootstrap for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- Supabase browser/server client helpers
- Login page or simple auth flow
- Protected app shell for dashboard/planning routes
- Helper to fetch the current user's household membership
- Basic empty/loading/error states if no household exists

If a full signup/onboarding flow is too much for this slice, keep it simple and document the expected local seed/auth setup.

Important boundaries:
- MVP is single-user login for Brianna, but the schema should remain household-ready.
- Do not build invitations or shared household roles yet.
- Do not build recipes/planning/grocery features yet.

Update README with auth setup notes.
Run lint/typecheck and report results.
```

## Acceptance Criteria

* Auth helpers exist.
* App routes are protected or clearly handle unauthenticated state.
* Current household can be fetched for authenticated user.
* No invitations/shared-account UI yet.

---

# Task 04 — Profiles and Preferences UI

## Goal

Build settings screens for meal profiles and food preferences.

## Codex Prompt

```text
Implement the MealBoard profiles and food preferences UI.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- /settings/profiles page
- /settings/preferences page
- Profile list/cards for Brianna, Elaine, Baby, Shared/Family
- Basic edit support for profile notes and calorie target fields if already present in schema
- Food preference management:
  - choose profile
  - search/select food
  - set preference level: Love, Like, Okay, Dislike, Hard No, Allergy
  - add notes/prep notes

Add pure utility:
- src/lib/preferences/evaluate-recipe-for-profile.ts

The utility should evaluate recipe ingredients against a profile's preferences and return:
- allowed
- warning for dislikes
- blocked for hard_no/allergy

Add unit tests for the preference evaluation utility.

Important boundaries:
- Do not build recipe UI beyond what is needed for testing the utility.
- Do not build weekly planning yet.
- Do not build grocery generation yet.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Profiles visible in settings.
* Preferences can be created/updated.
* Preference levels match PRD.
* Pure evaluation utility exists.
* Tests cover allergy, hard-no, dislike, and allowed cases.

---

# Task 05 — Recipe Schema and Recipe Library

## Goal

Add recipe database tables and a practical recipe library UI.

## Codex Prompt

```text
Implement the recipe schema and basic recipe library for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Add migrations for:
- recipes
- recipe_ingredients
- recipe_tags
- recipe_profile_approvals
- recipe_reviews

Build:
- /recipes page with recipe cards
- /recipes/new page with Add Recipe form
- /recipes/[recipeId] detail/edit page if practical in this slice

Recipe MVP fields:
- name
- status: Idea, Tried, Approved, Favorite, Retired
- meal type
- servings
- ingredients as structured rows
- instructions
- tags
- calories/protein estimates
- nutrition confidence
- profile approvals for Brianna, Elaine, Baby, Shared/Family
- optional prep/cook time, effort, repeat rule, notes

Recipe cards should show:
- name
- status
- tags
- approved profiles
- calories/protein estimates if available
- warnings if available from preferences

Important boundaries:
- Do not build weekly planning yet.
- Do not build grocery generation yet.
- Ingredient paste parsing can be deferred to the next task if needed.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Recipe schema exists.
* Recipe list renders cards.
* User can add a recipe with structured ingredients.
* Recipe can be approved per profile.
* Recipe statuses match PRD.
* No weekly planning/grocery logic yet.

---

# Task 06 — Ingredient Paste Parsing and Structured Review

## Goal

Allow pasted ingredient text to become structured ingredient rows with user review.

## Codex Prompt

```text
Implement ingredient paste parsing for MealBoard recipes.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- Ingredient paste box in the recipe form
- Parser that converts pasted ingredient lines into structured rows:
  - display name
  - quantity when detectable
  - unit when detectable
  - notes/preparation when detectable
  - needsReview flag when uncertain
- Structured row editor that lets the user edit parsed rows before saving
- Ability to merge/split rows if practical; if too much for this slice, add clear TODO and implement edit/delete/add row at minimum
- Ingredient matching combobox that suggests existing foods and allows creating a new food

Add tests for the parser with common ingredient examples.

Important boundaries:
- Keep parser simple and deterministic.
- Do not use AI for parsing in MVP.
- Do not build grocery generation yet.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* User can paste ingredients.
* Parsed rows can be reviewed/edited before save.
* Uncertain rows are visually flagged.
* Existing foods can be matched.
* New foods can be created.
* Parser has unit tests.

---

# Task 07 — Grocery Consolidation Utility

## Goal

Build and test the pure grocery consolidation logic before UI.

## Codex Prompt

```text
Implement the pure grocery consolidation utility for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Create:
- src/lib/grocery/consolidate-grocery-items.ts
- tests for the utility

The utility should:
- combine items with the same food_id and same unit
- combine items with the same normalized display name and same unit when food_id is missing
- preserve all source contexts when items combine
- flag incompatible or unclear units for review
- support preferredQuantityText when provided
- avoid complicated conversions that are not safe

Safe conversions for MVP can include:
- tsp ↔ tbsp
- tbsp ↔ cup
- oz ↔ lb for weight
- count + count

Do not build grocery UI in this slice.
Do not connect this to weekly planning yet.
Focus on deterministic, testable logic.

Run tests, lint, and typecheck. Report results.
```

## Acceptance Criteria

* Consolidation utility exists.
* Tests cover exact matches, food_id matches, normalized name matches, incompatible units, preferred quantity text, and source preservation.
* No UI scope creep.

---

# Task 08 — Weekly Planning Schema

## Goal

Create weekly planning database tables and basic page skeleton.

## Codex Prompt

```text
Implement the weekly planning schema and basic Plan Week skeleton for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Add migrations for:
- weekly_plans
- weekly_plan_profile_days
- weekly_plan_goals
- weekly_plan_items

Build basic /plan-week functionality:
- create or select current week
- show week start date
- show Brianna and Elaine day-type controls for each day: Work Day / Off Day
- show weekly goal selector with MVP goals:
  - weight_loss
  - high_protein
  - easy_week
  - low_effort
  - use_leftovers
  - grill_night
  - family_favorites
  - picky_eater_safe
  - low_prep_work_meals
  - baby_variety_week
- save selected day types/goals

Important boundaries:
- Do not generate meal suggestions yet unless it is trivial and contained.
- Do not generate grocery lists yet.
- Do not build nutrition or baby planning yet beyond preserving schema compatibility.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Weekly planning tables exist.
* User can create/select a week.
* User can mark adult work/off days.
* User can select weekly goals.
* No grocery generation yet.

---

# Task 09 — Manual Weekly Plan Thin Slice

## Goal

Let the user manually assign recipes to weekly plan items.

## Codex Prompt

```text
Build the manual weekly planning thin slice for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

On /plan-week, allow the user to:
- view the selected week by day
- add a recipe to a day/profile/meal slot
- choose profile: Brianna, Elaine, Baby, Shared/Family
- choose meal type: lunch, dinner, snack, side, baby_meal, other as applicable
- mark a weekly plan item as approved
- lock/unlock a weekly plan item
- remove a weekly plan item
- see simple profile labels and status chips

Add a profile-view toggle if practical; if too much for this slice, add day view first and document profile view as next.

Important boundaries:
- Manual planning is acceptable in this slice.
- Do not build smart meal suggestions yet.
- Do not build grocery generation yet.
- Do not build nutrition totals yet.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* User can assign recipes to the weekly plan.
* Plan items preserve profile/day/meal type.
* Approved/locked/remove actions work.
* UI is readable on desktop and reasonable on mobile.

---

# Task 10 — Grocery List Schema and Generation

## Goal

Create grocery list schema and generate grocery list from approved weekly plan items.

## Codex Prompt

```text
Implement grocery list schema and grocery generation from approved weekly plan items.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Add migrations for:
- grocery_lists
- grocery_list_items
- grocery_item_sources

Build:
- src/lib/grocery/generate-grocery-list.ts
- integration with the existing consolidate-grocery-items utility
- action/button to generate grocery list from approved weekly plan items
- /grocery-list page showing the current generated list

Grocery generation should:
- expand recipe ingredients from approved weekly plan items
- apply scale_factor when available
- combine matching items when safe
- preserve source context in grocery_item_sources
- group by grocery category
- flag unclear/mixed units for review

Important boundaries:
- Do not build staples review yet unless already available.
- Do not build H-E-B integration.
- Do not build advanced pending-change review yet.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Grocery tables exist.
* Grocery list can be generated from weekly plan items.
* Item sources are preserved.
* Shopping View groups by category.
* Items can be checked off.
* Consolidation tests still pass.

---

# Task 11 — Grocery List Views and Lifecycle

## Goal

Make grocery list practical for shopping.

## Codex Prompt

```text
Improve the MealBoard grocery list with multiple views and lifecycle states.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- Shopping View: category-first, default
- Profile View: grouped by Brianna, Elaine, Baby, Shared/Family, Household
- Meal View: grouped by recipe/meal source
- grocery item source drawer or expandable details for “why is this on the list?”
- manual grocery add-ons
- Already Have toggle
- grocery list lifecycle actions:
  - Draft
  - Finalized
  - Shopping Started
  - Completed

Mobile shopping UX should include:
- fast checkboxes
- collapsible categories
- large tap targets
- clear source/context labels

Important boundaries:
- Do not build H-E-B integration.
- Do not build offline/PWA support yet.
- Do not build grocery history intelligence yet.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Shopping/Profile/Meal views exist.
* Manual add-ons work.
* Already Have works.
* Lifecycle status can be changed.
* Source context is visible.
* Mobile usability is decent.

---

# Task 12 — Staples MVP

## Goal

Add reusable staples by profile and a staples review step.

## Codex Prompt

```text
Implement staples for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Add or complete schema for staples if not already present.

Build:
- /settings/staples page
- reusable staple lists organized by profile:
  - Brianna
  - Elaine
  - Baby
  - Shared/Family
  - Household
- staple fields:
  - display name
  - food link when available
  - default quantity/unit
  - preferred quantity text
  - grocery category
  - frequency: weekly, every_two_weeks, as_needed
  - optional preferred product/search term if schema exists
- Plan Week staples review step before grocery generation
- include selected staples in grocery list generation with source context

Important boundaries:
- Do not build full pantry inventory.
- Do not build expiration tracking.
- Do not build low-stock alerts.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Staples can be created/edited.
* Staples are organized by profile/household.
* Weekly planning can review/select staples.
* Selected staples flow into grocery list.
* Staples preserve source context.

---

# Task 13 — Nutrition MVP

## Goal

Add optional calorie/protein targets and daily totals from meal plan items only.

## Codex Prompt

```text
Implement MealBoard nutrition MVP.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- calorie/protein estimate fields on recipes if not already implemented
- nutrition confidence: low, medium, high
- adult profile calorie target fields:
  - default daily calorie target
  - work day target
  - off day target
- weekly calorie strictness:
  - strict
  - flexible
  - loose
- optional weekly override target on weekly_plan_profile_days
- src/lib/nutrition/calculate-daily-totals.ts with tests
- display meal-level estimates and daily totals on Plan Week page

Rules:
- Calories/protein come from weekly_plan_items assigned to a profile/day.
- Do not calculate calories from grocery_list_items.
- Snacks/drinks count only when assigned to a person/day in the meal plan.
- Loose weeks should not show warning language.
- Strict/flexible weeks can show warnings if significantly over/under target.

Important boundaries:
- Do not build full macro tracking.
- Do not integrate a nutrition API yet.
- Do not make the UI feel diet-shamey.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Profile calorie targets exist.
* Weekly strictness exists.
* Daily nutrition totals calculate from plan items only.
* Grocery list does not affect nutrition totals.
* Tests cover core nutrition rules.

---

# Task 14A — Baby Food Status Foundation

Status: Complete. Implemented with `baby_food_statuses`, `/settings/baby`
CRUD, household/Baby-profile scoping, and focused helper tests.

## Goal

Add the smallest baby-specific food status foundation before broader baby
meal planning.

This task exists because the current Baby settings work only covers
birthdate/stage setup. Existing `food_preferences` can still handle general
profile preferences, hard-no foods, and allergies, but it should not be reused
as the baby tried/liked/disliked lifecycle because `tried` is not a preference
level and baby solids need their own simple planning state.

## Codex Prompt

```text
Implement the baby food status foundation for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Current state:
- /settings/baby already handles baby birthdate and manual stage override.
- food_preferences already handles profile-specific preference/allergy rules.
- baby_food_status and baby_food_statuses already exist.

Build only the foundation:
- Add a baby_food_status enum with tried, liked, disliked if it does not already exist.
- Add a baby_food_statuses table if it does not already exist.
- Keep rows household-scoped and linked to the Baby meal profile.
- Link each baby status row to an existing foods row.
- Add simple create/update/delete server behavior for Baby food statuses.
- Add a Baby foods panel under /settings/baby.
- Add focused helpers in src/lib/baby or src/lib/settings where practical.
- Add tests for pure helper behavior before production code.

Recommended minimal schema:
- id uuid primary key default gen_random_uuid()
- household_id uuid not null references households(id) on delete cascade
- baby_profile_id uuid not null
- food_id uuid not null
- status baby_food_status not null
- notes text
- prep_notes text
- last_offered_on date
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
- unique (baby_profile_id, food_id)
- foreign key (baby_profile_id, household_id) references meal_profiles(id, household_id) on delete cascade
- foreign key (food_id, household_id) references foods(id, household_id) on delete cascade

RLS and grants:
- Enable RLS on baby_food_statuses.
- Add policies so authenticated household members can manage only their household rows.
- Because newer Supabase projects may not expose new SQL-created public tables automatically, include explicit role grants needed by the app alongside RLS.
- Do not use user_metadata in policies.
- Do not add SECURITY DEFINER functions unless they are already part of an established local pattern and are genuinely needed.

Validation rules:
- Only the household Baby profile should be accepted as baby_profile_id.
- If this is enforced in app/server code, fetch and verify profile_type before insert/update.
- If this is enforced in SQL, keep the trigger/function narrow and covered by local migration verification.
- The same Baby profile and food should not have duplicate status rows.
- Status changes should be deterministic: tried, liked, and disliked replace each other instead of creating history rows.

UI placement:
- Keep the UI under /settings/baby for this slice.
- Do not create a separate child route unless the page becomes too crowded.
- Use existing foods as the selectable source; do not create a new food database UI in this slice.
- Keep copy practical and non-medical.

Important boundaries:
- Do not add Baby Meal 1/2 planning yet.
- Do not add Try This generation yet.
- Do not add baby grocery generation.
- Do not add nutrition, medical reaction, formula, breastmilk, or milk-intake tracking.
- Do not add H-E-B behavior.
- Do not push cloud Supabase migrations; local migration verification only.

Run lint/typecheck/tests/build. If a migration is added, run supabase db reset
locally when available and report the result. Stop before any cloud Supabase
push unless explicitly approved.
```

## Acceptance Criteria

* Baby food tried/liked/disliked statuses have a dedicated data model.
* Each status is household-scoped, Baby-profile-scoped, and food-linked.
* RLS and role grants are explicit for the new table.
* `/settings/baby` can list, add/update, and delete baby food statuses.
* Baby status UI does not imply medical or reaction tracking.
* Baby Meal 1/2 preview behavior exists, and Try This can be manually tracked as a normal baby food status.
* Grocery and nutrition behavior remain unchanged.
* Tests cover the pure status helper behavior.

---

# Task 14 — Baby Planning MVP

Status: Mostly complete for the solids-only MVP surface. Baby stage setup,
baby food statuses, static guidance, Baby Meal 1/2 routine previews, Try This
preview with manual status handoff, Plan Week Baby Meal 1/2 persistence, and
approved baby grocery source behavior exist. Baby nutrition, milk intake, and
reaction tracking remain out of scope.

## Goal

Add solids-only baby planning basics.

## Codex Prompt

```text
Implement baby planning MVP for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Prerequisite:
- Complete Task 14A first so baby food statuses have a narrow foundation.

Build:
- /settings/baby page
- baby birthdate and manual stage override support
- baby food tried/liked/disliked management
- baby guidance stage display from seeded guidance content
- Baby Meal 1 and Baby Meal 2 support in weekly plan
- simple texture/prep tags
- Try This section for one-at-a-time new baby foods
- src/lib/baby/resolve-baby-stage.ts with tests
- src/lib/baby/generate-baby-meals.ts if practical; otherwise prepare structure and add TODOs

Rules:
- Baby planning is solids only.
- Do not track formula/breastmilk.
- Routine baby meals should use tried/liked foods.
- New foods should appear separately as Try This ideas.
- New baby foods should not automatically go to the grocery list unless approved.
- Safety prompts should be calm and not medicalized.

Important boundaries:
- Do not build a medical/reaction tracker.
- Do not make baby screens scary or clinical.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Baby profile has birthdate/stage override.
* Baby food statuses work.
* Baby Meal 1/2 can appear on Plan Week and be applied as persisted baby slots.
* Baby guidance displays.
* New baby foods stay separate in Try This.
* Baby stage resolver has tests.

---

# Task 15 — Smart Meal Suggestion Scoring

Status: Implemented as a first rule-based adult draft-suggestion slice.
Suggestions fill open adult slots only, persist as unapproved weekly plan items,
and include reason labels/why-this context. Smart swap behavior is now covered
by Task 16.

## Goal

Add rule-based meal scoring and draft suggestions.

## Codex Prompt

```text
Implement rule-based meal suggestion scoring for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- src/lib/meal-planning/score-recipes.ts
- tests for scoring behavior
- basic suggested plan generation that uses scoring to propose meals for open meal slots
- reason labels and why-this text for suggested meals

Scoring should consider:
- profile approval
- recipe status
- Favorite
- Safe Default/Reliable Meal tag
- meal type
- day type
- weekly goals
- calorie/protein fit when configured
- low-effort tags
- recent use/repeat rules
- allergy/hard-no blockers
- dislike warnings

Rules:
- Allergy and hard-no block suggestions.
- Dislikes warn, not block.
- Favorites and Safe Defaults can repeat more often.
- Generated plans remain drafts.
- User can approve, lock, or remove suggestions.
- Swap suggestions are covered by Task 16.

Important boundaries:
- Do not use AI.
- Do not make suggestions final automatically.
- Keep scoring tunable and easy to understand.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Scoring utility exists.
* Tests cover blockers, warnings, favorites, safe defaults, low effort, and calorie fit.
* Suggested meals include reason labels.
* Generated plan items are drafts.

---

# Task 16 — Smart Swaps and Grocery Impact Warning

Status: Complete for MVP. The app now has context-aware swap suggestions,
reason labels, confirmation UX, and pre-confirmation grocery add/remove/keep
impact counts. Existing finalized or shopping-started grocery lists are not
silently changed by swaps.

## Goal

Add meal swaps that explain why they fit and warn about grocery changes.

## Codex Prompt

```text
Implement smart meal swaps for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- swap suggestions for a selected weekly_plan_item
- swaps should match the same profile/day/meal type/goal where possible
- show reason labels for each swap
- show a short why-this explanation
- estimate grocery impact:
  - items added
  - items removed
  - items kept/shared

Rules:
- Do not apply swap automatically without user confirmation.
- If a grocery list already exists, create or display pending grocery changes rather than silently modifying the finalized/shopping list.
- Keep grocery impact simple and understandable.

Important boundaries:
- Do not build full AI explanations.
- Do not build advanced grocery diffing beyond what is needed for clear add/remove/keep.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Swap panel exists.
* Suggested swaps are context-aware.
* Grocery impact is shown before confirming.
* Existing grocery list is not silently changed.

---

# Task 17 — Weekly Wrap-Up MVP

Status: Implemented and broadened as an optional route and dashboard entry after
completed shopping, backed by `weekly_wrap_ups` and `weekly_wrap_up_items`. It
can create meal-outcome and unused-grocery prompts, save made/skipped feedback,
capture leftover context, update recipe profile approval/status, capture future
buying/staple-adjustment intent, acknowledge unused groceries, and dismiss the
wrap-up.

## Goal

Add optional weekly wrap-up for improving future suggestions.

## Codex Prompt

```text
Implement weekly wrap-up MVP for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Build:
- weekly_wrap_ups and weekly_wrap_up_items schema if not already present
- optional wrap-up page or dashboard card
- focus only on items needing attention:
  - Try This recipes that were planned
  - unreviewed tried meals
  - skipped meals
  - unused grocery items if available
- allow recipe review from wrap-up:
  - rating
  - notes
  - profile-specific approval
  - quick tags
- allow dismissing wrap-up

Rules:
- Wrap-up should never block planning the next week.
- Keep it quick and optional.
- Do not create reminders/notifications.

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Wrap-up can be opened/dismissed.
* Unreviewed tried meals can be reviewed.
* Recipe approval/status can be updated from review.
* Wrap-up does not block future planning.

---

# Task 18 — Mobile Grocery Polish

Status: Complete for MVP. `/grocery-list` has phone-friendly tap targets, sticky
status/summary, collapsible sections, Shopping/Profile/Meal views, source
details, manual add-ons, checked/already-have controls, local retry for failed
item-state requests, and a credential-gated mobile Playwright smoke.

## Goal

Make the grocery list comfortable for real H-E-B shopping.

## Codex Prompt

```text
Polish the mobile grocery shopping experience for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Focus on /grocery-list mobile UX.

Improve:
- large tap targets
- sticky grocery list header/status if useful
- collapsible grocery categories
- fast checkbox interactions
- visible checked/completed state
- easy manual add
- easy Already Have toggle
- clear source labels
- source drawer/details for “why is this on the list?”
- avoid losing checked progress while page is open

Important boundaries:
- Do not build full offline mode yet.
- Do not build H-E-B integration yet.
- Do not add push notifications.

Run lint/typecheck/tests and, if Playwright exists, add or run a mobile viewport smoke test.
```

## Acceptance Criteria

* Grocery list is usable on phone width.
* Categories collapse/expand.
* Checkboxes are easy to tap.
* Checked state is reliable while page is open.
* Source context remains accessible.

---

# Task 19 — Empty States, Errors, and Onboarding Warnings

Status: Mostly complete for MVP. Core empty states, setup warnings, protected
grocery-change warnings, dashboard needs-attention actions, and user-facing
messages are in place. Fuller baby/nutrition setup intelligence can be improved
later when those domains have richer persisted signals.

## Goal

Make the app understandable when data is missing.

## Codex Prompt

```text
Add practical empty states, setup warnings, and error states across MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Add helpful states for:
- no profiles
- no recipes
- no approved recipes
- not enough recipes for a profile/meal type
- missing baby birthdate/stage
- no staples
- no grocery list generated
- meal plan changed after grocery list generation
- low-confidence nutrition estimates in strict weeks

Tone should be helpful and calm, not scolding.

Examples:
- “Add more approved Brianna work-lunch recipes for better suggestions.”
- “Baby age/stage is missing. Add it for better baby meal ideas.”
- “This grocery list was finalized. Review changes before updating it.”

Run lint/typecheck/tests and report results.
```

## Acceptance Criteria

* Empty states are clear.
* Missing setup warnings are helpful.
* Errors do not feel scary or technical.
* App guides the user to the next action.

---

# Task 20 — MVP Hardening Pass

## Goal

Clean up before treating the app as a usable MVP.

## Codex Prompt

```text
Perform a focused MVP hardening pass for MealBoard.

Use docs/PRD.md and docs/TECHNICAL_PLAN.md as source of truth.

Review the app for:
- broken routes
- missing loading states
- missing error states
- unsafe assumptions around household_id
- RLS issues
- TypeScript looseness or avoidable any types
- business logic living inside UI components that should move to src/lib
- missing tests for core logic
- mobile grocery usability issues
- docs/README setup gaps

Do not add major new features.
Do not refactor unrelated areas just because they could be cleaner.
Keep changes focused on MVP stability.

Run:
- lint
- typecheck
- unit tests
- any available smoke tests

Summarize:
- issues found
- fixes made
- remaining risks
- commands run and results
```

## Acceptance Criteria

* Core routes work.
* Core logic tests pass.
* README is usable.
* No major known unsafe data-access issue.
* App is ready for real MVP review.

---

## Suggested Next Tasks to Run

The foundation, core loop, hardening, smart swaps, Plan Week profile view,
Preferences food creation, saved-food administration, dashboard attention queue,
mobile grocery polish, weekly wrap-up expansion, Baby Meal 1/2 persistence, setup-aware and
calorie-guidance dashboard signals, durable grocery source linkage,
source-aware unused-grocery wrap-up, pending grocery review/apply handling,
weekly wrap-up staple review handoff, recipe filters, recipe import smoke
coverage, owner-only household member linking/removal/ownership transfer,
bounded grocery item-state retry with manual recovery, generic grocery-list copy,
review-informed suggestion scoring, baby Try This status handoff, ingredient
merge/split review controls, PWA install metadata, and the Next/PostCSS audit
override are complete.
For the current repo state, run focused follow-up slices in this order:

1. **Household member lifecycle depth** - add role editing beyond ownership transfer and household switching only after shared household use proves it is needed.
2. **PWA/mobile offline resilience** - improve grocery-list behavior beyond bounded item-state retry without adding broad offline sync.
3. **Email-delivered invitations** - add invitation delivery only if shared household use becomes frequent enough to justify an email flow.
4. **Weekly wrap-up review depth** - support richer multi-source staple review only if real household use shows the current single-staple review handoff is too narrow.

Keep H-E-B integration, AI, full pantry inventory, reminders, native apps,
recipe photos, full macro tracking, and cloud Supabase migration pushes out of
scope unless explicitly approved.

---

## First Real Codex Prompt I Recommend Using

Use this once the new repo exists and the PRD/Technical Plan content has been copied into `docs/`.

```text
You are working in the MealBoard repo.

Read:
- AGENTS.md
- docs/PRD.md
- docs/TECHNICAL_PLAN.md
- docs/CODEX_TASKS.md

Implement Task 01 — App Foundation only.

Create the initial MealBoard app foundation using Next.js App Router, TypeScript, Tailwind, shadcn/ui if practical, and Supabase client setup placeholders.

Create:
- Basic app layout
- Top-level navigation: Dashboard, Plan Week, Recipes, Grocery List, Settings
- Placeholder pages for /dashboard, /plan-week, /recipes, /grocery-list, and /settings
- A simple responsive app shell
- .env.example with Supabase env vars
- README with local setup instructions

Do not implement meal planning, recipes, grocery logic, database migrations, AI features, H-E-B integration, pantry inventory, reminders, or recipe photos.

Keep the slice focused and reviewable.
Run lint/typecheck if available.
End with:
- summary of changed files
- verification commands/results
- any risks or follow-up tasks
```

---

## Notes for Brianna

When Codex finishes each task, bring back:

* its summary
* changed files
* verification results
* screenshots if UI changed
* any errors or warnings

Then review before moving to the next task.

Do not let Codex keep going into the next task unless you explicitly ask it to.
