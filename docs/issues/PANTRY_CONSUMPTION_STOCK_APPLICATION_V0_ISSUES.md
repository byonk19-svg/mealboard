# Pantry Consumption Stock Application V0 Implementation Issues

Source docs:

- `docs/PANTRY_CONSUMPTION_STOCK_APPLICATION_V0_PRD.md`
- `docs/SMART_PANTRY_V0_PRD.md`
- `docs/COOKING_MODE_V0_PRD.md`
- `docs/adr/0001-review-first-pantry-and-cooking-boundaries.md`

This is a local issue plan only. Do not publish these issues to GitHub, Linear, or any external tracker unless explicitly requested later.

## Current Implementation Status

Issues 1-5 are complete after the explicit stock-application review UI slice. The next implementation slice is Issue 6, full-path regression and browser validation.

## Scope

Pantry Consumption Stock Application V0 adds an explicit, reviewed stock write after a confirmed pantry consumption decision. It does not change the meaning of confirm/skip: confirming consumption records a review decision, skipping remains write-free, and pantry stock changes only through a separate apply action.

This plan is limited to food-backed completed Cooking Session ingredients, confirmed consumption decisions, explicit Pantry Item lot allocation, exact-unit quantities, audit history, idempotency, and reversal. It excludes automatic pantry deduction, unit conversion, fuzzy matching, package inference, notifications, AI, barcode scanning, H-E-B behavior, and prepared-leftover inventory.

## Resolved Product Decisions

- Confirming consumption and applying stock are separate actions.
- A skipped consumption decision can never apply stock.
- A confirmed consumption decision may remain confirmed but unapplied.
- Application writes against concrete Pantry Item lots, not food-level rollups.
- MealBoard may auto-select a lot only when exactly one eligible active compatible lot exists.
- Multiple eligible lots require explicit user-reviewed selection or allocation.
- Applied quantity and unit are required for any stock write.
- V0 uses exact-unit compatibility only; no automatic conversion is allowed.
- Multi-lot allocation must be explicit, atomic, and sum exactly to the applied quantity.
- A confirmed consumption decision can have at most one active stock application.
- Retrying or racing the same application must not double-deduct stock.
- Reversal is additive and restores the exact original lots and quantities.
- Reversal is terminal for the stock application path in V0; the same decision cannot be applied again after reversal.
- Application and reversal must be actor-attributed where the authenticated actor is available.
- All new records must be household-scoped and enforce composite household references.

## Issue 1: Add Stock Application Schema and RLS Foundation

### Goal

Persist exactly-once stock application, lot allocation, and reversal records linked to confirmed pantry consumption decisions.

### Scope

- Inspect current pantry item, pantry event, cooking session, and consumption decision schemas.
- Add the smallest schema needed to represent one stock application per confirmed consumption decision, one or more lot allocations per application, optional reversal linked to the original application, actor attribution where available, and before/after quantity summaries or enough structured data for audit display.
- Enforce household-scoped composite foreign keys from application records to consumption decisions and Pantry Item lots.
- Add RLS policies and grants following existing pantry/cooking household patterns.
- Add indexes for decision lookup, household lookup, lot lookup, and reversal lookup.
- Decide whether Pantry Events gain actor attribution or whether stock application history is the primary audit record.

### Out of Scope

- Candidate derivation changes.
- UI.
- Stock deduction action implementation.
- Reversal action implementation.
- Unit conversion.
- Automatic pantry mutation from confirm/skip.

### Acceptance Criteria

- A confirmed consumption decision can have at most one active stock application.
- The persistence model prevents duplicate active applications, duplicate reversals, and re-application after reversal for the same decision.
- The chosen uniqueness/idempotency constraints are documented in the migration or adjacent schema comments before application code is built.
- Application allocations can reference only same-household Pantry Item lots.
- Cross-household decision, lot, allocation, and reversal references are impossible through constraints and RLS.
- Reversal can be represented without editing or deleting the original decision.
- Actor attribution is stored where available and allows service-created historical rows to remain safe.
- Confirm/skip consumption schema behavior remains backward compatible.

### Test Expectations

- Run `supabase db reset` and `supabase db lint` if a migration is added.
- Extend `scripts/verify-pantry-rls.mjs` for same-household insert, cross-household rejection, duplicate application rejection, duplicate reversal rejection, and actor capture.
- Add focused schema/data tests if an existing pattern is available for the new helper layer.

### Dependencies

- None.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:cooking-mode`, `area:database`, `area:rls`, `type:schema`, `priority:p0`, `size:medium`

### Estimated Size

medium

## Issue 2: Add Stock Application Domain Rules

### Goal

Create pure, deterministic helpers for eligibility, lot selection, quantity validation, allocation validation, idempotency states, and reversal math before writing stock mutation code.

### Scope

- Add helpers that determine whether a confirmed consumption decision is eligible for stock application.
- Return confirmed-but-unapplied, applied, reversed, skipped, and ineligible states.
- Filter eligible Pantry Item lots by household, active/discarded state, matching `food_id`, structured quantity, and exact-unit compatibility.
- Auto-select a lot only when exactly one eligible lot exists.
- Return ordered lot choices when multiple eligible lots exist.
- Validate applied quantity and unit.
- Validate multi-lot allocations sum exactly to the applied quantity.
- Reject overdraw and incompatible units.
- Calculate exact reversal deltas from stored allocations.

### Out of Scope

- Database writes.
- UI rendering.
- Reversal UI.
- Unit conversion.
- Fuzzy name/category matching.

### Acceptance Criteria

- Helpers are deterministic for the same inputs.
- Skipped and undecided candidates are not eligible.
- Confirmed decisions without compatible lots remain unapplied.
- Reversed decisions are terminal and cannot be returned to applyable state in V0.
- Multiple compatible lots require explicit allocation.
- Allocation validation rejects mismatched units, missing quantity, negative/zero quantity, overdraw, and sum mismatch.
- Reversal math restores exactly what the original allocation deducted.

### Test Expectations

- Unit tests cover no lot, one lot, multiple lots, discarded lots, wrong-food lots, mismatched units, missing quantity, partial quantity, multi-lot exact sum, overdraw rejection, duplicate/applied state, and reversal math.

### Dependencies

- Issue 1 may define persistence shape, but pure rule tests can begin from documented types.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:cooking-mode`, `type:domain`, `area:tests`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 3: Apply Stock From One Confirmed Consumption Decision

### Goal

Implement the explicit stock application action that deducts selected Pantry Item lots for one confirmed consumption decision.

### Scope

- Reuse Issue 2 domain helpers for eligibility and validation.
- Require confirmed decision status before stock writes.
- Require explicit applied quantity and unit.
- Deduct from selected Pantry Item lots atomically.
- Write application, allocation, and audit history records.
- Preserve exactly-once behavior under retry and concurrent submission.
- Return deterministic already-applied or stale-lot behavior when appropriate.
- Keep the confirmed consumption decision status unchanged.

### Out of Scope

- Confirming consumption.
- Skipping consumption.
- Reversal.
- UI.
- Unit conversion.
- Batch application.

### Acceptance Criteria

- Applying stock updates only the selected Pantry Item lots.
- Applying stock writes traceable application/allocation history.
- Applying stock does not alter completed Cooking Session snapshots.
- Applying stock does not alter grocery lists.
- Applying stock does not create a duplicate application on retry.
- Overdraw, wrong household, skipped decision, undecided ingredient, active session, and incompatible unit inputs are rejected without partial writes.

### Test Expectations

- Data-layer tests cover success, duplicate retry, selected-lot-only update, no grocery mutation, skipped rejection, active-session rejection, cross-household rejection, unit mismatch, overdraw, multi-lot application, and race-safe already-applied behavior.
- Extend `scripts/verify-pantry-rls.mjs` for SQL-level household and duplicate protections.

### Dependencies

- Issue 1.
- Issue 2.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:cooking-mode`, `type:data-layer`, `priority:p1`, `size:large`

### Estimated Size

large

## Issue 4: Reverse One Stock Application

### Goal

Implement explicit reversal that restores the exact Pantry Item lot quantities from a previous stock application.

### Scope

- Add a reversal action for an applied stock application.
- Restore each affected Pantry Item lot by the original allocation quantity.
- Write reversal audit history with actor attribution where available.
- Prevent duplicate reversal.
- Preserve the original consumption decision and original application records.

### Out of Scope

- Editing original allocations.
- Creating replacement Pantry Item lots.
- Reopening or changing Cooking Sessions.
- Automatic reversal from recipe or decision edits.
- UI beyond any minimal action seam required for testing.

### Acceptance Criteria

- Reversal restores the exact selected lots and quantities from the original application.
- Reversal cannot run twice.
- Reversal does not change skipped decisions, confirmed decisions, or completed Cooking Session snapshots.
- Reversal history is queryable and household-scoped.
- Reversal rejects cross-household and stale/invalid inputs without partial writes.

### Test Expectations

- Data-layer tests cover successful reversal, duplicate reversal, exact restoration, cross-household rejection, no decision mutation, no grocery mutation, and audit actor capture.
- RLS verifier covers reversal access and duplicate prevention.

### Dependencies

- Issue 1.
- Issue 3.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:cooking-mode`, `type:data-layer`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Issue 5: Add Stock Application Review UI

### Goal

Expose confirmed-but-unapplied consumption decisions and let the user explicitly apply or reverse stock with understandable lot and quantity review.

### Scope

- Place the UI near completed Cooking Mode history or the existing consumption review surface.
- Show confirmed-but-unapplied, applied, reversed, skipped, and ineligible states clearly.
- For one eligible lot, show the preselected lot and require the user to apply explicitly.
- For multiple eligible lots, require lot selection or reviewed allocation.
- Show applied quantity and unit fields.
- Explain ineligible states such as no compatible pantry lot or incompatible units.
- Show reversal only for applied stock applications when reversal is in scope for the implementation slice.

### Out of Scope

- Automatic application during confirm.
- Batch apply.
- Unit conversion UI.
- Pantry rollup redesign.
- Dashboard widgets.
- Notifications.

### Acceptance Criteria

- Users can distinguish confirmed review from applied stock.
- Users can apply stock only after seeing the target lot/allocation and quantity.
- Users cannot apply skipped or ineligible decisions.
- Applied and reversed states remain visible after reload.
- Copy does not imply Cooking Mode completion or ingredient checks mutate pantry automatically.
- Mobile layout remains usable if allocation controls are introduced.

### Test Expectations

- Component or route tests cover each visible state and validation error where practical.
- Browser smoke covers confirm decision, explicit apply, pantry quantity update, skip write-free behavior, and reversal if implemented in the same slice.
- Add mobile smoke only if the UI uses a modal/drawer/allocation control.

### Dependencies

- Issue 2.
- Issue 3.
- Issue 4 if reversal is included in the UI slice.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:cooking-mode`, `area:ui`, `type:ui`, `priority:p1`, `size:large`

### Estimated Size

large

## Issue 6: Verify Stock Application End-To-End Behavior

### Goal

Lock down the reviewed cooking-to-pantry stock application path with focused regression coverage and browser validation.

### Scope

- Add any missing tests after Issues 1-5 are implemented.
- Verify confirm-without-apply remains write-free.
- Verify explicit apply changes only targeted Pantry Item lots.
- Verify skipped decisions remain write-free.
- Verify duplicate apply and duplicate reversal cannot change stock twice.
- Verify cross-household references fail.
- Verify no automatic unit conversion, fuzzy matching, background job, or hidden cooking completion deduction was introduced.

### Out of Scope

- New product behavior beyond the V0 path.
- Broad test-suite rewrites.
- Performance tuning unrelated to stock application.
- External tracker publication.

### Acceptance Criteria

- Critical review, apply, reversal, household, and idempotency paths are covered by automated tests.
- Browser validation demonstrates the real end-to-end path with clicks.
- The final diff contains no automatic pantry mutation from confirm/skip, Cooking Mode completion, grocery completion, or Already Have state.
- The implementation remains compatible with the review-first pantry/cooking boundary.

### Test Expectations

- Run the narrowest relevant tests while implementing.
- Before closeout, run:
  - `npm test -- src/lib/pantry/...`
  - `npm run verify:pantry-rls`
  - the focused pantry consumption stock-application Playwright smoke
  - `npm run verify`
- Capture any skipped checks with the exact reason.

### Dependencies

- Issue 1.
- Issue 2.
- Issue 3.
- Issue 4.
- Issue 5.

### Suggested Labels

`feature:smart-pantry`, `area:pantry`, `area:cooking-mode`, `area:tests`, `type:test`, `priority:p1`, `size:medium`

### Estimated Size

medium

## Assumptions

- Current Pantry Items remain the editable source of truth for active stock lots.
- Current pantry consumption decisions remain a review decision log.
- Confirmed consumption decisions already have actor attribution where authenticated.
- V0 can require exact units and still be useful because it preserves pantry integrity.
- If explicit multi-lot allocation proves too much UI for the first implementation, a single-lot-only implementation is acceptable only if the issue plan is updated before coding.

## Open Questions

- Should application/reversal audit extend `pantry_events` with actor attribution, or should stock application history be the canonical audit source?
- Future scope only: a later issue may explicitly opt into marking a Pantry Item `out` when an application zeroes its quantity. V0 should leave status changes to existing pantry controls unless the accepted implementation issue says otherwise.
- Should reversal be shipped in the same UI slice as apply, or can it land as the next immediate issue after apply?
