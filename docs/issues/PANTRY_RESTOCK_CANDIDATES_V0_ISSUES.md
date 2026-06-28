# Pantry Restock Candidates V0 Implementation Issues

## Scope

Pantry Restock Candidates V0 adds a reviewed handoff from Smart Pantry low/out items to the current editable grocery list. Candidates are generated dynamically from pantry state and existing grocery list items; they are not persisted as their own table.

This plan is limited to `/pantry?view=low`, one-at-a-time adds, conservative dedupe, and traceable grocery source context. It excludes barcode scanning, AI insights, automatic unit conversion, automatic grocery mutations, pantry deduction, recipe matching, Cooking Mode, notifications, and background jobs.

## Resolved Product Decisions

- Restock candidates appear first in the Pantry low/out surface, not in the Grocery List page.
- An editable grocery list is selected in this order: `shopping_started`, then `finalized`, then `draft`. Completed lists are historical and are never mutated.
- If no editable grocery list exists, candidates remain visible but read-only.
- Adding a candidate creates or reuses a grocery-list item only; it does not update Pantry Item status and does not create a Pantry Event.
- Candidates are generated from effective stock status. Manual `low` and `out` statuses are eligible even when quantity details are missing.
- Eligible candidates include `low`, `out`, and threshold-derived low when comparable units already match. `unknown`, `in_stock`, discarded items, missing thresholds, and mismatched units are excluded.
- Candidates roll up by `food_id`. Multiple qualifying pantry lots for the same food produce one candidate.
- Representative pantry item selection uses `out` before `low`, nearest expiration first, most recently updated first, and lowest stable id as the final tie-breaker.
- Dedupe is strict for matching `food_id` already on the selected editable grocery list. Normalized display-name matches may warn but must not silently merge.
- Added grocery items should carry pantry restock source context with `source_type = pantry_restock`, source id, label, notes, `food_id`, and profile context when available.
- Grocery quantity and unit should remain null by default; no automatic quantity inference or unit conversion is part of V0.
- Pantry cannot undo or remove grocery additions in V0. Reversal stays in Grocery List controls.

## Issue 1: Support Pantry Restock Grocery Source Context

### Goal

Allow grocery items created from pantry restock review to carry explicit, queryable source context without changing Pantry Item state.

### Scope

- Inspect the existing grocery item source schema, enum/check constraints, and source-context patterns.
- Add the smallest schema support needed for `pantry_restock` if the current source type set does not already allow it.
- Ensure source context can reference the representative Pantry Item id, carry `food_id`, and preserve optional profile context.
- Keep RLS and household access consistent with existing grocery-list and pantry access rules if schema changes are required.

### Out of Scope

- Candidate generation.
- Pantry UI.
- Grocery-list UI changes.
- Pantry Events.
- Pantry status mutation.
- Batch add.

### Acceptance Criteria

- Grocery source context can represent a reviewed pantry restock addition using `source_type = pantry_restock`.
- Source context can store a representative Pantry Item reference or equivalent existing source id field.
- Source context can preserve `food_id` and optional profile context when the existing schema supports those fields.
- No pantry table is mutated by adding the source type support.
- No completed grocery list can be made editable by this change.

### Test Expectations

- Add or update database/schema tests if the repo has an existing pattern for enum/check/source validation.
- If there is no database test pattern, verify through migration reset/lint and focused typecheck.
- Include a regression check that existing grocery source types still work.

### Dependencies

- None.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `area:database`, `area:rls`, `type:schema`, `priority:p0`, `size:small`

### Estimated Size

small

## Issue 2: Derive Pantry Restock Candidates

### Goal

Create the domain/data helper that returns reviewed restock candidates for the Pantry low/out view using current pantry state and the selected editable grocery list.

### Scope

- Select the current editable grocery list in priority order: `shopping_started`, `finalized`, then `draft`.
- Return candidates for effective `low` and `out` pantry items, including threshold-derived low only when units already match.
- Exclude `unknown`, `in_stock`, discarded items, mismatched-unit threshold cases, and missing-threshold derived cases.
- Roll up candidates by `food_id`.
- Pick the representative Pantry Item using the resolved tie-break rules.
- Mark candidates already present when the same `food_id` exists on the selected editable grocery list.
- Surface normalized display-name fallback matches as warnings only, not automatic dedupe.
- Return read-only candidate state when no editable grocery list exists.

### Out of Scope

- Creating grocery items.
- UI rendering.
- Persisting candidates.
- Unit conversion.
- Completed-list dedupe.
- Expiring-soon-only suggestions.

### Acceptance Criteria

- The helper returns deterministic candidate rows from the same pantry and grocery state.
- Candidate status distinguishes actionable, already-on-list, and no-editable-list states.
- Candidate rollup prevents duplicate candidates for multiple qualifying lots with the same `food_id`.
- Completed grocery lists do not affect candidate dedupe.
- Candidate output includes enough source data for the later add action: representative Pantry Item id, display name, category fallback, `food_id`, profile context, and stock reason.

### Test Expectations

- Unit or data-layer tests cover manual `low`, manual `out`, threshold-derived low, excluded statuses, discarded items, completed-list ignore, editable-list priority, strict `food_id` dedupe, display-name warning, and representative item tie-breaks.
- Add a test for read-only candidate output when no editable list exists.

### Dependencies

- Issue 1.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `type:data-layer`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 3: Add One Pantry Restock Candidate To Groceries

### Goal

Implement the reviewed one-at-a-time action that adds an actionable pantry restock candidate to the selected editable grocery list.

### Scope

- Reuse the candidate helper from Issue 2 so add behavior uses the same eligibility, selected-list, and dedupe rules as the UI.
- Add a grocery item with null quantity and null unit by default.
- Set grocery source context to pantry restock with label `Restock: <pantry display name>` and notes `Pantry status: low/out`.
- Use Pantry Item category first, Household Item default category second, and null category otherwise.
- Preserve Pantry Item `food_id` and profile context when present.
- Treat same-`food_id` existing grocery item on the editable list as already added and avoid a duplicate.

### Out of Scope

- Batch add.
- Pantry Event creation.
- Pantry Item status updates.
- Pantry undo/remove.
- Grocery-list page redesign.
- Automatic quantity inference.

### Acceptance Criteria

- Adding an actionable candidate creates exactly one grocery item on the selected editable list.
- Re-adding the same `food_id` candidate does not create a duplicate.
- Pantry Item stock status, quantity fields, and events remain unchanged.
- Adding is rejected or no-ops safely when the selected list becomes unavailable or completed before the action runs.
- The add helper is reusable by a future batch action without committing V0 to batch UI.

### Test Expectations

- Data-layer tests cover successful add, duplicate same-`food_id` add, no editable list, list completed between read and write, null quantity/unit defaults, source context, category fallback, and no Pantry Event/status mutation.
- Include concurrency-oriented coverage if existing data-layer patterns support it.

### Dependencies

- Issue 1.
- Issue 2.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `type:data-layer`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 4: Show Restock Candidates In The Pantry Low/Out View

### Goal

Expose reviewed restock candidates inside `/pantry?view=low` with clear add, already-added, and read-only states.

### Scope

- Render restock candidates only on the Pantry low/out view.
- Show actionable candidates with one-at-a-time add controls.
- Show same-`food_id` matches as `Already on grocery list`.
- Show candidates as read-only when no editable grocery list exists.
- Show normalized display-name match warnings without silently merging.
- Refresh candidate state after a successful add.
- Keep non-food household goods visible for restock without feeding recipe, nutrition, baby, or Cooking Mode behavior.

### Out of Scope

- Showing restock candidates on all Pantry views.
- Showing restock candidates on the Grocery List page.
- Batch add.
- Pantry undo/remove.
- Dashboard widgets.
- Notifications.

### Acceptance Criteria

- `/pantry?view=low` displays low/out restock candidates grouped at the resolved candidate level.
- `/pantry` or other non-low views do not show the V0 restock candidate action.
- Successful add updates the candidate row to `Already on grocery list`.
- No editable grocery list state is understandable and does not invite a failing add.
- UI does not imply that Pantry Item stock changed after adding to groceries.

### Test Expectations

- Component or integration tests cover actionable, already-added, no-editable-list, warning, and add-success refresh states.
- Browser smoke covers the real `/pantry?view=low` flow with clicks and confirms the grocery item appears without changing pantry status.
- Include a narrow responsive/mobile check if the repo has an established browser QA pattern.

### Dependencies

- Issue 2.
- Issue 3.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `area:ui`, `type:ui`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 5: Verify Restock Candidate End-To-End Behavior

### Goal

Lock down the V0 restock path with focused regression coverage and real browser validation.

### Scope

- Add any missing regression tests after Issues 1-4 are implemented.
- Verify the real path from Pantry low/out candidate review to grocery item creation.
- Verify that Pantry Item status and Pantry Events remain unchanged after adding to groceries.
- Verify that completed grocery lists are ignored and never mutated.
- Verify that no candidate table or background job was introduced.
- Verify no Smart Pantry behavior leaks into recipes, Cooking Mode, nutrition, baby profile flows, or automatic unit conversion.

### Out of Scope

- New product behavior beyond the V0 path.
- Broad test-suite rewrites.
- Performance tuning unrelated to the candidate query.
- External tracker publication.

### Acceptance Criteria

- Critical candidate eligibility, dedupe, add, and UI states are covered by automated tests.
- Browser validation demonstrates add, already-on-list, and no-editable-list states.
- The final diff contains no implementation for batch add, automatic pantry mutation, pantry deduction, recipe matching, barcode scanning, AI insights, or notifications.
- The implementation remains compatible with the label vocabulary and documented pantry boundaries.

### Test Expectations

- Run the narrowest relevant tests first while implementing.
- Before closeout, run the repo-standard verification set: tests, lint, typecheck, build, and `git diff --check`.
- Capture any skipped checks with the exact reason.

### Dependencies

- Issue 1.
- Issue 2.
- Issue 3.
- Issue 4.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:grocery-list`, `area:tests`, `type:test`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Assumptions

- The current grocery-list model already has a notion of list status that can distinguish `draft`, `finalized`, `shopping_started`, and `completed`.
- The current pantry model can compute effective stock status from manual status and threshold data.
- Existing grocery source context is the preferred place to preserve pantry-restock traceability.
- The first implementation branch should start with Issue 1 unless live schema inspection proves no source-type change is needed; in that case Issue 1 should become a small confirmation/test issue.

## Open Questions

- None for V0 planning. Schema field names and exact source-context storage should be confirmed against the live code during Issue 1 implementation.
