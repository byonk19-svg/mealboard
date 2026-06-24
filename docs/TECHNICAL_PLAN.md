# MealBoard Technical Plan v1

**Product:** MealBoard
**Companion document:** MealBoard PRD v1
**Purpose:** Translate the approved PRD into a concrete technical implementation plan for Codex and future development.
**MVP stack:** Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase
**Repo strategy:** Brand-new repo, separate from RT Scheduler, while borrowing useful discipline such as docs, migrations, seed data, tests, and README structure.

---

## 1. Technical Goals

MealBoard should be implemented as a clean, private family meal-planning and grocery-list web app.

The technical design should support:

* Single-user MVP login for Brianna.
* Future shared household accounts.
* Separate household profiles: Brianna, Elaine, baby, shared/family.
* Recipe library with structured ingredients.
* Food preferences and profile-specific recipe approvals.
* Weekly planning with adult work/off days and goals.
* Rule-based meal suggestion logic.
* Baby solids planning based on age/stage.
* Grocery list generation with item consolidation and source context.
* Mobile-friendly shopping list.
* Future PWA/offline improvements.
* Future AI-assisted features without making AI required for MVP.

---

## 2. Architecture Overview

### 2.1 Application Architecture

MealBoard should use a standard full-stack Next.js architecture:

* **Frontend:** Next.js App Router pages and components.
* **UI:** Tailwind + shadcn/ui.
* **Database:** Supabase Postgres.
* **Auth:** Supabase Auth.
* **Server logic:** Server actions and/or route handlers.
* **Business logic:** Pure TypeScript utility modules for testable algorithms.
* **Tests:** Unit tests for core rules first, later E2E tests.

### 2.2 Key Design Rule

Keep business rules out of UI components when possible.

Core logic such as grocery consolidation, meal scoring, hard-no/allergy blocking, calorie totals, and baby age-stage resolution should live in testable utility modules.

Recommended pattern:

```txt
src/lib/meal-planning/
src/lib/grocery/
src/lib/nutrition/
src/lib/baby/
src/lib/preferences/
src/lib/date/
```

UI components should display decisions; they should not own the decision logic.

---

## 3. Recommended Repo Structure

```txt
mealboard/
  docs/
    PRD.md
    TECHNICAL_PLAN.md
    DATA_MODEL.md
    CODEX_TASKS.md
  supabase/
    migrations/
    seed.sql
  src/
    app/
      (auth)/
      (dashboard)/
      api/
      dashboard/
      plan-week/
      recipes/
      grocery-list/
      settings/
      layout.tsx
      page.tsx
    components/
      app-shell/
      dashboard/
      plan-week/
      recipes/
      grocery-list/
      settings/
      shared/
      ui/
    lib/
      supabase/
      meal-planning/
      grocery/
      nutrition/
      baby/
      preferences/
      recipes/
      dates/
      validation/
    types/
      database.ts
      mealboard.ts
    tests/
      meal-planning/
      grocery/
      nutrition/
      baby/
  .env.example
  README.md
  package.json
```

### 3.1 Folder Notes

* `docs/` should hold product and technical docs.
* `supabase/migrations/` should hold database schema changes.
* `src/lib/` should hold pure logic and Supabase helpers.
* `src/components/` should hold reusable UI pieces.
* `src/app/` should hold Next.js routes.
* `src/types/` should hold database and app-level TypeScript types.

---

## 4. Environment Variables

Use `.env.local` for local development.

Expected environment variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

* Do not expose service-role key to the browser.
* Only use service-role key in trusted server-only scripts, seed scripts, or admin operations.
* Keep `.env.example` updated with required variables but no secrets.

---

## 5. Auth and Household Model

### 5.1 MVP Auth

MVP should use Supabase Auth with a simple single-user login.

The first implementation can assume one household managed by Brianna, but the schema should still support multiple households later.

### 5.2 Future-Ready Auth Model

Even in MVP, use a proper household model:

* `profiles` or app users belong to auth users.
* `households` hold shared household data.
* `household_memberships` connect auth users to households.
* Meal profiles such as Brianna/Elaine/baby/shared are separate from auth users.

Important distinction:

* **Auth user:** person who logs in.
* **Meal profile:** person/entity the meal plan is for.

Elaine may have a meal profile in MVP without having her own login yet.

---

## 6. Database Schema Plan

This schema is intentionally future-ready but should be implemented in manageable migration slices.

### 6.1 Naming Conventions

Recommended conventions:

* Table names: plural snake_case.
* Primary keys: `id uuid primary key default gen_random_uuid()`.
* Timestamps: `created_at`, `updated_at`.
* Soft archive where useful: `archived_at`.
* User-owned rows should include `household_id`.

### 6.2 Enum Types

Recommended Postgres enums:

```sql
profile_type: adult, baby, shared, household
adult_day_type: work_day, off_day
food_preference_level: love, like, okay, dislike, hard_no, allergy
recipe_status: idea, tried, approved, favorite, retired
recipe_rating: love, like, okay, dislike, hard_no
meal_type: breakfast, lunch, dinner, snack, drink, side, baby_meal, other
meal_component_type: main, side, add_on, snack, drink, dessert, baby_food, sauce, topping, other
weekly_plan_status: draft, ready_for_grocery_review, grocery_generated, shopping_started, completed
weekly_goal_type: weight_loss, high_protein, easy_week, low_effort, use_leftovers, grill_night, family_favorites, picky_eater_safe, low_prep_work_meals, baby_variety_week
calorie_strictness: strict, flexible, loose
estimate_confidence: low, medium, high
baby_food_status: tried, liked, disliked
staple_frequency: weekly, every_two_weeks, as_needed
recipe_repeat_rule: weekly, every_two_weeks, monthly, rarely
source_type: meal_generated, staple, baby_item, backup_meal, manual_add, household_item
grocery_list_status: draft, finalized, shopping_started, completed
```

Budget-related goals should not be part of MVP enums. If included later, add with a migration.

---

## 7. Core Tables

### 7.1 `households`

Stores household containers.

```sql
households (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

MVP seed example:

* Yonkin-Lowery Household

### 7.2 `household_memberships`

Connects auth users to households.

```sql
household_memberships (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique(household_id, user_id)
)
```

MVP can use one owner.

### 7.3 `meal_profiles`

Stores meal-planning profiles, not necessarily login users.

```sql
meal_profiles (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  profile_type profile_type not null,
  color_label text,
  birthdate date,
  baby_stage_override_months integer,
  default_daily_calorie_target integer,
  work_day_calorie_target integer,
  off_day_calorie_target integer,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
)
```

Seed profiles:

* Brianna — adult
* Elaine — adult
* Baby — baby
* Shared/Family — shared

### 7.4 `foods`

Shared ingredient/food database.

```sql
foods (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  default_grocery_category_id uuid references grocery_categories(id),
  default_unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(household_id, lower(name))
)
```

Note: `unique(household_id, lower(name))` may require an expression index rather than inline unique syntax depending on migration style.

### 7.5 `food_preferences`

Stores ingredient-level preferences per meal profile.

```sql
food_preferences (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  meal_profile_id uuid not null references meal_profiles(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  preference food_preference_level not null,
  notes text,
  prep_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(meal_profile_id, food_id)
)
```

### 7.6 `grocery_categories`

Stores default/custom grocery categories.

```sql
grocery_categories (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  heb_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(household_id, lower(name))
)
```

Seed categories:

* Produce
* Meat/Seafood
* Dairy/Eggs
* Bakery/Bread
* Frozen
* Pantry
* Baby
* Snacks
* Drinks
* Household
* Other

### 7.7 `preferred_products`

Stores optional preferred product/search information for frequent ingredients/staples.

```sql
preferred_products (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  food_id uuid references foods(id) on delete cascade,
  name text not null,
  store text default 'H-E-B',
  search_term text,
  preferred_quantity text,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

MVP uses this mainly for staples/frequent items.

---

## 8. Recipe Tables

### 8.1 `recipes`

```sql
recipes (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  description text,
  status recipe_status not null default 'idea',
  meal_type meal_type not null default 'dinner',
  servings numeric,
  prep_minutes integer,
  cook_minutes integer,
  effort_level text,
  repeat_rule recipe_repeat_rule,
  instructions text,
  notes text,
  source_url text,
  source_title text,
  estimated_calories_per_serving integer,
  estimated_protein_grams_per_serving integer,
  nutrition_confidence estimate_confidence,
  last_planned_at date,
  last_made_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
)
```

### 8.2 `recipe_ingredients`

```sql
recipe_ingredients (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  food_id uuid references foods(id),
  display_name text not null,
  quantity numeric,
  unit text,
  grocery_category_id uuid references grocery_categories(id),
  preparation text,
  notes text,
  optional boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Important:

* `display_name` preserves the recipe text.
* `food_id` links to shared food database when possible.
* Quantity/unit can be null for vague items like “salt to taste.”

### 8.3 `recipe_tags`

```sql
recipe_tags (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique(recipe_id, lower(tag))
)
```

Recommended MVP tags:

* safe_default
* reliable_meal
* backup_meal
* work_lunch
* low_effort
* high_protein
* freezer_friendly
* make_ahead
* meal_prep
* batch_cook
* grill_night
* baby_friendly_side

### 8.4 `recipe_profile_approvals`

Stores approval/rating/status per profile.

```sql
recipe_profile_approvals (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  meal_profile_id uuid not null references meal_profiles(id) on delete cascade,
  status recipe_status not null default 'idea',
  rating recipe_rating,
  approved_for_planning boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recipe_id, meal_profile_id)
)
```

This supports recipes approved for Brianna but not Elaine, or baby-only recipes, etc.

### 8.5 `recipe_reviews`

```sql
recipe_reviews (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  meal_profile_id uuid references meal_profiles(id),
  weekly_plan_item_id uuid,
  rating recipe_rating,
  notes text,
  quick_tags text[] default '{}',
  made_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Quick tags can include:

* good_work_lunch
* good_dinner
* too_much_effort
* friday_dinner
* baby_friendly_side
* make_again
* not_worth_repeating
* needs_modification

---

## 9. Staple Tables

### 9.1 `staples`

```sql
staples (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  meal_profile_id uuid references meal_profiles(id) on delete set null,
  food_id uuid references foods(id),
  display_name text not null,
  default_quantity numeric,
  default_unit text,
  preferred_quantity_text text,
  grocery_category_id uuid references grocery_categories(id),
  preferred_product_id uuid references preferred_products(id),
  frequency staple_frequency not null default 'as_needed',
  source_context text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Profile examples:

* Brianna staple.
* Elaine staple.
* Baby staple.
* Shared staple.
* Household staple.

---

## 10. Weekly Planning Tables

### 10.1 `weekly_plans`

```sql
weekly_plans (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  week_start_date date not null,
  status weekly_plan_status not null default 'draft',
  calorie_strictness calorie_strictness not null default 'flexible',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id, week_start_date)
)
```

Week should start on Sunday unless user later configures otherwise.

### 10.2 `weekly_plan_profile_days`

Stores adult day type per profile/day.

```sql
weekly_plan_profile_days (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  meal_profile_id uuid not null references meal_profiles(id) on delete cascade,
  plan_date date not null,
  adult_day_type adult_day_type,
  day_label text,
  calorie_target_override integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(weekly_plan_id, meal_profile_id, plan_date)
)
```

For baby profile, `adult_day_type` can be null.

### 10.3 `weekly_plan_goals`

```sql
weekly_plan_goals (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  meal_profile_id uuid references meal_profiles(id) on delete cascade,
  goal weekly_goal_type not null,
  created_at timestamptz not null default now(),
  unique(weekly_plan_id, meal_profile_id, goal)
)
```

`meal_profile_id` null means household-level goal.

### 10.4 `weekly_plan_items`

Stores planned meals/components.

```sql
weekly_plan_items (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  meal_profile_id uuid references meal_profiles(id) on delete set null,
  plan_date date not null,
  meal_type meal_type not null,
  component_type meal_component_type not null default 'main',
  recipe_id uuid references recipes(id),
  staple_id uuid references staples(id),
  display_name text not null,
  scale_factor numeric not null default 1,
  is_locked boolean not null default false,
  is_approved boolean not null default false,
  is_try_this boolean not null default false,
  is_backup boolean not null default false,
  reason_labels text[] default '{}',
  why_this text,
  notes text,
  estimated_calories integer,
  estimated_protein_grams integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

This table supports:

* Adult meals.
* Baby Meal 1/2.
* Snacks/drinks assigned to daily plan.
* Sides.
* Add-ons.
* Backup meals.
* Try This items.

### 10.5 `weekly_plan_pending_changes`

Tracks changes that may affect finalized/shopping-started grocery lists.

```sql
weekly_plan_pending_changes (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  grocery_list_id uuid references grocery_lists(id) on delete cascade,
  change_type text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
)
```

Could be implemented later if MVP first slice keeps changes simpler.

---

## 11. Grocery Tables

### 11.1 `grocery_lists`

```sql
grocery_lists (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  weekly_plan_id uuid references weekly_plans(id) on delete set null,
  name text,
  status grocery_list_status not null default 'draft',
  generated_at timestamptz,
  finalized_at timestamptz,
  shopping_started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### 11.2 `grocery_list_items`

```sql
grocery_list_items (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  grocery_list_id uuid not null references grocery_lists(id) on delete cascade,
  food_id uuid references foods(id),
  display_name text not null,
  quantity numeric,
  unit text,
  preferred_quantity_text text,
  grocery_category_id uuid references grocery_categories(id),
  preferred_product_id uuid references preferred_products(id),
  checked boolean not null default false,
  already_have boolean not null default false,
  manual_item boolean not null default false,
  needs_review boolean not null default false,
  review_reason text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### 11.3 `grocery_item_sources`

Preserves why an item is on the list.

```sql
grocery_item_sources (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  grocery_list_item_id uuid not null references grocery_list_items(id) on delete cascade,
  source_type source_type not null,
  weekly_plan_item_id uuid references weekly_plan_items(id) on delete set null,
  recipe_id uuid references recipes(id) on delete set null,
  staple_id uuid references staples(id) on delete set null,
  meal_profile_id uuid references meal_profiles(id) on delete set null,
  source_label text,
  quantity numeric,
  unit text,
  notes text,
  created_at timestamptz not null default now()
)
```

This supports Shopping View combining while Profile/Meal view remains explainable.

---

## 12. Baby Tables

### 12.1 `baby_food_statuses`

```sql
baby_food_statuses (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  baby_profile_id uuid not null references meal_profiles(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  status baby_food_status not null,
  notes text,
  first_tried_on date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(baby_profile_id, food_id)
)
```

### 12.2 `baby_guidance_stages`

Stores editable guidance content by stage/month range.

```sql
baby_guidance_stages (
  id uuid primary key,
  household_id uuid references households(id) on delete cascade,
  stage_name text not null,
  min_months integer not null,
  max_months integer not null,
  summary text,
  texture_notes text,
  nutrition_notes text,
  safety_notes text,
  example_foods text[] default '{}',
  example_meals text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

MVP can seed guidance content and keep editing internal/future.

---

## 13. Weekly Wrap-Up Tables

### 13.1 `weekly_wrap_ups`

```sql
weekly_wrap_ups (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  status text not null default 'open',
  dismissed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(weekly_plan_id)
)
```

### 13.2 `weekly_wrap_up_items`

```sql
weekly_wrap_up_items (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  weekly_wrap_up_id uuid not null references weekly_wrap_ups(id) on delete cascade,
  weekly_plan_item_id uuid references weekly_plan_items(id) on delete set null,
  prompt_type text not null,
  status text not null default 'pending',
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Wrap-up can be future-phase if needed, but schema should anticipate it.

---

## 14. Row Level Security Plan

Use Row Level Security for all household-owned tables.

### 14.1 Access Rule

A user can access rows where they are a member of the row’s household.

Pseudo-policy:

```sql
exists (
  select 1
  from household_memberships hm
  where hm.household_id = <table>.household_id
    and hm.user_id = auth.uid()
)
```

### 14.2 MVP Simplicity

MVP can start with owner-only household access, but policies should not assume only one user forever.

### 14.3 Service Role

Use service role only for seed/admin scripts, never client code.

---

## 15. TypeScript Domain Types

Create app-level types that are easier to work with than raw DB rows.

Recommended files:

```txt
src/types/mealboard.ts
src/types/database.ts
```

Example types:

```ts
export type MealProfileType = 'adult' | 'baby' | 'shared' | 'household';

export type FoodPreferenceLevel =
  | 'love'
  | 'like'
  | 'okay'
  | 'dislike'
  | 'hard_no'
  | 'allergy';

export type WeeklyGoalType =
  | 'weight_loss'
  | 'high_protein'
  | 'easy_week'
  | 'low_effort'
  | 'use_leftovers'
  | 'grill_night'
  | 'family_favorites'
  | 'picky_eater_safe'
  | 'low_prep_work_meals'
  | 'baby_variety_week';

export type GroceryListStatus =
  | 'draft'
  | 'finalized'
  | 'shopping_started'
  | 'completed';
```

---

## 16. App Routes

### 16.1 Top-Level Routes

```txt
/
/dashboard
/plan-week
/recipes
/recipes/new
/recipes/[recipeId]
/grocery-list
/grocery-list/[groceryListId]
/settings
```

### 16.2 Settings Subroutes

```txt
/settings/profiles
/settings/preferences
/settings/staples
/settings/baby
/settings/grocery-categories
/settings/preferred-products
```

### 16.3 Future Routes

```txt
/recipes/try-this
/weekly-wrap-up/[weeklyPlanId]
/grocery-history
/settings/household
/settings/invitations
```

---

## 17. Page Requirements

### 17.1 Dashboard Page

Route: `/dashboard`

Purpose:

* Show current week status.
* Show next best action.
* Show grocery list status.
* Show items needing attention.
* Provide quick shortcuts.

Components:

* `DashboardHeader`
* `CurrentWeekCard`
* `NextActionCard`
* `GroceryStatusCard`
* `ProfileCoverageSummary`
* `AttentionItemsList`
* `QuickActionsGrid`

### 17.2 Plan Week Page

Route: `/plan-week`

Purpose:

* Guided weekly planning flow.
* Weekly review/edit view.

Components:

* `PlanWeekShell`
* `WeekPickerStep`
* `AdultDayTypeStep`
* `WeeklyGoalsStep`
* `SuggestedPlanStep`
* `MealSwapPanel`
* `StaplesReviewStep`
* `GenerateGroceryListStep`
* `WeeklyPlanDayView`
* `WeeklyPlanProfileView`
* `MealPlanItemCard`
* `WhyThisMealDrawer`

### 17.3 Recipes Page

Route: `/recipes`

Purpose:

* Show recipe library.
* Search/filter recipes.
* Quick actions.

Components:

* `RecipeLibraryHeader`
* `RecipeSearchAndFilters`
* `RecipeCardGrid`
* `RecipeCard`
* `RecipeStatusBadge`
* `ProfileApprovalChips`
* `RecipeWarningBadges`

### 17.4 Add/Edit Recipe Pages

Routes:

* `/recipes/new`
* `/recipes/[recipeId]`

Purpose:

* Create/edit recipe.
* Paste ingredients.
* Structure ingredient rows.
* Assign status/tags/profile approval.

Components:

* `RecipeForm`
* `RecipeCoreFields`
* `IngredientPasteBox`
* `StructuredIngredientEditor`
* `IngredientMatchCombobox`
* `RecipeNutritionFields`
* `RecipeApprovalSelector`
* `RecipeTagSelector`
* `RecipeAdvancedFields`

### 17.5 Grocery List Page

Routes:

* `/grocery-list`
* `/grocery-list/[groceryListId]`

Purpose:

* Use shopping list.
* Switch views.
* Check off items.
* Add manual items.
* See source context.

Components:

* `GroceryListHeader`
* `GroceryListStatusBar`
* `GroceryViewToggle`
* `ShoppingView`
* `ProfileGroceryView`
* `MealGroceryView`
* `GroceryCategorySection`
* `GroceryListItemRow`
* `GroceryItemSourceDrawer`
* `ManualGroceryAddForm`
* `PendingGroceryChangesPanel`

### 17.6 Settings Page

Route: `/settings`

Purpose:

* House setup and management.

Components:

* `SettingsHub`
* `ProfileSettingsCard`
* `PreferencesSettingsCard`
* `BabySettingsCard`
* `StaplesSettingsCard`
* `GroceryCategoriesCard`
* `PreferredProductsCard`

---

## 18. Core Algorithms

Algorithms should live in `src/lib/*` and have unit tests.

---

## 19. Preference Blocking Algorithm

File:

```txt
src/lib/preferences/evaluate-recipe-for-profile.ts
```

Purpose:

Given a recipe and a profile, determine whether the recipe is allowed, blocked, or allowed with warnings.

Inputs:

* Recipe ingredients.
* Profile food preferences.
* Recipe profile approval.
* Optional shared meal assigned profiles.

Output:

```ts
type RecipeProfileEvaluation = {
  profileId: string;
  status: 'allowed' | 'blocked' | 'warning';
  blockers: Array<{
    foodId?: string;
    ingredientName: string;
    reason: 'allergy' | 'hard_no';
    message: string;
  }>;
  warnings: Array<{
    foodId?: string;
    ingredientName: string;
    reason: 'dislike';
    message: string;
  }>;
};
```

Rules:

1. Allergy blocks.
2. Hard No blocks.
3. Dislike warns.
4. Love/Like/Okay do not warn.
5. Unknown ingredients do not block.
6. Shared meals must pass evaluation for every assigned profile.

---

## 20. Meal Suggestion Scoring Algorithm

File:

```txt
src/lib/meal-planning/score-recipes.ts
```

Purpose:

Rank recipes for a profile/day/meal slot.

Inputs:

* Candidate recipes.
* Profile.
* Day type.
* Meal type.
* Weekly goals.
* Calorie/protein target.
* Recipe approvals.
* Preferences evaluation.
* Recently used data.
* Tags.

Output:

```ts
type ScoredRecipe = {
  recipeId: string;
  score: number;
  blocked: boolean;
  reasonLabels: string[];
  whyThis: string;
  warnings: string[];
};
```

Suggested scoring:

* Block if allergy/hard-no conflict.
* +50 for profile-approved.
* +30 for Favorite.
* +25 for Safe Default/Reliable Meal.
* +20 if meal type matches.
* +20 if day-type tag matches.
* +15 for weekly goal match.
* +15 if calorie target fit.
* +10 if protein goal fit.
* +10 if low-effort and low-effort goal/day.
* -10 if recently used and not favorite/safe default.
* -20 if repeat rule says too soon.
* Warning only for disliked ingredients.

Do not treat this scoring as permanent. It should be easy to tune.

---

## 21. Weekly Plan Generation Algorithm

File:

```txt
src/lib/meal-planning/generate-weekly-plan.ts
```

Purpose:

Generate a draft weekly plan from approved recipes, goals, day types, baby guidance, and staples.

High-level steps:

1. Load weekly plan context.
2. Load meal profiles.
3. Load adult work/off day selections.
4. Load weekly goals.
5. Build meal slots for each profile/day.
6. For each slot, find candidate recipes/components.
7. Evaluate blockers/warnings.
8. Score candidates.
9. Choose top suggestion.
10. Attach reason labels and why-this explanation.
11. Add backup swaps.
12. Do not finalize automatically.

Meal slots examples:

* Brianna Work Day Lunch.
* Brianna Work Day Dinner.
* Brianna Work Day Snack.
* Elaine Off Day Dinner.
* Baby Meal 1.
* Baby Meal 2.
* Shared Friday Grill Night.

MVP can generate fewer slots initially if needed, but the data model should support the full structure.

---

## 22. Grocery Generation Algorithm

File:

```txt
src/lib/grocery/generate-grocery-list.ts
```

Purpose:

Generate grocery list items from weekly plan items, selected staples, baby foods, backup groceries if selected, manual items, and household staples.

High-level steps:

1. Load approved weekly plan items.
2. Expand each recipe into ingredients.
3. Apply scale factor.
4. Add selected staples.
5. Add selected backup groceries.
6. Add baby staples/foods.
7. Group items by food_id when available, otherwise normalized display name.
8. Combine exact unit matches.
9. Convert safe common units where supported.
10. Flag unclear/mixed units for review.
11. Apply preferred quantity text where configured.
12. Assign grocery category.
13. Create grocery list items.
14. Create grocery item source rows for context.

Output:

```ts
type GeneratedGroceryList = {
  items: GeneratedGroceryItem[];
  warnings: GroceryGenerationWarning[];
};

type GeneratedGroceryItem = {
  foodId?: string;
  displayName: string;
  quantity?: number;
  unit?: string;
  preferredQuantityText?: string;
  categoryId?: string;
  needsReview: boolean;
  reviewReason?: string;
  sources: GroceryItemSourceInput[];
};
```

---

## 23. Grocery Consolidation Rules

File:

```txt
src/lib/grocery/consolidate-grocery-items.ts
```

Rules:

1. If two ingredients have the same `food_id` and same unit, combine quantities.
2. If two ingredients have the same normalized name and same unit, combine quantities.
3. If units are safely convertible, convert and combine.
4. If units are unclear or incompatible, keep one item but flag for review, or keep separate depending on implementation simplicity.
5. If preferred quantity text exists, display it as the shopper-friendly quantity.
6. Preserve all sources even when items combine.
7. Manual items should not be merged unless clearly matching and user allows it.
8. “Already Have” items remain on the list but can be visually separated/hidden.

Safe conversions for MVP:

* tsp ↔ tbsp
* tbsp ↔ cup
* oz ↔ lb for weight
* count + count

Avoid complicated conversions like cups to ounces for cheese unless a specific food conversion exists later.

---

## 24. Nutrition Calculation Algorithm

File:

```txt
src/lib/nutrition/calculate-daily-totals.ts
```

Purpose:

Calculate profile/day nutrition totals from meal plan items, not grocery list items.

Inputs:

* Weekly plan items.
* Recipe nutrition estimates.
* Scale factors.
* Assigned snacks/drinks.
* Profile calorie target.
* Strictness.

Output:

```ts
type DailyNutritionSummary = {
  mealProfileId: string;
  date: string;
  calories: number;
  proteinGrams: number;
  calorieTarget?: number;
  strictness: 'strict' | 'flexible' | 'loose';
  status: 'under' | 'near' | 'over' | 'not_applicable';
  warnings: string[];
};
```

Rules:

1. Count only items assigned to the person/day in the meal plan.
2. Do not count grocery list items.
3. Count snacks/drinks only if assigned to a person/day.
4. Loose weeks should not show warning language.
5. Strict/flexible weeks can warn if significantly over/under target.

---

## 25. Baby Age/Stage Algorithm

File:

```txt
src/lib/baby/resolve-baby-stage.ts
```

Purpose:

Resolve baby feeding stage from birthdate and optional manual override.

Inputs:

* Baby profile birthdate.
* Override months.
* Current date.
* Guidance stages.

Output:

```ts
type BabyStageResolution = {
  ageMonths: number;
  effectiveStageMonths: number;
  stageName: string;
  guidanceStageId: string;
  usedOverride: boolean;
};
```

Rules:

1. If override exists, use it for guidance matching.
2. Otherwise calculate age in months from birthdate.
3. Match stage based on min/max months.
4. If missing birthdate, show setup warning.

---

## 26. Baby Meal Suggestion Algorithm

File:

```txt
src/lib/baby/generate-baby-meals.ts
```

Purpose:

Suggest Baby Meal 1 and Baby Meal 2 using tried/liked foods, baby stage, texture tags, and guidance.

Rules:

1. Routine meals use tried/liked foods.
2. Disliked foods should not be suggested by default.
3. New foods appear separately in Try This.
4. Try This should suggest one new food at a time.
5. Attach texture/prep tags.
6. Attach calm safety prompts where relevant.
7. Do not add new food to grocery list without approval.

---

## 27. UI Component Strategy

Use small, composable components.

### 27.1 Shared UI Components

```txt
ProfileChip
StatusBadge
ReasonLabel
WarningBadge
EmptyState
ConfirmDialog
DrawerPanel
MobileActionBar
SectionCard
```

### 27.2 Meal Planning Components

```txt
WeeklyPlanCard
MealSlotCard
MealComponentList
MealSwapButton
LockMealButton
WhyThisButton
GoalTagSelector
AdultDayTypePicker
```

### 27.3 Grocery Components

```txt
GroceryItemCheckbox
GroceryCategoryAccordion
GrocerySourceChips
AlreadyHaveToggle
ManualAddItemDrawer
GroceryLifecycleActions
```

### 27.4 Recipe Components

```txt
RecipeCard
RecipeFilters
RecipeForm
RecipeImportForm
RecipeImportReview
IngredientPasteParser
StructuredIngredientRow
ProfileApprovalSelector
RecipeStatusSelector
```

---

## 28. State Management

Start simple.

Recommended:

* Server-rendered data fetching for pages where practical.
* Server actions for create/update/delete flows.
* Local component state for forms and UI toggles.
* Avoid global state library in MVP unless necessary.

Use URL params for simple filters where helpful:

```txt
/recipes?status=approved&profile=brianna&tag=work_lunch
```

---

## 29. Validation Plan

Use schema validation for forms and server actions.

Recommended validation areas:

* Recipe form.
* Ingredient rows.
* Profile preferences.
* Weekly plan generation inputs.
* Grocery manual add-ons.
* Calorie target settings.

Validation rules examples:

* Recipe name required.
* Ingredient display name required.
* Quantity must be positive if provided.
* Calorie target must be positive if provided.
* Baby birthdate cannot be in the future.
* Grocery list cannot be completed before shopping started unless explicitly allowed.

---

## 30. Testing Strategy

### 30.1 MVP Unit Tests

Prioritize business logic tests first.

Test files:

```txt
src/lib/preferences/evaluate-recipe-for-profile.test.ts
src/lib/meal-planning/score-recipes.test.ts
src/lib/grocery/consolidate-grocery-items.test.ts
src/lib/grocery/generate-grocery-list.test.ts
src/lib/nutrition/calculate-daily-totals.test.ts
src/lib/baby/resolve-baby-stage.test.ts
```

### 30.2 Critical Test Cases

Preference blocking:

* Allergy blocks.
* Hard No blocks.
* Dislike warns.
* Shared meal blocks if any assigned profile has allergy/hard-no.

Grocery consolidation:

* Same food and same unit combine.
* Same food and incompatible units flag review.
* Preferred quantity text displays.
* Sources are preserved after combining.

Nutrition:

* Grocery items do not count.
* Assigned snacks count.
* Staples do not count unless assigned to daily plan.
* Loose weeks do not warn.

Baby:

* Birthdate resolves stage.
* Manual override wins.
* New food stays in Try This.
* Routine meals use tried/liked foods.

### 30.3 E2E Tests Later

Later Playwright tests:

* Login.
* Add recipe.
* Add preference.
* Generate weekly plan.
* Generate grocery list.
* Check off grocery item on mobile viewport.

Do not overbuild E2E in the first slice.

---

## 31. Seed Data Plan

Seed data should make the app useful immediately in local development.

### 31.1 Seed Household

* Household: Yonkin-Lowery Household.

### 31.2 Seed Profiles

* Brianna — adult.
* Elaine — adult.
* Baby — baby.
* Shared/Family — shared.

### 31.3 Seed Categories

* Produce.
* Meat/Seafood.
* Dairy/Eggs.
* Bakery/Bread.
* Frozen.
* Pantry.
* Baby.
* Snacks.
* Drinks.
* Household.
* Other.

### 31.4 Seed Foods

Use safe, generic sample foods based on known preferences and common grocery needs:

* Tortillas.
* Eggs.
* Shredded cheese.
* Black beans.
* Rice.
* Chicken.
* Ground turkey.
* Strawberries.
* Bananas.
* Yogurt.
* Baby yogurt.
* Milk.
* Crackers.
* Salsa.
* Potatoes.

### 31.5 Seed Recipes

Example sample recipes:

* Frozen Breakfast Burritos.
* Green Chile Burritos.
* Turkey Taco Bowl.
* Grilled Chicken Wrap.
* Rice and Bean Bowl.
* Baby Banana Yogurt Bowl.
* Baby Soft Sweet Potato.

Keep seed recipes simple and editable.

### 31.6 Seed Staples

Examples:

* Brianna work snacks.
* Shared tortillas.
* Baby yogurt.
* Strawberries.
* Milk.
* Household paper towels.

---

## 32. Implementation Phases

### Phase 0 — Docs

Deliverables:

* `docs/PRD.md`
* `docs/TECHNICAL_PLAN.md`
* `docs/DATA_MODEL.md` if needed
* `docs/CODEX_TASKS.md` if needed

### Phase 1 — App Foundation

Deliverables:

* New Next.js app.
* TypeScript.
* Tailwind/shadcn setup.
* Supabase client helpers.
* Basic auth shell.
* Basic layout/navigation.
* Dashboard placeholder.
* README.

Do not implement domain features yet.

### Phase 2 — Database Foundation

Deliverables:

* Supabase migrations for households, memberships, meal profiles, categories, foods.
* RLS policies.
* Seed data.
* Generated or hand-written TypeScript DB types.

### Phase 3 — Profiles and Preferences

Deliverables:

* Profiles settings page.
* Preferences page.
* Food preference CRUD.
* Preference blocking utility + tests.

### Phase 4 — Recipe Library

Deliverables:

* Recipe list page.
* Recipe card UI.
* Add/edit recipe form.
* Recipe statuses.
* Profile approvals.
* Recipe tags.
* Structured ingredient rows.

### Phase 5 — Ingredient Parsing MVP

Deliverables:

* Paste ingredient text.
* Parse into rows with best-effort regex/parser.
* Highlight uncertain rows.
* Edit/merge/split before saving.

This can be simple at first.

### Phase 6 — Weekly Planning Thin Slice

Deliverables:

* Create/select week.
* Mark adult work/off days.
* Select goals.
* Generate simple draft plan from approved recipes.
* Day view.
* Profile view toggle.
* Lock/approve/remove.

### Phase 7 — Grocery List Generation

Deliverables:

* Grocery generation from approved plan items.
* Grocery consolidation utility + tests.
* Grocery item sources.
* Shopping View.
* Profile View.
* Meal View.
* Manual add-ons.
* Already Have toggle.
* Grocery lifecycle.

### Phase 8 — Staples

Deliverables:

* Staples settings.
* Staples by profile.
* Frequency/default quantity.
* Staples review step before grocery generation.

### Phase 9 — Nutrition

Deliverables:

* Recipe calorie/protein estimates.
* Estimate confidence.
* Profile calorie targets.
* Weekly strictness.
* Daily totals from meal plan.
* Strict/flexible warnings.

### Phase 10 — Baby Planning

Deliverables:

* Baby profile settings.
* Birthdate/stage override.
* Baby food tried/liked/disliked.
* Baby Meal 1/2 planning.
* Try This baby foods.
* Texture/prep tags.
* Baby guidance display.

### Phase 11 — Reviews and Wrap-Up

Deliverables:

* Recipe reviews.
* Weekly wrap-up.
* Unreviewed tried meal prompts.
* Skipped/made tracking.

### Phase 12 — Polish and Mobile Hardening

Deliverables:

* Mobile grocery UX polish.
* Empty states.
* Loading states.
* Error states.
* Accessibility pass.
* Spotty-service resilience improvements.
* README/docs update.

---

## 33. First Thin End-to-End Slice

The first usable product slice should prove the core loop without all advanced features.

### 33.1 Scope

Include:

* Login.
* Seeded household profiles.
* Basic recipe library.
* Add simple recipe.
* Basic profile approval.
* Create weekly plan.
* Manually select meals for the week or generate a very simple suggestion.
* Generate grocery list.
* Show Shopping View.
* Check off grocery items.

### 33.2 Exclude From First Slice

Do not include yet:

* Baby guidance.
* Nutrition targets.
* Smart swaps.
* Ingredient aliases.
* H-E-B preferred products.
* Weekly wrap-up.
* Full recipe review flow.
* Complex AI.

This slice validates that the product can go from recipes → plan → grocery list.

---

## 34. Codex Prompt Strategy

Codex should work in small PR-style tasks.

Each task should:

* State exact scope.
* Mention files/docs to update.
* Avoid unrelated refactors.
* Add tests for core logic.
* Run lint/typecheck/tests when available.
* Summarize changed files and risks.

---

## 35. Codex Prompt 1 — Create Repo Foundation

```text
Create the initial MealBoard app foundation in a new repo.

Use:
- Next.js App Router
- TypeScript
- Tailwind
- shadcn/ui
- Supabase client setup

Create:
- Basic app layout
- Top-level navigation: Dashboard, Plan Week, Recipes, Grocery List, Settings
- Placeholder pages for each top-level nav route
- docs/ folder with PRD.md and TECHNICAL_PLAN.md placeholders if not already present
- .env.example for Supabase env vars
- README with local setup instructions

Do not implement meal planning, recipes, grocery logic, or database migrations yet.
Keep this slice focused on app foundation only.
Run lint/typecheck if available and report results.
```

---

## 36. Codex Prompt 2 — Database Foundation

```text
Implement the initial Supabase database foundation for MealBoard.

Use the docs/TECHNICAL_PLAN.md as the source of truth.

Create migrations for:
- households
- household_memberships
- meal_profiles
- grocery_categories
- foods
- food_preferences
- preferred_products

Add reasonable RLS policies so authenticated users can only access rows for households they belong to.

Create seed data for:
- one household
- profiles: Brianna, Elaine, Baby, Shared/Family
- default grocery categories
- a small set of sample foods

Do not implement recipes, weekly plans, or grocery lists in this slice.
Add or update documentation explaining how to run migrations/seeds locally.
Run any available checks and summarize results.
```

---

## 37. Codex Prompt 3 — Recipe Schema and Library

```text
Implement the recipe database schema and basic recipe library UI for MealBoard.

Use docs/TECHNICAL_PLAN.md as the source of truth.

Add migrations for:
- recipes
- recipe_ingredients
- recipe_tags
- recipe_profile_approvals
- recipe_reviews

Build:
- /recipes page with recipe cards
- /recipes/new page with a basic Add Recipe form
- /recipes/[recipeId] edit/detail page if practical in this slice

Recipe form MVP fields:
- name
- meal type
- servings
- ingredients as structured rows
- instructions
- tags
- calories/protein estimates
- nutrition confidence
- profile approvals
- status

Keep ingredient parsing simple or skip paste parsing in this slice if needed.
Do not implement weekly planning or grocery generation yet.
Add basic tests only if there is pure logic.
Run lint/typecheck and summarize results.
```

---

## 38. Codex Prompt 4 — Grocery Consolidation Utility

```text
Implement the pure grocery consolidation utility for MealBoard.

Create src/lib/grocery/consolidate-grocery-items.ts and tests.

The utility should:
- combine items with the same food_id and same unit
- combine items with the same normalized display name and same unit when food_id is missing
- preserve all source contexts when items combine
- flag incompatible or unclear units for review
- support preferredQuantityText when provided

Do not build UI in this slice.
Add thorough unit tests for consolidation behavior.
Run tests, lint, and typecheck if available.
```

---

## 39. Codex Prompt 5 — First Weekly Plan to Grocery List Slice

```text
Build the first thin end-to-end MealBoard planning slice.

Use docs/TECHNICAL_PLAN.md as the source of truth.

Implement:
- weekly_plans table
- weekly_plan_profile_days table
- weekly_plan_goals table
- weekly_plan_items table
- grocery_lists table
- grocery_list_items table
- grocery_item_sources table

Build minimal UI:
- create/select current week on /plan-week
- mark Brianna/Elaine work/off days
- manually add approved recipes to days/profile slots
- approve/lock/remove weekly plan items
- generate a grocery list from approved weekly plan items
- show /grocery-list Shopping View grouped by category
- check off grocery items

Keep suggestions simple in this slice. Manual planning is acceptable here.
Focus on proving recipe -> plan -> grocery list.
Run lint/typecheck/tests and summarize results.
```

---

## 40. Technical Risks

### 40.1 Scope Creep

MealBoard has many possible features. The biggest risk is overbuilding before the core loop works.

Mitigation:

* Build in small slices.
* Keep MVP narrow.
* Use docs as guardrails.

### 40.2 Grocery Consolidation Complexity

Ingredient quantities and unit conversion can get complicated.

Mitigation:

* Combine exact matches first.
* Convert only safe units.
* Flag uncertain items for review.
* Preserve source context.

### 40.3 Baby Guidance Accuracy

Baby guidance must be trustworthy and calm.

Mitigation:

* Keep guidance general.
* Use seeded guidance content.
* Avoid medical claims.
* Include gentle pediatrician disclaimer for concerns.

### 40.4 Nutrition Estimate Accuracy

Calorie/protein estimates can be imperfect.

Mitigation:

* Mark estimates with confidence.
* Keep estimates editable.
* Require confirmation only in strict calorie weeks.

### 40.5 Mobile Grocery Reliability

Spotty service in stores may affect shopping.

Mitigation:

* Avoid unnecessary refreshes.
* Preserve checked state locally while page is open.
* Future PWA/offline support.

### 40.6 Shared Household Future

MVP single-user design could block shared access later if not planned.

Mitigation:

* Use households and memberships from the beginning.
* Separate auth users from meal profiles.

---

## 41. Definition of Done for MVP

MealBoard MVP is technically done when:

1. Brianna can log in.
2. Brianna can manage household meal profiles.
3. Brianna can add foods/preferences.
4. Brianna can add recipes with structured ingredients.
5. Recipes can be approved per profile.
6. Brianna can create a weekly plan.
7. Brianna can mark adult work/off days.
8. MealBoard can suggest or support selecting meals for profiles/days.
9. Brianna can review/lock/approve plan items.
10. Brianna can generate a grocery list from the plan and selected staples.
11. Grocery list can be viewed by Shopping/Profile/Meal views.
12. Grocery items preserve why they are on the list.
13. Grocery items can be checked off on mobile.
14. Grocery list lifecycle works.
15. Basic calorie/protein totals work from meal plan items only.
16. Baby profile supports solids-only planning basics.
17. Core business logic has unit tests.
18. README and docs explain local setup and core concepts.

---

## 42. Immediate Next Step

After this technical plan is approved, create:

```txt
docs/CODEX_TASKS.md
```

That document should break the first 5 Codex tasks into copy/paste prompts with acceptance criteria.

Recommended first actual Codex task:

> Create the new MealBoard repo foundation only. Do not build domain features yet.
