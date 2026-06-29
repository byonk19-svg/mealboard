# Cooking Mode V0 PRD

## Problem Statement

MealBoard already helps the household plan meals, save recipes, and generate grocery lists, but cooking from a saved recipe is still a basic reading experience. The user needs a practical kitchen mode that turns a saved recipe into a focused, persistent cooking workflow with ingredient readiness checks, step-by-step progress, and simple timers.

Cooking Mode V0 should make it easier to cook from MealBoard without losing place, without accidentally changing pantry inventory, and without requiring voice controls or broader Smart Pantry work. The experience should be useful on a phone or kitchen tablet and should preserve progress if the page reloads or the user leaves and returns.

## Solution

Cooking Mode V0 adds a recipe-backed Cooking Session. A user can start cooking from a saved recipe, optionally from a planned weekly meal, review or create structured Recipe Steps when needed, check ingredients as ready/prepped, check steps as completed, create basic in-app timers, pause/resume the session, complete it, or abandon it.

The Cooking Session stores a snapshot of the effective recipe ingredients and reviewed Recipe Steps at the moment cooking starts. This snapshot includes planned meal servings or scale when launched from a weekly plan item and that data already exists. Later edits to the recipe or plan do not rewrite an active session.

Cooking Mode V0 does not deduct pantry stock. Ingredient checks mean ready/prepped, step checks mean the instruction is done, and completion may record made/tried evidence or feed review/wrap-up flows, but inventory changes remain out of scope.

## User Stories

1. As Brianna, I want to start Cooking Mode from a saved recipe, so that I can cook directly from MealBoard.
2. As Brianna, I want to start Cooking Mode from a planned weekly meal, so that the session uses the planned recipe and scale.
3. As Brianna, I want Cooking Mode to show the recipe name and serving context, so that I know which meal I am cooking.
4. As Brianna, I want Cooking Mode to show the ingredient list separately from the steps, so that I can prep ingredients before cooking.
5. As Brianna, I want to check an ingredient as ready, so that I can keep track of what I have gathered or prepped.
6. As Brianna, I want ingredient checks to mean ready/prepped, so that checking an ingredient does not imply it has been consumed.
7. As Brianna, I want recipe ingredient prep notes to appear in the ingredient checklist, so that details like chopped, diced, or softened are visible at the right time.
8. As Brianna, I want Cooking Mode to show one clear ordered list of Recipe Steps, so that I can move through the method without scanning a long recipe page.
9. As Brianna, I want to check a Recipe Step as completed, so that I can keep my place while cooking.
10. As Brianna, I want to uncheck a Recipe Step, so that I can correct accidental taps.
11. As Brianna, I want Cooking Mode to support optional section labels, so that recipes with parts like sauce, filling, and assembly are easier to follow.
12. As Brianna, I want sections to be simple labels, so that Cooking Mode does not force a complicated recipe structure.
13. As Brianna, I want Cooking Mode to use structured Recipe Steps when they exist, so that the cooking flow is based on reviewed instructions.
14. As Brianna, I want to review or create Recipe Steps before starting Cooking Mode when a recipe only has freeform instructions, so that messy imported or pasted instructions do not produce a brittle cooking flow.
15. As Brianna, I want converting freeform instructions into Recipe Steps to be review-first, so that MealBoard does not silently rewrite the recipe method.
16. As Brianna, I want edits to freeform recipe instructions not to silently change reviewed Recipe Steps, so that the cooking source of truth stays clear.
17. As Brianna, I want Recipe Steps to remain linear in V0, so that the first cooking workflow stays simple.
18. As Brianna, I want conditional cooking details to stay in step text, so that recipes can still mention alternatives without requiring branching logic.
19. As Brianna, I want Cooking Mode to snapshot the recipe at session start, so that later recipe edits do not change what I am cooking mid-session.
20. As Brianna, I want Cooking Mode to snapshot planned scaling, so that a half-size planned meal shows effective quantities.
21. As Brianna, I want direct recipe Cooking Sessions to use the recipe default servings in V0, so that the first cooking workflow stays simple.
22. As Brianna, I want an active session to keep its own snapshot if the recipe changes elsewhere, so that I can finish the meal I started.
23. As Brianna, I want a visible warning if the underlying recipe changed after the session started, so that I understand why a session may differ from the current recipe.
24. As Brianna, I want to pause a Cooking Session, so that I can intentionally leave it and resume later.
25. As Brianna, I want to resume an active or paused Cooking Session, so that a page reload or accidental navigation does not lose my progress.
26. As Brianna, I want Cooking Session progress to persist across reloads, so that cooking is reliable in the kitchen.
27. As Brianna, I want Cooking Session progress to persist across devices where practical, so that I can start on a computer or tablet and resume on my phone.
28. As Brianna, I want Cooking Mode V0 to avoid complex real-time collaboration, so that progress remains deterministic even without multi-user conflict handling.
29. As Brianna, I want accidental concurrent edits to resolve predictably, so that the app does not create conflicting step states.
30. As Brianna, I want to abandon a Cooking Session, so that browsing or accidentally starting a recipe does not count as making it.
31. As Brianna, I want abandoned sessions not to update recipe history, weekly plan status, pantry, or wrap-up prompts, so that abandoned work has no side effects.
32. As Brianna, I want to complete a Cooking Session even if some steps are unchecked, so that forgotten checkboxes do not block real cooking.
33. As Brianna, I want completion to warn me about unchecked steps or ingredients, so that I can review before completing.
34. As Brianna, I want completing a session to record that the recipe was made or tried, so that MealBoard can support later review.
35. As Brianna, I want completing a session linked to a weekly plan item to mark that meal as made when appropriate, so that weekly review has better context.
36. As Brianna, I want completing an Idea recipe to be able to move it to Tried, so that trying a recipe is captured without forcing approval.
37. As Brianna, I want completing a Cooking Session not to mark a recipe as Approved or Favorite automatically, so that those remain explicit review decisions.
38. As Brianna, I want Cooking Session notes, so that I can capture details like too salty, used Greek yogurt, or baby liked the side.
39. As Brianna, I want Cooking Session notes to feed recipe review or weekly wrap-up, so that notes are not lost after cooking.
40. As Brianna, I want Cooking Session notes not to edit the saved recipe automatically, so that one-time comments do not change the canonical recipe.
41. As Brianna, I want to record an ingredient substitution during a session, so that the session reflects what I actually cooked.
42. As Brianna, I want substitutions to be session-scoped by default, so that using Greek yogurt once does not rewrite a sour cream recipe.
43. As Brianna, I want substitutions to be available during later recipe review, so that useful changes can be saved intentionally.
44. As Brianna, I want to create a timer from Cooking Mode, so that I do not need a separate app for common cooking timing.
45. As Brianna, I want a timer to be linked to a step when useful, so that I know what the timer is for.
46. As Brianna, I want to create an ad hoc timer, so that I can time something even if the recipe step did not define it.
47. As Brianna, I want timers to have clear states, so that running, paused, expired, dismissed, and canceled timers behave predictably.
48. As Brianna, I want to pause and resume a timer, so that interruptions do not force me to recreate it.
49. As Brianna, I want to dismiss an expired timer, so that completed timers do not stay noisy.
50. As Brianna, I want to cancel a timer, so that timers created by mistake can be removed from the active cooking surface.
51. As Brianna, I want timer expiry to be visible in the app, so that I notice when a cooking interval has ended.
52. As Brianna, I want timer expiry not to complete a Cooking Session, so that a timer ending does not imply the meal is done.
53. As Brianna, I want timers to persist enough to recover after reload, so that a refresh does not erase active timers.
54. As Brianna, I want timer editing to update the intended timer deterministically, so that editing does not create hidden duplicate timers.
55. As Brianna, I want Cooking Mode to be mobile-friendly, so that I can use it on a phone at the counter.
56. As Brianna, I want Cooking Mode to be readable on a kitchen tablet, so that steps and timers are easy to scan while cooking.
57. As Brianna, I want large tap targets for checklist and timer controls, so that I can use the UI while cooking.
58. As Brianna, I want the current step and timer state to be visually clear, so that I do not have to hunt for what to do next.
59. As Brianna, I want Cooking Mode to avoid pantry deduction in V0, so that ingredient checks and session completion cannot corrupt inventory.
60. As Brianna, I want Cooking Mode to avoid voice controls in V0, so that the first version stays simple and reliable.
61. As Brianna, I want Cooking Mode not to add grocery items, so that cooking does not unexpectedly change the shopping list.
62. As Brianna, I want Cooking Mode not to modify Recipe Steps when I am only cooking, so that cooking progress and recipe authoring remain separate.
63. As Brianna, I want Cooking Mode to respect household scoping, so that sessions are only visible within the current household.
64. As Brianna, I want Cooking Mode to handle missing or incomplete instructions clearly, so that I know I need to review steps before cooking.
65. As Brianna, I want Cooking Mode to handle recipes with no ingredients gracefully, so that unusual recipes can still be cooked step by step.
66. As Brianna, I want Cooking Mode to handle recipes with no steps by requiring step review, so that I do not enter an empty cooking flow.
67. As Brianna, I want Cooking Mode to avoid photos in V0, so that the feature focuses on reliable cooking state first.
68. As Brianna, I want Cooking Mode to keep my progress until I complete or abandon the session, so that sessions do not disappear unexpectedly.
69. As Brianna, I want a clear way to return from a recipe or weekly plan item to the active session, so that I can resume quickly.
70. As Brianna, I want completed sessions to be historical, so that I can understand what was cooked without editing the old session.

## Implementation Decisions

- Cooking Mode V0 is recipe-backed. A Cooking Session requires a saved recipe.
- A Cooking Session may optionally link to a weekly plan item. Direct recipe cooking is valid; ad hoc non-recipe cooking is out of scope.
- Cooking Mode V0 uses reviewed Recipe Steps as the source of truth for step-by-step cooking.
- Existing freeform recipe instructions remain display/source text and can be used to create draft Recipe Steps through a review-first flow.
- Recipe Steps are linear and ordered. Optional section labels are supported as lightweight grouping labels.
- Branching, conditional step structures, and separate section records are out of scope for V0.
- Starting a Cooking Session creates a snapshot of effective recipe ingredients and Recipe Steps.
- When launched from a weekly plan item, the Cooking Session snapshot uses planned meal servings or scale when that data already exists.
- When launched directly from a recipe, the Cooking Session uses the recipe's saved servings and scale. Direct serving or scale adjustment inside Cooking Mode is out of scope for V0.
- Later edits to recipe ingredients, recipe steps, freeform instructions, or weekly plan items do not rewrite an active or completed Cooking Session.
- Ingredient checklist state belongs to the Cooking Session snapshot and means ready/prepped.
- Step checklist state belongs to the Cooking Session snapshot and means completed instruction.
- Ingredient and step checklist changes are reversible while the session remains active or paused.
- Cooking Session lifecycle states are active, paused, completed, and abandoned.
- Completing a Cooking Session is an explicit user action and does not require all ingredients or steps to be checked.
- Completion should warn about unchecked ingredients or steps before confirming.
- Abandoned sessions have no downstream effects on pantry, recipe status, weekly plan made state, or wrap-up.
- Completing a session can record made/tried evidence.
- Completing a session linked to a weekly plan item can mark the planned meal as made.
- Completing an Idea recipe can move it to Tried, but Approved and Favorite remain explicit recipe review outcomes.
- Cooking Session notes are session-scoped and may feed review or wrap-up.
- Ingredient substitutions are session-scoped by default and may be offered during recipe review, but do not automatically edit the saved recipe.
- Cooking Timers are owned by a Cooking Session.
- A Cooking Timer may be linked to a session step or created ad hoc.
- Cooking Timer states include ready, running, paused, expired, dismissed, and canceled.
- Timer expiry is durable and visible in the app but does not complete a Cooking Session.
- Timer controls should be in-app only in V0. Push notifications, reminders, and background notification behavior are out of scope.
- Cooking Mode V0 should be resumable across reloads and practical across devices, but it does not require real-time collaborative conflict handling.
- Last-write-wins behavior with timestamps is acceptable for V0 concurrent session edits.
- Voice controls are out of scope.
- Pantry deduction, pantry consumption candidates, and Smart Pantry integration are out of scope.
- Grocery list mutation is out of scope.
- Recipe photos and cooking photos are out of scope.
- The route and UI should provide obvious entry points from recipe detail pages and planned recipe items.
- The UI should provide a direct resume path for an existing active or paused session.
- The implementation should reuse existing household/auth scoping, recipe persistence, weekly plan, recipe review, and wrap-up patterns.

## Testing Decisions

- Tests should focus on externally visible behavior and domain transitions, not implementation details.
- Pure logic should be tested with unit tests following the existing pattern used for grocery, recipe import, weekly planning, nutrition, baby, and dashboard helpers.
- Cooking Session lifecycle logic should be covered with unit tests for valid transitions, invalid transitions, completion warnings, and abandoned-session inertness.
- Session snapshot creation should be covered with unit tests for direct recipe launch, weekly plan launch, scaling, ingredient snapshot fields, step snapshot fields, and immunity from later recipe edits.
- Recipe Step conversion helpers should be covered with unit tests for splitting freeform instructions into reviewable step candidates, preserving section labels when detectable, and refusing silent conversion as final reviewed steps.
- Ingredient checklist behavior should be covered with unit tests proving that ingredient checks mean readiness and do not create pantry mutations.
- Step checklist behavior should be covered with unit tests for check, uncheck, completion, and incomplete-step warnings.
- Timer domain behavior should be covered with unit tests for ready, running, paused, expired, dismissed, canceled, edit behavior, and recovery calculations after reload.
- Session completion side effects should be tested at the highest practical seam, covering made/tried evidence and linked weekly plan item made behavior without asserting internal query sequencing.
- Abandoned session behavior should be tested to prove it does not update recipe status, weekly plan made state, wrap-up prompts, or pantry.
- UI smoke coverage should use a focused Playwright flow if the implementation includes routes: start from a recipe, review/create steps if needed, check an ingredient, check a step, start/pause/dismiss a timer, reload, resume, and complete.
- Mobile or narrow viewport smoke coverage should verify tap targets and non-overlapping checklist/timer controls if the UI surface is meaningfully changed.
- Verification for an implementation slice should include unit tests, lint, typecheck, build, and a focused browser smoke for the cooking route.

## Out of Scope

- Voice controls.
- Pantry deduction.
- Pantry Consumption Candidates.
- Smart Pantry integration.
- Grocery list additions or removals.
- Push notifications, background reminders, email, or OS-level timer notifications.
- Full offline mode.
- Real-time collaborative multi-cook editing.
- Branching or conditional Recipe Step data structures.
- Separate Recipe Step section records.
- Photos or media capture.
- Recipe approval or favorite changes without explicit review.
- Automatic recipe edits from Cooking Session notes or substitutions.
- Ad hoc non-recipe cooking sessions.
- Leftover inventory management.
- Nutrition recalculation.
- AI-generated cooking instructions.

## Further Notes

Cooking Mode V0 is intentionally manual and review-first. The feature should make saved recipes easier to execute in the kitchen without widening into pantry automation or voice interaction.

The first implementation should be a narrow post-MVP slice:

1. Add reviewed Recipe Steps and review-first conversion from freeform instructions.
2. Add recipe-backed Cooking Sessions with active, paused, completed, and abandoned states.
3. Add session snapshots for effective ingredients and steps.
4. Add ingredient readiness and step completion checklists.
5. Add basic in-app Cooking Timers.
6. Add completion behavior that records made/tried evidence and supports later review.

Cooking Mode V0 should respect the review-first pantry/cooking boundary: no pantry stock changes happen from ingredient checks, step checks, timer expiry, or session completion.

Future stock application from confirmed cooking consumption decisions must start from `docs/PANTRY_CONSUMPTION_STOCK_APPLICATION_V0_PRD.md` and stay separate from confirm/skip review actions.
