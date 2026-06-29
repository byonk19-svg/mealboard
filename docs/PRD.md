# MealBoard PRD v1

**Product name:** MealBoard
**Product type:** Private family meal-planning and grocery-list web app
**Primary user:** Brianna
**Household profiles:** Brianna, Elaine, baby, shared/family
**MVP platform:** Responsive web app first; desktop-friendly setup, mobile-friendly weekly use and grocery shopping
**Future platform direction:** Progressive Web App/home-screen app support later

---

## 1. Product Overview

MealBoard is a personalized household meal-planning and grocery-list app for a family with different food preferences, different schedules, baby feeding needs, and diet goals.

The app should suggest a weekly meal plan mostly from saved and approved recipes, support separate planning profiles for Brianna, Elaine, baby, and shared/family meals, and generate a grocery list that combines planned meals, snacks, staples, baby foods, and household items without losing context.

MealBoard should feel like a calm, practical planning board for the household: part recipe library, part weekly planner, part grocery checklist, and part preference memory.

---

## 2. Problem Statement

Weekly meal planning is difficult because the family does not eat one simple shared meal plan.

The app must solve for:

* Brianna and Elaine eating different meals at times.
* Brianna and Elaine having separate work/off-day food needs.
* Brianna needing workday lunch, dinner, snacks, drinks, and staples.
* Elaine using the same adult planning structure for now.
* The baby needing a separate solids-focused plan based on age/stage.
* Recipes needing to respect likes, dislikes, hard-no foods, allergies, prep-style exceptions, and profile-specific approval.
* Grocery lists needing to include planned meals, snacks, staples, baby foods, backup meals if selected, manual add-ons, and household items.
* Grocery shopping happening through H-E-B, where the user may manually search/add items in the H-E-B app/site for aisle guidance.
* Weight-loss weeks needing calorie guidance without turning the app into a punishing diet tracker.

MealBoard should reduce the weekly mental load by answering:

* What should Brianna eat this week?
* What should Elaine eat this week?
* What should baby eat this week?
* What shared meals make sense?
* What groceries do we need?
* Why is each item on the grocery list?
* What meals are safe defaults, favorites, backups, or new ideas?

---

## 3. Product Goals

### 3.1 MVP Goals

MealBoard MVP should allow Brianna to:

1. Set up household profiles for Brianna, Elaine, baby, and shared/family meals.
2. Add basic food preferences and hard-no/allergy rules.
3. Add recipes manually or by pasting recipe text.
4. Store ingredients in structured form for grocery-list generation.
5. Mark recipes by status and profile-specific approval.
6. Set weekly planning context, including adult work/off days and weekly goals.
7. Generate a draft weekly plan from approved recipes.
8. Review, swap, lock, remove, or approve suggested meals.
9. Review staples before grocery list generation.
10. Generate a categorized grocery list with profile/meal/source context.
11. Use the grocery list on mobile while shopping.
12. Mark grocery lists through a clear lifecycle: Draft → Finalized → Shopping Started → Completed.

### 3.2 Long-Term Goals

Long-term, MealBoard may become a public app if the private family MVP proves strong enough. The product should be designed cleanly enough that future households, shared access, AI-assisted planning, H-E-B-friendly workflows, and PWA support can be added later.

---

## 4. MVP Non-Goals

The MVP should **not** include:

* Full AI meal planning.
* Full macro tracking.
* Native iPhone/Android app.
* Recipe photos.
* Full H-E-B integration.
* Store price tracking.
* Budget/cost tracking.
* Barcode scanning.
* Smart Pantry in the MVP; Smart Pantry remains a post-MVP reviewed domain.
* Automatic expiration tracking or reminders.
* Push notifications, email reminders, or planning nudges.
* Cooking Mode in the MVP; Cooking Mode remains a post-MVP reviewed domain.
* Public multi-household signup flow.
* Complex ingredient alias logic.
* Full recipe-link import that tries to automatically clean up every website without review.
* Photo/screenshot recipe extraction.
* Full baby feeding/milk/formula tracker.
* Detailed medical/reaction tracker for baby foods.

---

## 5. Guiding Product Principles

### 5.1 Helpful but not bossy

MealBoard should suggest plans, but the user stays in control. Weekly plans should start as drafts and require review before becoming final.

### 5.2 Personalized but not overwhelming

The app should support rich personalization, but the UI should not feel like homework. Use progressive disclosure, simple defaults, and optional advanced fields.

### 5.3 Practical grocery-first thinking

The grocery list must be usable in real life. It should combine items when helpful, preserve why each item is included, and support H-E-B-friendly search terms later.

### 5.4 Rule-based reliability first

MVP should use rule-based logic from structured data. AI can come later, but it should sit on top of clean recipes, preferences, profiles, and grocery rules.

### 5.5 Baby guidance should be calm and grounded

Baby feeding guidance should be useful, age/stage-aware, and grounded in trusted pediatric nutrition guidance. It should not feel scary, medicalized, or overbearing.

---

## 6. Target Users and Profiles

### 6.1 Primary User

**Brianna** is the primary account owner and household meal planner for MVP.

### 6.2 Household Profiles

MealBoard should support separate meal profiles:

1. **Brianna**
2. **Elaine**
3. **Baby**
4. **Shared/Family**

The app should not force one household meal plan. It should create a household grocery list from multiple personalized meal plans.

---

## 7. Authentication and Household Model

### 7.1 MVP Authentication

MVP should use a simple single-user login for Brianna.

### 7.2 Future Shared Household Model

The database should be designed for future shared household access so Elaine can eventually have her own login and edit the same household data.

Future account model should support:

* Household entity.
* Household members.
* User accounts.
* Invitations.
* Roles/permissions.
* Shared recipes, grocery lists, plans, and preferences.

---

## 8. Platform and Tech Stack

### 8.1 MVP Format

MealBoard MVP should be a responsive web app optimized for:

* Desktop/laptop setup.
* Mobile weekly planning.
* Mobile grocery shopping.

### 8.2 Future PWA Support

MealBoard should be designed so it can later become a Progressive Web App that can be saved to a phone home screen and eventually support stronger offline behavior.

### 8.3 MVP Tech Stack

Use:

* Next.js App Router
* TypeScript
* Tailwind
* shadcn/ui
* Supabase

### 8.4 Repo Strategy

MealBoard should live in a brand-new repo, completely separate from RT Scheduler.

It may reuse helpful discipline from RT Scheduler where appropriate:

* `docs/` folder
* Supabase migrations
* seed data
* README
* tests
* later Playwright coverage

It should not copy RT Scheduler’s complexity too early.

---

## 9. Main Navigation

MVP top-level navigation should stay simple:

1. **Dashboard**
2. **Plan Week**
3. **Recipes**
4. **Grocery List**
5. **Settings**

More detailed areas should live as subpages/cards under these sections:

* Family Profiles
* Baby Profile
* Food Preferences
* Staples
* Grocery Categories
* Recipe Reviews
* Try This Ideas
* Grocery History

---

## 10. Dashboard Requirements

The Dashboard should be the practical home base.

It should show:

* Current week summary.
* Current planning status.
* Next best action.
* Grocery list status.
* Quick shortcuts.
* Items needing attention.

### 10.1 Example Dashboard States

* Planning not started.
* Draft plan generated.
* Meals need review.
* Staples need review.
* Grocery list ready to finalize.
* Shopping started.
* Weekly wrap-up available.

### 10.2 Example Next Actions

* Start planning next week.
* Mark adult work/off days.
* Review suggested meals.
* Review staples.
* Finalize grocery list.
* Open grocery list.
* Review tried recipes.

### 10.3 Items Needing Attention

* Not enough approved recipes.
* Unreviewed tried recipes.
* Meal plan changed after grocery list generation.
* Grocery changes pending.
* Baby age/stage needs review.
* Recipes with low-confidence calorie estimates used in a strict week.

---

## 11. Onboarding Requirements

Onboarding should be guided but skippable.

Suggested setup flow:

1. Family members/profiles.
2. Adult day-type structure.
3. Baby age/stage.
4. Basic food preferences.
5. Staples.
6. Recipes.
7. Grocery categories.

### 11.1 First Useful Weekly Plan Requirements

A useful first weekly plan should ideally require:

* Household profiles.
* Approved recipes.
* Basic food preferences.
* Staples.
* Baby age/stage if baby planning is enabled.

### 11.2 Partial Setup Behavior

The app should still allow planning with partial setup, but show warnings such as:

* “Add more approved recipes for better suggestions.”
* “Baby age/stage is missing.”
* “Brianna has few work-lunch recipes.”
* “Elaine has no approved off-day meals yet.”

---

## 12. Adult Profile Planning

Adult profiles should support Brianna and Elaine with the same MVP structure.

### 12.1 Adult Day Types

Each adult profile can be marked manually during weekly planning as:

* Work Day
* Off Day

The app should not try to predict work schedules in MVP.

Future phase may support calendar integration.

### 12.2 Brianna Work Day

Brianna Work Day should plan:

* Lunch
* Dinner
* Snacks
* Drinks
* Staples

### 12.3 Brianna Off Day

Brianna Off Day should include:

* Meals
* Snacks
* Staples

Off days should be less rigid than workdays and allow more flexible options.

### 12.4 Elaine Profile

Elaine uses the same adult day-type structure as Brianna for MVP.

### 12.5 Adult Planning Rules

Adult meal suggestions should consider:

* Profile-specific recipe approval.
* Food preferences.
* Hard-no/allergy blocking.
* Dislike warnings.
* Work/off day.
* Weekly goals.
* Meal type.
* Calories/protein when configured.
* Effort level.
* Repeat rules.
* Recently used information.
* Safe Default/Reliable Meal tags.

---

## 13. Weekly Goals and Planning Modes

Weekly planning should support multiple goal tags at once.

### 13.1 Goal Levels

Goals can exist at:

* Household level.
* Brianna profile level.
* Elaine profile level.
* Baby profile level.
* Shared/family meal level.

### 13.2 MVP Weekly Goal Tags

MVP should support:

* Weight loss
* High protein
* Easy week
* Low effort
* Use leftovers
* Grill night
* Family favorites
* Picky-eater safe
* Low-prep work meals
* Baby variety week

### 13.3 Future Goal Tags

Budget week is future-phase only, not MVP.

Seasonal/themed meal planning is also future-phase only.

---

## 14. Calorie and Protein Planning

### 14.1 General Rule

Calories and protein should be calculated from **meal plan items assigned to a profile/day**, not from the grocery list.

The grocery list is for purchasing and stocking. It should not drive nutrition totals.

### 14.2 Adult Calorie Targets

Adult profiles should allow optional calorie targets.

Each adult profile can have:

* Default daily calorie target.
* Optional Work Day calorie target.
* Optional Off Day calorie target.
* Weekly override target during planning.

### 14.3 Weekly Strictness

Calorie target strictness should be selectable each week:

* Strict
* Flexible
* Loose

Default should be **Flexible**.

### 14.4 Daily Totals

The app should show:

* Meal-level calorie/protein estimates.
* Day-level calorie/protein totals.
* Warnings if significantly over/under target only during strict or flexible calorie weeks.

Loose weeks should treat calorie data as guidance only.

### 14.5 Snacks and Drinks

Snacks and drinks can exist as staples, but they only count toward nutrition when intentionally assigned to a person/day in the meal plan.

### 14.6 Protein Support

MVP should show estimated protein per recipe/meal.

Protein should also be available as a weekly “high protein” goal tag.

Optional daily protein targets may be added later or when desired.

### 14.7 Nutrition Estimates

Recipe nutrition should support:

* Manual entry.
* App-assisted estimates.
* Editable estimates.
* Estimate confidence: low / medium / high.

Confirmation should mainly be required when a low-confidence estimate is used in a strict calorie-target week.

Future nutrition improvements may include:

* Ingredient parsing.
* Serving calculations.
* Formal nutrition database/API.
* More detailed macro support.

---

## 15. Baby Profile Planning

### 15.1 Scope

Baby profile planning should focus on solids only.

MVP should include:

* Baby meals.
* Baby snacks.
* Baby staples.
* Baby food ideas.

MVP should not include formula, breastmilk, or milk intake tracking.

### 15.2 Age and Stage

Baby profile should support:

* Birthdate-based age/stage calculation.
* Manual stage override.

This allows guidance to adjust by age/month while still allowing the parent to override based on baby’s actual development.

### 15.3 Baby Meal Structure

Baby meal planning should default to two solid-food meals per day:

* Baby Meal 1
* Baby Meal 2

Future versions can allow custom labels such as breakfast, lunch, dinner, or snack.

### 15.4 Baby Food Status

Baby foods should track lightweight status:

* Tried
* Liked
* Disliked

MVP should not be a full medical/reaction tracker.

### 15.5 Routine Baby Meals

Routine baby meals should be built from tried/liked foods.

### 15.6 Try This Baby Foods

New baby foods should appear separately as one-at-a-time “Try This” ideas.

New baby foods should not automatically enter the grocery list unless approved.

### 15.7 Baby Texture/Prep Tags

MVP should support simple texture/prep tags based on age/stage, such as:

* Mashed
* Soft pieces
* Shredded
* Strips
* Thinly spread
* Easy-grip pieces
* Mixed into yogurt/oatmeal
* Soft-cooked

Future versions can add more detailed preparation guidance.

### 15.8 Baby Safety Guidance

Baby safety guidance should be:

* Useful.
* Calm.
* Not scary.
* Not overly medicalized.
* Grounded in trusted pediatric guidance.

MVP should include:

* Choking-risk warnings.
* Age/stage texture reminders.
* “Ask pediatrician” prompts for higher-risk foods or concerns.

### 15.9 Baby Nutrition Guidance

Baby nutrition guidance should include:

* Editable age/stage guidance section.
* Month/stage-based food ideas.
* Texture tips.
* Meal examples.
* Actual weekly baby meal suggestions.
* Two-meal-per-day plan.
* Override support.

The app should treat this as guidance, not medical advice.

---

## 16. Food Preferences

### 16.1 Preference Levels

Food preference levels should be:

* Love
* Like
* Okay
* Dislike
* Hard No
* Allergy

### 16.2 Blocking Rules

* Allergy blocks meals for the affected person.
* Hard No blocks meals for the affected person.
* Shared/family meals must be safe for every assigned profile.
* Dislike does not block by default, but should show a warning.

### 16.3 Shared/Family Meal Safety

Shared/family meals should not include allergy or hard-no ingredients for any assigned profile.

### 16.4 Preparation Notes

MVP should support plain-language preparation notes for foods and preferences.

Examples:

* “Okay in breakfast burritos, not plain.”
* “Crispy only, not mushy.”
* “Okay mixed in, not as main ingredient.”
* “Sauce on the side.”
* “Grilled preferred.”

### 16.5 Future Prep-Style Logic

Future versions can support smarter recipe-specific preference overrides.

Example:

* Brianna dislikes eggs generally but likes them in breakfast burritos.
* The recipe can override the ingredient-level dislike because the preparation/context makes it acceptable.

---

## 17. Recipes

### 17.1 Recipe Entry Methods

MVP should support:

* Manual recipe entry.
* Pasted recipe text.
* Review-first structured recipe URL import and private Chrome capture when explicit recipe data is available.

Future phases should support:

* Broader recipe link import with stronger cleanup across inconsistent sites.
* Photo/screenshot extraction.

### 17.2 Add Recipe Form

The Add Recipe form should be quick by default but allow optional advanced fields.

MVP core fields:

* Recipe name.
* Meal type.
* Servings.
* Ingredients.
* Instructions.
* Tags.
* Calories/protein estimates.
* Approved profiles.

Optional advanced fields:

* Prep time.
* Cook time.
* Difficulty/effort.
* Repeat rule.
* Notes.
* Modifications/swaps.
* Texture/prep notes.
* Good-for tags.

### 17.3 Recipe Statuses

Recipes should have statuses:

* Idea
* Tried
* Approved
* Favorite
* Retired

### 17.4 Profile-Specific Approval

Recipe approval should be profile-specific.

A recipe can be:

* Approved for Brianna.
* Approved for Elaine.
* Approved for baby.
* Approved for shared/family meals.
* Approved for some profiles but not others.

### 17.5 Safe Default / Reliable Meal

Safe Default / Reliable Meal should be a tag, not a status.

Safe Default meals should:

* Be allowed to repeat often.
* Be trusted suggestions.
* Be used more often for workdays, low-effort weeks, and weight-loss weeks.

### 17.6 Backup Meal

Backup Meal should be a recipe/food tag.

Backup options should be organized by profile:

* Brianna backup meals.
* Elaine backup meals.
* Baby backup foods.
* Shared/family backup meals.

### 17.7 Repeat Rules

Recipes should support repeat rules:

* Weekly.
* Every 2 weeks.
* Monthly.
* Rarely.

Users can override repeat rules during planning.

Favorites and Safe Defaults can repeat more often than regular approved recipes.

### 17.8 Recipe Reviews

After trying a recipe, the app should support recipe review with:

* Rating: Love / Like / Okay / Dislike / Hard No.
* Notes.
* Profile-specific approval.
* Quick tags.

Quick tags may include:

* Good work lunch.
* Good dinner.
* Too much effort.
* Friday dinner.
* Baby-friendly side.
* Make again.
* Not worth repeating.
* Needs modification.

Recipe reviews can be added manually anytime.

Weekly wrap-up should also prompt for unreviewed tried meals.

### 17.9 Recipe Instructions

MVP should store and display recipe instructions cleanly.

Cooking Mode is post-MVP and review-first. Ingredient checks and completed sessions do not automatically deduct pantry stock.

### 17.10 Recipe Photos

Recipe photos are not needed in MVP.

Photos can be added later, but MVP should focus on practical recipe cards and clean data.

---

## 18. Ingredients and Food Database

### 18.1 Ingredient Entry

The Add Recipe form should support:

* Easy paste mode.
* Structured edit mode.

### 18.2 Structured Ingredient Rows

Structured ingredients should include:

* Item/ingredient.
* Quantity.
* Unit.
* Category.
* Notes.

### 18.3 Pasted Ingredient Parsing

When users paste ingredients, the app should:

* Parse into structured rows.
* Highlight uncertain items.
* Allow editing.
* Allow merge/split.
* Require review before saving parsed rows.

### 18.4 Shared Food/Ingredient Database

Ingredients should connect to a shared food/ingredient database when possible.

When typing ingredients, the app should suggest existing matches and allow creation of a new ingredient.

### 18.5 Ingredient Aliases

MVP should use simple ingredient matching.

The data model should support future ingredient aliases.

Examples:

* Shredded cheese.
* Mexican cheese blend.
* Taco cheese.
* Cheese blend.

Future aliases can improve grocery combining, H-E-B search terms, and preference inheritance.

### 18.6 Future Preference Alias Logic

Future versions should allow preferences to apply across related ingredient aliases/variants while allowing overrides for specific forms/preparations.

Example:

* “Mushrooms = Hard No” should apply to sliced mushrooms, baby bella mushrooms, and mushroom sauce unless overridden.

---

## 19. Recipe Search and Filtering

MVP recipe search/filtering should be useful but not overwhelming.

### 19.1 MVP Recipe Filters

MVP should include:

* Search by recipe name.
* Filter by tag.
* Filter by profile approval.
* Filter by recipe status.
* Filter by meal type.
* Filter by day type.

### 19.2 Future Advanced Filters

Future filters may include:

* Calories/protein range.
* Ingredient search.
* Prep/cook time.
* Recently eaten.
* Grocery impact.
* H-E-B preferred product availability/search terms.

### 19.3 Recipe Page Design

Recipes page should use:

* Card view by default.
* Search and filters.
* Compact list/table view later.

Recipe cards should emphasize:

* Recipe name.
* Tags.
* Status.
* Profile approval.
* Calories/protein estimates.
* Last used.
* Warnings.
* Quick actions.

---

## 20. Meal Components and Templates

### 20.1 Flexible Meal Components

Meals should be built from flexible components, such as:

* Main.
* Side.
* Add-on.
* Snack.
* Drink.
* Dessert.
* Baby food.
* Sauce/topping.
* Profile-specific modification.

The UI should use simple defaults so it does not feel overwhelming.

### 20.2 Side Dishes

Side dishes should work like mini-recipes.

Sides should be:

* Approved.
* Tagged.
* Grocery-list-aware.
* Assignable to meals.

Sides can be:

* Shared/family sides.
* Profile-specific sides.
* Baby-friendly sides.

### 20.3 Shared Meals with Modifications

Shared meals should support:

* Common base.
* Profile-specific add-ons.
* Profile-specific swaps.
* Profile-specific omissions.

Example:

Shared taco night:

* Shared base: taco meat, cheese, tortillas.
* Brianna modification: no onions, preferred tortilla.
* Elaine modification: add avocado.
* Grocery list combines shared items and preserves person-specific add-ons.

### 20.4 Meal Templates

MVP should use smart default templates based on profile/day type.

Examples:

* Brianna Work Lunch.
* Brianna Work Dinner.
* Elaine Work Lunch.
* Elaine Off Day Dinner.
* Shared Friday Grill Night.
* Baby Meal 1.
* Baby Meal 2.

Custom user-created templates can be future-phase.

---

## 21. Weekly Planning Flow

Weekly planning should use a guided flow.

### 21.1 Guided Flow Steps

1. Choose week.
2. Mark adult work/off days.
3. Set household/profile goals.
4. Review suggested meals and backup swaps.
5. Lock, swap, remove, or approve meals.
6. Review staples.
7. Generate/finalize grocery list.

### 21.2 Weekly Review/Edit View

After the guided flow, the app should show a weekly review/edit view.

It should support:

* Default view by day.
* Toggle to profile view.

### 21.3 Day View

Day view should show:

* Monday through Sunday.
* Brianna items.
* Elaine items.
* Baby Meal 1 and Baby Meal 2.
* Shared/family meals.
* Meal status.
* Goal labels.
* Calories/protein estimates where relevant.

### 21.4 Profile View

Profile view should show:

* Brianna’s week.
* Elaine’s week.
* Baby’s week.
* Shared/family meals.

This helps confirm that each profile is covered.

### 21.5 Draft Plan Behavior

Generated weekly plans should be drafts.

The user should be able to:

* Approve meals.
* Swap meals.
* Lock meals.
* Remove meals.
* Lock favorites first, then regenerate the rest of the week.

### 21.6 Suggested Meal Explanations

Suggested meals should show reason labels by default.

Example labels:

* High protein.
* Work lunch.
* Low calorie.
* Friday grill night.
* Baby staple.
* Uses approved foods.
* Family favorite.
* Easy week.

A deeper “Why this?” explanation should be available on tap/click.

### 21.7 Meal Swaps

Meal swaps should be smart.

The app should:

* Suggest swaps based on the same profile/day/goal.
* Explain why each swap fits.
* Warn if the swap significantly changes the grocery list.

### 21.8 Leftovers

Leftovers should be an optional weekly goal/tag.

When “Use leftovers this week” is selected, the app can suggest leftover meals where appropriate without requiring full leftover container tracking in MVP.

### 21.9 Busy/Low-Energy Planning

The app should support:

* Weekly Low Effort Week mode.
* Day-level labels like Busy or Low Energy.

These should bias suggestions toward:

* Quick meals.
* Freezer meals.
* Leftovers.
* Staples.
* Minimal prep.
* Low cleanup.

### 21.10 Freezer and Meal Prep Meals

Recipes should support tags such as:

* Freezer-friendly.
* Make ahead.
* Meal prep.
* Batch cook.

The weekly planner should use these tags during low-effort weeks.

MVP should not require detailed freezer inventory tracking.

---

## 22. Meal Suggestion Logic

### 22.1 MVP Rule-Based Approach

MVP should use rule-based suggestions from structured data.

Inputs:

* Profile.
* Day type.
* Meal type.
* Recipe status.
* Profile-specific approval.
* Food preferences.
* Hard-no/allergy blockers.
* Dislike warnings.
* Weekly goals.
* Calories/protein targets.
* Effort tags.
* Repeat rules.
* Last used date.
* Safe Default/Reliable Meal tag.
* Baby age/stage.
* Staples.

### 22.2 Scoring Recommendation

Meal suggestions should use a scoring system, not random selection.

Example scoring priorities:

1. Block hard-no/allergy conflicts.
2. Prefer profile-approved recipes.
3. Prefer Favorite and Safe Default meals when relevant.
4. Match meal type and day type.
5. Match weekly goals.
6. Match calorie/protein targets when configured.
7. Prefer low effort during low-effort weeks/days.
8. Avoid regular meal repeats unless allowed.
9. Allow favorites/safe defaults to repeat more often.
10. Show dislike warnings when applicable.

### 22.3 Try This Section

The weekly plan should be built mostly from saved/approved recipes.

New recipe ideas may appear in a separate “Try This” section.

Try This ideas can be:

* Saved as Idea.
* Added to a weekly plan as clearly untested.
* Reviewed afterward.
* Approved/Favorited/Retired after trying.

If there are not enough approved recipes, the app should allow planning with warnings and offer clearly marked Try This ideas to fill gaps.

---

## 23. Staples and Pantry-Light Behavior

### 23.1 Staples

Staples should be reusable lists organized by profile:

* Brianna staples.
* Elaine staples.
* Baby staples.
* Shared staples.
* Household staples.

### 23.2 Staple Settings

Staples can have:

* Default frequency.
* Default quantity.
* Optional preferred product/search term.

Example frequencies:

* Weekly.
* Every 2 weeks.
* As needed.

### 23.3 Staple Review

Staples should not blindly finalize into grocery lists.

During weekly planning, the app should suggest staples for review before adding them to the grocery list.

### 23.4 Already Have

MVP should support marking grocery items as “Already Have.”

### 23.5 Future Pantry Features

Post-MVP Smart Pantry features now exist as reviewed slices for manual stock, restock review, intake review, consumption review, use-soon planning signals, and pantry-aware planning boosts.

Future pantry features may include:

* Explicit stock application from confirmed consumption decisions.
* Richer lot allocation and partial-use workflows.
* Reversal and audit review surfaces.
* Expiration reminders or automation.

These remain outside the MVP and must stay review-first unless a later product rule explicitly changes that boundary.

---

## 24. Grocery List Requirements

### 24.1 Grocery List Sources

Grocery lists should be generated from:

* Planned meals.
* Snacks assigned to the plan.
* Drinks assigned to the plan.
* Staples selected during review.
* Baby foods.
* Optional backup meal groceries.
* Manual add-ons.
* Household items.

### 24.2 Grocery Item Source Context

Every grocery item should preserve source context.

Source types:

* Meal-generated.
* Staple.
* Baby item.
* Backup meal.
* Manual add.
* Household item.

Users should be able to answer:

> “Why is this on my list?”

### 24.3 Grocery List Views

Grocery list should support multiple views:

1. **Shopping View** — default, category-first.
2. **Profile View** — Brianna / Elaine / baby / shared.
3. **Meal View** — recipe/meal-based.

### 24.4 Shopping View

Shopping View should:

* Group items by grocery category.
* Combine matching items when appropriate.
* Preserve labels showing related people/meals.
* Support fast checkboxes.
* Support collapsible categories.
* Support quick add/remove.
* Support mobile use.

### 24.5 Profile View

Profile View should show items by:

* Brianna.
* Elaine.
* Baby.
* Shared/family.
* Household.

### 24.6 Meal View

Meal View should show grocery items by recipe/meal so the user can understand the source.

### 24.7 Item Combining Rules

The app should:

* Combine exact matches automatically.
* Convert common units when safe.
* Flag mixed/unclear units for review.
* Support preferred grocery quantities.

Example preferred quantities:

* 1 bag shredded cheese.
* 1 pack tortillas.
* 1 bunch bananas.
* 1 container yogurt.

### 24.8 Grocery Categories

MVP should start with sensible default categories and allow customization.

Default categories may include:

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

The data model should support future H-E-B-friendly category/location mapping.

### 24.9 Manual Grocery Add-Ons

Manual grocery add-ons should be supported.

Manual items should allow optional:

* Category.
* Profile label.
* Source/context.
* Notes.

### 24.10 Non-Food Household Items

Non-food household items should be allowed as manual add-ons or reusable staples under Household.

Examples:

* Paper towels.
* Wipes.
* Diapers.
* Cleaning spray.
* Medicine.
* Pet items.
* Trash bags.

### 24.11 Backup Grocery Behavior

Backup meal groceries should be optional.

During weekly planning, user can choose to:

* Include backup groceries.
* Keep backup meals as ideas only.
* Add only specific backup items.

### 24.12 Grocery List Lifecycle

Grocery lists should use this lifecycle:

1. Draft
2. Finalized
3. Shopping Started
4. Completed

### 24.13 Meal Plan Changes After Grocery List Generation

If the meal plan changes after grocery list generation, the app should not silently change the grocery list.

It should track pending grocery changes and allow review before updating.

Example:

* Add: chicken breast, wraps.
* Remove: ground turkey, taco seasoning.
* Keep: shredded cheese, lettuce.

### 24.14 Grocery History

Completed grocery lists should be saved in history.

Users should be able to duplicate/reuse a past grocery list later.

MVP should not use grocery history for smart predictions yet.

Future versions can use grocery history to suggest staples and frequently bought items.

---

## 25. H-E-B Future Support

The family shops at H-E-B and may manually enter MealBoard grocery items into the H-E-B app/site to get aisle/location guidance.

MVP should not attempt full H-E-B integration.

However, the data model and UI should prepare for H-E-B-friendly workflows.

### 25.1 MVP H-E-B-Friendly Data

Grocery items should remain generic by default, but staples/frequent items can store:

* Preferred product name.
* Preferred H-E-B-friendly search term.
* Preferred grocery quantity.

Examples:

| Generic ingredient | Preferred product/search term             |
| ------------------ | ----------------------------------------- |
| Shredded cheese    | H-E-B Mexican Style Shredded Cheese, 8 oz |
| Baby yogurt        | Stonyfield YoBaby yogurt pouches          |
| Tortillas          | Mission Carb Balance tortillas            |
| Milk               | H-E-B whole milk                          |
| Strawberries       | Fresh strawberries, 1 lb                  |

### 25.2 Future H-E-B Features

Future phase may include:

* Copy for H-E-B mode.
* Export-friendly grocery list.
* H-E-B-friendly search terms.
* Preferred product mapping.
* Aisle/location storage if available.
* Possible integration research.

---

## 26. Mobile Shopping Experience

MVP grocery list should be highly mobile-friendly.

### 26.1 Requirements

The mobile shopping experience should include:

* Fast checkbox list.
* Collapsible categories.
* Quick add/remove.
* “Why is this on the list?” context.
* Clear item source labels.
* Large tap targets.
* Minimal typing.
* Reliable state preservation.

### 26.2 Spotty Service Behavior

Full offline mode is not required for MVP.

However, once a grocery list is loaded, it should not constantly refresh, lose checked items, or lose progress if store service is spotty.

Future PWA/offline support can improve this later.

---

## 27. Weekly Wrap-Up

MealBoard should include an optional weekly wrap-up.

### 27.1 Purpose

Weekly wrap-up should improve future suggestions without feeling like homework.

### 27.2 Wrap-Up Should Ask

* Which meals were made?
* Which meals were skipped?
* Did we like new recipes?
* Should recipes be approved/favorited/retired?
* Were there leftovers?
* Were grocery items unused?
* Should staple quantity/frequency change?

### 27.3 Wrap-Up UX

Weekly wrap-up should:

* Focus only on items needing attention.
* Highlight unreviewed new recipes.
* Highlight skipped meals.
* Allow fuller review if desired.
* Be optional.
* Be dismissible.
* Never block planning the next week.

---

## 28. AI Roadmap

### 28.1 MVP AI Position

MVP should not rely on full AI planning.

MVP starts rule-based.

### 28.2 Future AI Uses

Future AI can help with:

* Recipe import/parsing.
* Pasted recipe cleanup.
* New Try This ideas.
* Weekly meal suggestions.
* Smart swaps.
* Grocery impact explanations.
* Why this meal? explanations.
* H-E-B-friendly search terms.

### 28.3 AI Guardrails

AI must follow structured app rules.

AI should not override:

* Allergies.
* Hard-no foods.
* Baby age/stage rules.
* Recipe statuses.
* Profile approvals.
* Calorie strictness.
* User locks/removals.
* Grocery lifecycle status.

AI-generated changes should require user approval before changing the plan or grocery list.

---

## 29. Visual Design Requirements

MealBoard should feel:

* Soft.
* Family-friendly.
* Mobile-first.
* Calm.
* Practical.
* Clear.
* Not sterile.
* Not cluttered.
* Not overly techy.
* Not diet-shamey.
* Not medical-feeling for baby guidance.

### 29.1 UI Style

Use:

* Clear cards.
* Calming colors.
* Big tap targets.
* Simple status chips.
* Profile labels.
* Practical grocery/planner layout.

### 29.2 Avoid

Avoid:

* Overcrowded tables on mobile.
* Too many charts.
* Medicalized baby screens.
* Punitive calorie messaging.
* Generic recipe app look.

---

## 30. Core Data Model Overview

This is a product-level data model, not the final database schema.

### 30.1 Core Tables/Entities

* users
* households
* household_members
* profiles
* profile_day_types
* foods
* food_preferences
* food_preparation_notes
* recipes
* recipe_ingredients
* recipe_tags
* recipe_profile_statuses
* recipe_reviews
* meal_components
* meal_templates
* weekly_plans
* weekly_plan_profiles
* weekly_plan_days
* weekly_plan_items
* weekly_goals
* grocery_lists
* grocery_list_items
* grocery_item_sources
* staples
* preferred_products
* grocery_categories
* baby_food_statuses
* baby_guidance_stages
* weekly_wrap_ups

### 30.2 Future-Ready Entities

* ingredient_aliases
* nutrition_estimates
* nutrition_estimate_sources
* household_invitations
* user_household_roles
* AI_suggestion_logs
* HEB_product_mappings
* pantry_items
* offline_sync_events

---

## 31. Key Business Rules

### 31.1 Recipe Suggestion Rules

* Only approved recipes should appear in the trusted weekly plan by default.
* Idea/Try This recipes may appear separately.
* Hard-no/allergy ingredients block meals for the affected profile.
* Shared meals must respect all assigned profiles’ hard-no/allergy rules.
* Disliked ingredients warn but do not block by default.
* Safe Default/Reliable Meals can repeat often.
* Favorites can repeat more often than regular approved recipes.
* Recently used meals should be tracked but not rigidly avoided.

### 31.2 Grocery Rules

* Grocery list comes from the plan, staples, baby foods, backups if selected, manual add-ons, and household items.
* Nutrition totals come from meal plan items, not grocery list items.
* Shopping View combines matching items when safe.
* Profile and Meal views preserve separated context.
* List changes after finalization/shopping started require review.

### 31.3 Baby Rules

* Baby planning is solids only.
* Routine baby meals use tried/liked foods.
* New foods appear separately in Try This.
* New foods are suggested one at a time.
* Baby suggestions use age/stage and simple texture/prep tags.
* Safety prompts are light, calm, and guidance-based.

### 31.4 Calorie Rules

* Calorie targets are optional.
* Flexible is default strictness.
* Warnings only appear in strict/flexible calorie weeks.
* Snacks/drinks count only when intentionally assigned to a day/person in the meal plan.

---

## 32. MVP Success Criteria

MealBoard MVP is successful if Brianna can:

1. Log in to a private MealBoard account.
2. Set up profiles for Brianna, Elaine, baby, and shared/family.
3. Add basic preferences, staples, and baby stage.
4. Add a small set of approved recipes.
5. Use guided weekly planning to mark work/off days and goals.
6. Generate a draft plan for Brianna, Elaine, baby, and shared/family needs.
7. Review, swap, lock, or remove meals.
8. Generate a grocery list from the plan and selected staples.
9. See grocery items by Shopping View, Profile View, and Meal View.
10. Use the mobile grocery list in H-E-B without losing checked progress.
11. Complete a weekly wrap-up that improves future suggestions.

---

## 33. Implementation Roadmap

### Phase 0 — Product Docs

* PRD.
* Technical plan.
* Data model plan.
* MVP slice plan.

### Phase 1 — Repo and Foundation

* New Next.js repo.
* TypeScript.
* Tailwind/shadcn.
* Supabase setup.
* Auth foundation.
* Basic README.
* Docs folder.
* Basic layout/navigation.

### Phase 2 — Core Data Model

* Households/profiles.
* Foods/ingredients.
* Preferences.
* Recipes.
* Recipe ingredients.
* Recipe statuses/approval.
* Staples.

### Phase 3 — Recipe Library MVP

* Recipe cards.
* Add/edit recipe.
* Paste ingredients.
* Structured ingredient rows.
* Recipe tags/status/approval.
* Search/filter basics.

### Phase 4 — Profiles and Preferences

* Adult profiles.
* Baby profile.
* Food preference entry.
* Baby food tried/liked/disliked.
* Staples by profile.

### Phase 5 — Weekly Planning Thin Slice

* Choose week.
* Mark adult work/off days.
* Choose goals.
* Generate simple draft plan.
* Lock/swap/remove/approve meals.
* Day/profile views.

### Phase 6 — Grocery List MVP

* Generate grocery list from plan.
* Combine items.
* Categories.
* Profile/meal/source labels.
* Shopping/Profile/Meal views.
* Manual add-ons.
* Staples review.
* List lifecycle.

### Phase 7 — Nutrition MVP

* Recipe calories/protein.
* Estimate confidence.
* Adult calorie targets.
* Daily totals from meal plan.
* Strict/flexible/loose behavior.

### Phase 8 — Baby Planning MVP

* Baby age/stage.
* Baby Meal 1/2.
* Tried/liked/disliked.
* Baby staples.
* Try This new baby foods.
* Simple texture/prep tags.
* Light safety prompts.

### Phase 9 — Weekly Wrap-Up

* Made/skipped meals.
* Recipe review prompts.
* Unreviewed tried recipes.
* Optional/dismissible wrap-up.
* Grocery history.

### Phase 10 — Polish and Hardening

* Mobile grocery UX.
* Empty states.
* Loading/error states.
* Basic tests.
* Seed data.
* Accessibility basics.
* Docs cleanup.

---

## 34. Codex Build Strategy

Do not ask Codex to build the entire app at once.

Use small, reviewed PR-style slices.

Recommended Codex order:

1. Create `/docs/PRD.md` from this PRD.
2. Create `/docs/TECHNICAL_PLAN.md` from the PRD.
3. Implement app foundation only.
4. Implement Supabase schema only.
5. Implement seed data only.
6. Implement profiles only.
7. Implement recipe library only.
8. Implement ingredient structure only.
9. Implement simple weekly plan only.
10. Implement grocery generation logic only.
11. Add tests for grocery consolidation.
12. Add mobile grocery UI.
13. Iterate feature by feature.

Each Codex task should:

* Have a focused scope.
* Avoid unrelated refactors.
* Update docs when needed.
* Include tests where practical.
* Run lint/typecheck/tests if available.
* Produce a clean diff.

---

## 35. Open Questions for Later

These do not need to block MVP planning.

1. Which exact baby nutrition guidance format should be stored in the database?
2. Should baby guidance be editable through an admin/settings page or seeded as content?
3. What exact calorie/protein estimate flow should be used before a nutrition API exists?
4. What H-E-B export/copy workflow is most realistic?
5. What exact grocery category defaults should be seeded?
6. Should recipe instructions support sections, steps, or just rich text in MVP?
7. Should the app support household guests later?
8. Should shared meals allow more complex portioning later?
9. Should Try This recipe ideas come from AI, manual entry, or curated saved ideas first?
10. Should MealBoard eventually support public household onboarding?

---

## 36. MVP One-Sentence Definition

MealBoard MVP is a private, responsive family meal-planning web app that lets Brianna manage household profiles, preferences, recipes, baby solids, weekly meal suggestions, and a categorized grocery list that is practical for H-E-B shopping.
