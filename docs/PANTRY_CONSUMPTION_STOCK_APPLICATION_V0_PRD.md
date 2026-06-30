# Pantry Consumption Stock Application V0 PRD

## Problem Statement

MealBoard can derive pantry consumption candidates from completed Cooking Mode sessions and record confirmed or skipped review decisions. A confirmed consumption decision currently means "this ingredient was reviewed as consumed"; it does not deduct pantry stock.

The next product risk is deciding how a reviewed consumption decision becomes a pantry stock write without corrupting lot-level pantry truth. Pantry stock is represented by active Pantry Item lots, while cooking consumption decisions are ingredient-level review rows. Stock application needs explicit rules for lot selection, quantity, unit compatibility, partial use, multi-lot allocation, audit history, and reversal before implementation begins.

## Solution

Pantry Consumption Stock Application V0 defines a second explicit action after a confirmed consumption decision: apply stock consumption. Confirming consumption and applying stock are separate lifecycle steps.

In V0, stock application must write against one or more explicit Pantry Item lots. MealBoard may preselect one lot only when exactly one active, same-household, food-matching, unit-compatible lot exists. If multiple compatible lots exist, the user must choose the lot or allocation. If no compatible lot exists, the confirmed decision stays confirmed but unapplied.

The applied quantity and unit must be structured and explicit at application time. V0 does not infer package sizes, convert units, or deduct from rollups. Multi-lot allocation is allowed only when the selected lot allocations add up exactly to the applied quantity and every selected lot has a compatible unit. Application and reversal must be exactly-once, actor-attributed, household-scoped, auditable, and safe under retry or concurrent use.

## User Stories

1. As Brianna, I want confirmed cooking consumption to stay review-only until I explicitly apply stock changes, so that a tap in Cooking Mode cannot silently corrupt pantry quantities.
2. As Brianna, I want to see which Pantry Item lot will be deducted before applying stock, so that duplicate lots with different expiration dates are not mixed up.
3. As Brianna, I want MealBoard to preselect a lot only when there is exactly one compatible choice, so that automatic deduction is deterministic.
4. As Brianna, I want to enter or confirm the actual quantity used, so that partial package use can be represented intentionally.
5. As Brianna, I want unit compatibility to be strict in V0, so that MealBoard does not invent conversions between unlike units.
6. As Brianna, I want stock application to fail without side effects when the selected lots cannot cover the applied quantity, so that pantry state stays consistent.
7. As Brianna, I want a stock application to be applied only once even if I retry after a slow network response, so that a confirmed decision cannot double-deduct inventory.
8. As Brianna, I want to reverse an accidental stock application, so that the exact deducted lots and quantities can be restored.
9. As Brianna, I want stock application and reversal to show who performed the action where MealBoard knows the signed-in user, so that pantry history is explainable.
10. As Brianna, I want skipped consumption decisions to remain write-free, so that skipping a candidate can never mutate pantry stock.

## Lifecycle Rules

### Candidate and Decision State

- Consumption candidates continue to be derived from completed Cooking Mode sessions and food-backed session ingredients.
- A skipped consumption decision is terminal for stock application and must never create pantry item changes.
- A confirmed consumption decision is eligible for stock application but does not apply stock by itself.
- A confirmed decision can be unapplied, applied, or reversed after application.
- In V0, reversal is terminal for that decision's stock application path. Reversed decisions must not be applied again; the user must create a new reviewed consumption decision through a future explicit correction flow if one is ever added.
- Reversal does not delete or rewrite the original consumption decision.

### Stock Application Entry

- Stock application requires an existing confirmed `pantry_consumption_decision`.
- The decision must belong to the active household.
- The underlying Cooking Session must remain completed.
- The referenced session ingredient must be food-backed.
- The application action must be explicit and separate from confirm/skip review actions.
- The UI must label unapplied confirmed decisions clearly so users understand that pantry quantities are unchanged.

### Lot Allocation

- Stock application writes against concrete Pantry Item lot ids, not a food-level rollup.
- Eligible lots must belong to the same household as the decision, be active and not discarded, have the same `food_id` as the consumed ingredient, have structured quantity and unit, and use a unit compatible with the applied quantity unit under the V0 exact-unit rule.
- MealBoard may auto-select a lot only when exactly one eligible lot exists.
- If multiple eligible lots exist, the user must choose the lot or allocation before stock can be applied.
- If no eligible lot exists, the confirmed decision remains confirmed and unapplied.
- Lot choices should render deterministically: nearest expiration first, then lowest quantity that can satisfy the application, then most recently updated, then stable id.
- Deterministic ordering is a display and defaulting rule; it must not silently allocate across multiple lots without explicit user review.

### Quantity and Unit Rules

- Applied quantity and applied unit are required for a stock write.
- The default proposed quantity may come from the completed Cooking Session ingredient snapshot when it is structured.
- Users may reduce or edit the applied quantity before application.
- V0 supports exact-unit compatibility only after normalizing trivial spelling or case variants already supported by the pantry domain.
- V0 must not convert across units such as oz to cup, tbsp to cup, count to package, blank unit to known unit, or free-text quantity notes to numeric quantities.
- If the confirmed ingredient has no structured quantity or compatible unit, it can stay confirmed but cannot be applied until the user supplies a compatible structured quantity and unit.
- Quantity deduction must never produce a negative lot quantity.
- If a selected lot reaches zero, the implementation may mark it out only if the product issue explicitly includes that behavior; otherwise quantity and event history are enough for V0.

### Multi-Lot Allocation

- Multi-lot allocation is allowed only as an explicit reviewed allocation.
- Each allocation row must identify one Pantry Item lot, quantity, and unit.
- All allocation units must be compatible with the applied unit.
- The allocation sum must equal the applied quantity.
- The application must be atomic: either all selected lot deductions and audit records are written, or none are.
- If a race causes any selected lot to have insufficient quantity before commit, the application must fail or return a deterministic already-changed state without partial writes.

### Idempotency and Concurrency

- A confirmed consumption decision can have at most one active stock application.
- Retrying the same application must not deduct stock twice.
- Concurrent attempts to apply the same decision must result in one successful application and deterministic already-applied behavior for the loser.
- Applying stock must protect the affected lot rows at the database/data-access boundary so overdraw cannot happen under concurrent use.
- Reversal must also be exactly-once.
- A reversed application remains historical and cannot be replaced by a new application for the same decision in V0.

### Reversal

- Reversal is additive: it creates a reversal record or event linked to the original stock application.
- Reversal must restore the exact lots and quantities deducted by the original application.
- Reversal must not infer replacement lots or create a new Pantry Item unless a later product rule explicitly allows that.
- Reversal of an already reversed application must be rejected or treated as already reversed without changing stock again.
- Reversal must not change the original consumption decision status.
- Reversal is terminal for the stock application path in V0; it does not return the decision to an applyable state.
- Reversal must be visible in pantry history and the consumption review surface where practical.

### Audit and Actor Attribution

- Stock application and reversal must record the household, the acting user when authenticated, timestamps, the source consumption decision, affected pantry item lots, applied quantities, and before/after quantity summaries.
- Pantry Events may be extended to carry actor attribution, or a dedicated stock application history table may be added. The implementation issue must choose one approach before code changes begin.
- Audit records must be enough to explain why a lot quantity changed without reconstructing active pantry state from events.
- Service-role or migration-created rows must remain safe by allowing nullable actor attribution only where authenticated actor capture is not available.

### Household and RLS Boundaries

- Every stock application, allocation, and reversal record must be household-scoped.
- Foreign keys must prevent linking a decision from one household to a Pantry Item lot from another household.
- RLS must allow authenticated household members to read and create only their household stock application records.
- Cross-household lot references, decision references, and reversal references must be rejected or hidden.
- The existing `public.is_household_member(household_id)` pattern and composite household foreign keys should be reused.

## Acceptance Criteria

- Confirming a consumption candidate still records only a review decision and does not mutate pantry stock.
- Skipping a consumption candidate cannot create, update, or reverse pantry stock.
- A confirmed decision can be stock-applied only through a separate explicit action.
- Stock application requires explicit Pantry Item lot allocation.
- Auto-selection occurs only when exactly one eligible lot exists.
- Multiple compatible lots require user-reviewed lot selection or allocation.
- Application requires structured applied quantity and unit.
- V0 performs no automatic unit conversion.
- Multi-lot allocation is atomic and the allocation sum must exactly equal the applied quantity.
- No lot can be overdrawn below zero.
- The same confirmed decision cannot be applied twice.
- Reversal restores the exact original lot quantities and cannot be run twice.
- Reversed applications are terminal in V0 and cannot be re-applied from the same decision.
- Application and reversal are actor-attributed where an authenticated actor is available.
- Household RLS and composite foreign keys prevent cross-household stock writes.
- Browser-visible copy makes confirmed-but-unapplied and applied/reversed states distinguishable.
- The final implementation contains no hidden stock deduction from Cooking Mode completion, ingredient readiness checks, grocery completion, or Already Have state.

## Testing Decisions

- Add pure rule tests before data writes for eligibility, exact-unit compatibility, allocation sums, overdraw rejection, idempotency states, and reversal math.
- Extend pantry data tests for confirmed-without-apply, apply success, duplicate apply, skipped write-free behavior, multi-lot allocation, race-safe already-applied behavior, and reversal.
- Extend `scripts/verify-pantry-rls.mjs` rather than creating a parallel verifier.
- RLS verification must cover same-household application, cross-household lot rejection, skipped/undecided decision rejection, active-session rejection, overdraw rejection, duplicate application, invalid reversal, and actor capture.
- Add a focused browser smoke only when UI is implemented. The smoke should confirm one decision, explicitly apply stock to a lot or allocation, verify `/pantry` reflects only the targeted lot changes, skip one candidate, and verify skipped stock remains unchanged.
- Add mobile smoke coverage only if the stock-application UI introduces modal, drawer, or allocation controls that could break on phone width.
- Before closeout of an implementation slice, run focused pantry tests, `npm run verify:pantry-rls`, the relevant pantry consumption E2E smoke, and `npm run verify`.

## Out of Scope

- Automatic pantry deduction from Cooking Mode completion.
- Automatic pantry deduction from ingredient readiness checks.
- Automatic pantry deduction from grocery completion or Already Have state.
- Applying stock from skipped or undecided consumption candidates.
- Automatic unit conversion.
- Package-size inference.
- Fuzzy name/category matching for stock application.
- Applying stock to non-food pantry items.
- Background jobs, reminders, notifications, AI suggestions, barcode scanning, H-E-B integration, or price behavior.
- Generic cross-domain event logging.
- Prepared-leftover inventory.

## Further Notes

Pantry Consumption Stock Application V0 is a review-first slice. After the schema, rules, data-layer apply, and data-layer reversal issues, the remaining implementation should expose those states through an explicit review UI and then lock down the full path with focused regression coverage.

If the implementation discovers that V0 cannot support safe partial quantities or multi-lot allocation without a larger UI, the safe fallback is single-lot explicit application only. The fallback still must keep confirm/skip review actions write-free.
