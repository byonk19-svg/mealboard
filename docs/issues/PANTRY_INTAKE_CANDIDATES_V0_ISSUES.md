# Pantry Intake Candidates V0 Implementation Issues

## Scope

Pantry Intake Candidates V0 adds a reviewed handoff from completed grocery list items into Smart Pantry stock. Candidates are derived from completed grocery history and require explicit user confirmation before any Pantry Item is created.

This plan is limited to reviewed one-at-a-time intake from completed grocery items. It excludes automatic pantry mutation, batch intake, barcode scanning, AI insights, automatic unit conversion, recipe matching, Cooking Mode consumption, notifications, and background jobs.

## Resolved Product Decisions

- Completed grocery items do not become Pantry Items automatically.
- Checked grocery items may become intake candidates after the grocery list is completed.
- `already_have` grocery items are not intake candidates because they represent stock the household already had before shopping.
- Candidates should be limited to grocery items with a linked Household Item identity (`food_id`) in V0.
- Candidate quantities and units should be carried forward exactly as entered. No automatic unit conversion or package inference is part of V0.
- Intake confirmation creates a Pantry Item and Pantry Event only after review.
- Intake confirmation must not mutate the completed grocery list, grocery item checked state, or grocery item source rows.
- Skipping a candidate should be durable for that completed grocery item so the same item does not keep reappearing.
- Intake review state is a review decision log, not the current pantry source of truth. Pantry Items remain the editable source of truth after creation.
- Reversal stays in Smart Pantry controls: if a user confirms intake by mistake, they discard or edit the created Pantry Item.
- The first UI surface should be near completed grocery history or weekly wrap-up, not the active grocery list.

## Issue 1: Add Pantry Intake Review Decision Schema

### Goal

Persist explicit review decisions for completed grocery items so confirmed and skipped intake candidates do not reappear indefinitely.

### Scope

- Add the smallest schema support needed to record pantry intake decisions per household and grocery list item.
- Store decision status such as `confirmed` or `skipped`.
- Store optional created Pantry Item id for confirmed decisions.
- Store optional user-facing note or reason for traceability.
- Add household-scoped RLS and indexes that follow existing pantry and grocery-list patterns.
- Ensure the decision table cannot point at another household's grocery item or Pantry Item.

### Out of Scope

- Candidate derivation.
- Pantry item creation logic.
- UI.
- Batch intake.
- Cooking Mode consumption.

### Acceptance Criteria

- A completed grocery list item can have at most one active pantry intake decision.
- A confirmed decision may reference the Pantry Item created by intake.
- A skipped decision does not create or require a Pantry Item.
- Household members cannot read or write another household's intake decisions.
- Existing Pantry Item and grocery-list schemas are not broadened beyond what traceability requires.

### Test Expectations

- Add schema/RLS verification if the repo has a local database verification pattern for new tables.
- Run migration reset/lint if a migration is added.
- Add focused tests or SQL checks proving cross-household rows are rejected or hidden.

### Dependencies

- None.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `area:database`, `area:rls`, `type:schema`, `priority:p0`, `size:medium`

### Estimated Size

medium

## Issue 2: Derive Pantry Intake Candidates From Completed Grocery Items

### Goal

Create the domain/data helper that returns reviewable pantry intake candidates from completed grocery list items.

### Scope

- Read completed grocery lists and their items for the current household.
- Include checked grocery items with a linked `food_id`.
- Exclude `already_have` items, unchecked items, items without `food_id`, and items already covered by a confirmed or skipped intake decision.
- Preserve display name, food id, category, quantity, unit, preferred quantity text, source context, and completed-list context.
- Return deterministic candidate ordering by completed list recency, item sort order, and stable id.
- Keep candidate derivation dynamic; do not create candidate rows before review.

### Out of Scope

- Creating Pantry Items.
- UI rendering.
- Batch intake.
- Automatic unit conversion.
- Matching against existing Pantry Items.

### Acceptance Criteria

- Candidate output is deterministic for the same completed grocery state.
- Candidates never include current active grocery-list items.
- Candidates never include `already_have` items.
- Existing review decisions suppress duplicate prompts for the same grocery list item.
- Candidate output contains enough data for a later confirm action to prefill a Pantry Item review form.

### Test Expectations

- Unit or data-layer tests cover checked purchased items, unchecked exclusion, `already_have` exclusion, missing `food_id` exclusion, completed-list-only behavior, decision suppression, ordering, and exact quantity/unit carry-forward.

### Dependencies

- Issue 1.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `type:data-layer`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 3: Confirm One Pantry Intake Candidate

### Goal

Implement the reviewed action that creates a Pantry Item from one completed grocery item after the user confirms the details.

### Scope

- Reuse the candidate helper from Issue 2 so confirmation uses the same eligibility rules as the UI.
- Allow reviewed fields needed for Pantry Item creation: display name, category, quantity, unit, quantity note, stock status, expiration date, storage location, package detail, profile context, and note.
- Default stock status to `in_stock`.
- Carry quantity and unit forward exactly as entered unless the user edits them.
- Create a Pantry Item and Pantry Event.
- Record a confirmed intake decision linked to the completed grocery list item and created Pantry Item.
- Keep completed grocery list items immutable during confirmation.

### Out of Scope

- Batch confirm.
- Automatic package-size inference.
- Automatic unit conversion.
- Recipe matching.
- Restock candidate changes.

### Acceptance Criteria

- Confirming a candidate creates exactly one Pantry Item.
- Confirming a candidate creates Pantry Event history for the new item.
- Re-confirming the same grocery list item does not create a duplicate Pantry Item.
- Completed grocery list rows and source rows are not mutated.
- User edits in the review form are reflected in the Pantry Item.

### Test Expectations

- Data-layer tests cover successful confirm, duplicate confirm prevention, review-field overrides, event creation, no grocery mutation, and rejection when the grocery item is no longer eligible.

### Dependencies

- Issue 1.
- Issue 2.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `type:data-layer`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 4: Skip One Pantry Intake Candidate

### Goal

Let users explicitly skip a completed grocery item so it does not keep appearing as an intake candidate.

### Scope

- Add a one-at-a-time skip action for eligible intake candidates.
- Record a skipped intake decision for the grocery list item.
- Allow an optional note if existing form patterns make that cheap.
- Ensure skipping creates no Pantry Item and no Pantry Event.
- Keep completed grocery list rows immutable during skip.

### Out of Scope

- Bulk skip.
- Undo UI.
- Pantry Item creation.
- Grocery-list mutation.

### Acceptance Criteria

- Skipping a candidate removes it from future candidate output.
- Skipping does not create or mutate Pantry Items.
- Skipping does not mutate completed grocery list rows.
- Re-skipping an already skipped item is safe and idempotent.

### Test Expectations

- Data-layer tests cover skipped decision persistence, candidate suppression, idempotent skip, and no Pantry Item/Event/grocery mutation.

### Dependencies

- Issue 1.
- Issue 2.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `type:data-layer`, `priority:p1`, `size:small`

### Estimated Size

small

## Issue 5: Show Pantry Intake Review From Completed Grocery History

### Goal

Expose reviewed pantry intake candidates in a user-visible place near completed grocery history without changing the active grocery-list workflow.

### Scope

- Add an intake review surface near recent completed grocery lists or weekly wrap-up, following existing navigation patterns.
- Show one candidate at a time or a compact candidate list with confirm and skip controls.
- Prefill the confirm form from grocery item data.
- Make it clear that confirming creates pantry stock and skipping only dismisses the candidate.
- Hide or empty-state the surface when there are no eligible candidates.
- Preserve mobile usability for kitchen/shopping follow-up use.

### Out of Scope

- Active grocery-list page redesign.
- Batch confirm or batch skip.
- Dashboard widgets.
- Notifications.
- AI suggestions.

### Acceptance Criteria

- Users can find intake review after completing shopping or when reviewing completed grocery history.
- Confirming one candidate creates a Pantry Item and removes that candidate from the review surface.
- Skipping one candidate removes it from the review surface without creating pantry stock.
- The UI never implies completed grocery items automatically changed pantry state.
- The active grocery list remains focused on shopping, not pantry intake review.

### Test Expectations

- Component or route tests cover visible candidates, empty state, confirm success, skip success, and read-only completed grocery context.
- Browser smoke covers a completed grocery item flowing through confirm and skip interactions where feasible.

### Dependencies

- Issue 2.
- Issue 3.
- Issue 4.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `area:ui`, `type:ui`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 6: Verify Pantry Intake Candidate End-To-End Behavior

### Goal

Lock down the reviewed grocery-to-pantry intake path with focused regression coverage and browser validation.

### Scope

- Add any missing regression tests after Issues 1-5 are implemented.
- Verify the real path from completed grocery item to reviewed Pantry Item creation.
- Verify skipped candidates stay skipped.
- Verify completed grocery rows remain unchanged after confirm and skip.
- Verify `already_have`, unchecked, missing-food, and already-reviewed items do not appear.
- Verify no automatic pantry mutation, batch intake, barcode scanning, AI insights, unit conversion, recipe matching, notifications, or background jobs were introduced.

### Out of Scope

- New product behavior beyond the V0 path.
- Broad test-suite rewrites.
- Performance tuning unrelated to candidate derivation.
- External tracker publication.

### Acceptance Criteria

- Critical candidate eligibility, confirm, skip, duplicate prevention, and UI states are covered by automated tests.
- Browser validation demonstrates confirm, skip, and empty/no-candidate states.
- The final diff contains no automatic pantry mutation from grocery completion.
- The implementation remains compatible with the label vocabulary and review-first pantry boundary.

### Test Expectations

- Run the narrowest relevant tests first while implementing.
- Before closeout, run the repo-standard verification set: tests, lint, typecheck, build, browser smoke, and `git diff --check`.
- Capture any skipped checks with the exact reason.

### Dependencies

- Issue 1.
- Issue 2.
- Issue 3.
- Issue 4.
- Issue 5.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `area:tests`, `type:test`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Assumptions

- Completed grocery lists remain immutable historical records.
- The current grocery item model's `checked` and `already_have` flags are enough to distinguish likely purchased items from items the household already had.
- V0 should require a linked `food_id` so intake creates Pantry Items tied to household item identity without adding fuzzy matching.
- A durable review decision table is acceptable because intake has a real skip state that should survive reloads.

## Open Questions

- Should the first UI surface live on recent completed grocery list detail, weekly wrap-up, or both?
- Should confirming intake default expiration date to blank, or should the review form require an explicit user-entered expiration when desired?
- Should manually added grocery items with no `food_id` be offered a "create household item first" path in V1?
