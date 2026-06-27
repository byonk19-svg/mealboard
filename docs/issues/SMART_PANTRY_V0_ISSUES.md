# Smart Pantry V0 Implementation Issues

Source docs:

- `docs/SMART_PANTRY_V0_PRD.md`
- `docs/ISSUE_LABELS.md`
- `docs/adr/0001-review-first-pantry-and-cooking-boundaries.md`
- `CONTEXT.md`

This is a local issue plan only. Do not publish these issues to GitHub, Linear, or any external tracker unless explicitly requested later.

## Assumptions

- Smart Pantry V0 is post-MVP and manual-first. It records household stock truth, but it does not automate grocery, cooking, recipe matching, or planning behavior.
- The existing `foods` table remains the current implementation of Household Item identity until a broader rename is justified.
- Pantry Items are household-scoped stock lots. Multiple Pantry Items may point to the same Household Item when package, expiration, opened state, storage location, quantity, or category context differs.
- Pantry Events explain meaningful changes, but Pantry Item current state remains the editable source of truth.
- Category grouping should reuse existing grocery category data where practical instead of creating a second taxonomy.
- Low-stock status can be manually set and may be derived from optional thresholds only when units match exactly. Automatic unit conversion is out of scope.
- Expiration logic is date-based in the household timezone, with expired distinct from expiring soon.
- The primary Smart Pantry route is `/pantry`.
- Smart Pantry should appear in the main app navigation because it is a core household work surface, not only a settings surface.
- Smart Pantry V0 uses a fixed seven-day expiring-soon window unless an existing household setting is discovered during implementation.
- Smart Pantry V0 uses one discard/inactive lifecycle for stock leaving active pantry state. User-facing copy and Pantry Events can explain the reason; separate archive semantics can wait until a later need appears.
- Restock candidates are a later review workflow unless explicitly included by a future issue. Smart Pantry V0 must not automatically add low or out items to grocery lists.

## Resolved Product Decisions

- Route and navigation: use `/pantry` and add it to the main navigation.
- Expiring-soon default: use seven days in V0 unless an existing household setting already covers this exact need.
- Discard/archive lifecycle: use one inactive/discard lifecycle in V0 and preserve the action history through Pantry Events.

## Issue 1: Add Smart Pantry Schema and RLS Foundation

### Goal

Create the database foundation for household-scoped Pantry Items and Pantry Events with clear constraints, indexes, grants, and RLS.

### Scope

- Add schema for Pantry Items linked to household and Household Item identity through the existing `foods` model.
- Add stock status support for in stock, low, out, and unknown.
- Add optional quantity, unit, quantity note, package/product detail, low-stock threshold quantity/unit, expiration date, opened date/state if practical, storage location, grocery category, meal profile context, notes, and inactive/discarded state.
- Add schema for Pantry Events with event type, timestamp, pantry item, household, optional before/after summary, and optional note.
- Add household-scoped RLS, grants, constraints, and indexes for Pantry Items and Pantry Events.
- Add indexes for active pantry by household, item search/grouping, category grouping, stock status, expiration, and child events by pantry item.

### Out of Scope

- Pantry UI.
- Data-access helpers.
- Grocery list mutation.
- Pantry deduction from Cooking Mode.
- Barcode scanning, AI insights, automatic unit conversion, recipe matching, push notifications, or background work.

### Acceptance Criteria

- Migrations create Pantry Item and Pantry Event tables, enums or check constraints, indexes, grants, and RLS policies.
- Pantry Items require household ownership and a Household Item identity.
- Pantry Items may reference grocery category and meal profile only within the same household.
- Multiple Pantry Items can reference the same Household Item without violating uniqueness.
- Pantry Events cannot bypass parent Pantry Item household access.
- Active and inactive/discarded pantry state is represented explicitly enough for the data layer to hide discarded stock from active views.

### Test Expectations

- Run local migration verification when available.
- Add or update RLS/household verification following existing Supabase patterns.
- Verify cross-household access is blocked for both Pantry Items and Pantry Events.

### Dependencies

- None - can start immediately.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:database`
- `area:rls`
- `type:schema`
- `priority:p0`
- `size:medium`

### Estimated Size

medium

## Issue 2: Build Smart Pantry Domain and Data Access Helpers

### Goal

Add pure domain helpers and data-access functions for safe manual Pantry Item and Pantry Event behavior before building the UI.

### Scope

- Add input normalization for Pantry Item create and edit flows.
- Add helpers for stock status transitions, threshold-derived low state when units match exactly, and no-conversion behavior when units differ.
- Add helpers for expiring-soon and expired classification.
- Add helpers for category grouping, uncategorized handling, lot rollups, nearest expiration, and low/out rollup indicators.
- Add pantry search helpers covering Household Item name, display/package text, notes, category name, and storage location.
- Add data-access functions for create, read, update, discard/archive, and event history.
- Ensure meaningful user actions write Pantry Events while current Pantry Item state remains the source of truth.

### Out of Scope

- User-facing Smart Pantry pages.
- Grocery list creation or mutation.
- Cooking Mode pantry deduction.
- Barcode scanning, AI insights, automatic unit conversion, recipe matching, or restock automation.

### Acceptance Criteria

- Pantry Item inputs are normalized consistently and reject missing required Household Item identity.
- Create, edit, status change, expiration change, category change, storage change, notes change, and discard/archive flows can write appropriate Pantry Events.
- Low-stock threshold logic only compares values when units match exactly or are trivially identical.
- Expired and expiring-soon classification is deterministic for today, future dates inside/outside the window, missing dates, and past dates.
- Search and grouping helpers preserve low-stock and expiration markers.

### Test Expectations

- Unit tests cover Pantry Item normalization.
- Unit tests cover stock statuses, manual status changes, threshold-derived low state, and no automatic unit conversion.
- Unit tests cover expiring-soon and expired classification.
- Unit tests cover category grouping, uncategorized grouping, rollups, nearest expiration, and low/out indicators.
- Unit tests cover event creation decisions without requiring events to rebuild current pantry state.

### Dependencies

- Issue 1.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:database`
- `area:tests`
- `type:data-layer`
- `priority:p0`
- `size:medium`

### Estimated Size

medium

## Issue 3: Add Smart Pantry Route, Navigation, and Read Model

### Goal

Expose a Smart Pantry entry point that lists active pantry stock in a scan-friendly read view.

### Scope

- Add the primary Smart Pantry route following existing app routing conventions.
- Add app navigation or settings entry point as appropriate for the existing shell.
- Load active Pantry Items with Household Item names, grocery category names, meal profile context, stock status, quantity display, storage location, expiration, and latest event summary where practical.
- Group items by category with an explicit uncategorized group.
- Show lot rollups where useful while preserving access to lot-level details.
- Add empty states for no pantry items and uncategorized pantry items.

### Out of Scope

- Create/edit forms.
- Search controls.
- Low-stock focused view.
- Expiring-soon focused view.
- Event history detail UI.
- Grocery, cooking, recipe matching, barcode scanning, AI insights, or automatic unit conversion.

### Acceptance Criteria

- A household member can open the Smart Pantry route and see active Pantry Items grouped by category.
- Food or household goods sharing the same Household Item can be presented without losing lot-level information.
- Low, out, expired, and expiring-soon markers remain visible in the list when data exists.
- Discarded or archived Pantry Items do not appear in the active stock list.
- The page has usable empty states and follows existing responsive layout conventions.

### Test Expectations

- Component or route tests cover grouped active pantry display and empty state behavior where existing test patterns support it.
- Add helper-level tests if grouping or read model formatting is not already covered by Issue 2.

### Dependencies

- Issue 1.
- Issue 2.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:ui`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 4: Add Manual Pantry Item Create and Edit Forms

### Goal

Let users manually add and maintain Pantry Items without requiring exact quantities or automation.

### Scope

- Add create and edit forms for Pantry Items.
- Allow choosing an existing Household Item and creating a new Household Item during pantry entry if that pattern fits existing app conventions.
- Capture display/package details, quantity, unit, quantity note, stock status, threshold quantity/unit, expiration date, storage location, grocery category, meal profile context, and notes.
- Validate required fields and household-scoped references.
- Write Pantry Events for create and meaningful edits.
- Support duplicate Pantry Items for different lots of the same Household Item.

### Out of Scope

- Barcode scanning.
- Automatic unit conversion.
- Automatic category inference beyond existing Household Item defaults.
- Grocery list mutation.
- Cooking Mode pantry deduction.
- Recipe matching.

### Acceptance Criteria

- Users can add a Pantry Item manually with minimum required fields.
- Users can edit existing Pantry Item details.
- Exact quantity is optional, and quantity notes such as "half bag" are accepted.
- Creating or editing a Pantry Item records meaningful Pantry Events.
- Validation errors are clear when required fields or invalid references are submitted.
- Duplicate lots for the same Household Item are allowed.

### Test Expectations

- Unit tests cover form input normalization and validation.
- Server action or data-access tests cover create, edit, and event writes where existing patterns support them.
- Add UI tests for required field errors if the repo has route/form test patterns.

### Dependencies

- Issue 1.
- Issue 2.
- Issue 3.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:ui`
- `area:tests`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 5: Add Pantry Search and Category Filtering

### Goal

Make the pantry list manageable through search and category-focused filtering without hiding important stock signals.

### Scope

- Add search to the Smart Pantry page.
- Search Household Item name, pantry display/package text, notes, category name, and storage location.
- Add category filtering or category-group switching based on existing UI conventions.
- Preserve low-stock, out-of-stock, expired, and expiring-soon markers in search results.
- Add no-match empty state.

### Out of Scope

- Full-text search infrastructure unless already required by existing patterns.
- Recipe matching.
- AI insights.
- Store aisle mapping.
- Automatic category assignment.

### Acceptance Criteria

- Searching by Household Item name finds matching Pantry Items.
- Searching by package/display text, notes, category, or storage location works when those fields are present.
- Search results keep status and expiration indicators visible.
- Users can narrow by category or switch category groups.
- Empty search results are clear and do not imply pantry stock was deleted.

### Test Expectations

- Unit tests cover search matching across supported fields and no-match behavior.
- UI or route tests cover search query behavior if existing patterns support it.
- Tests verify low-stock and expiration markers remain available after filtering.

### Dependencies

- Issue 2.
- Issue 3.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:ui`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 6: Add Low-Stock and Out-of-Stock Views

### Goal

Surface low and out pantry stock clearly while keeping grocery-list changes reviewed and manual.

### Scope

- Add low-stock and out-of-stock indicators to the pantry list and detail/edit surfaces.
- Add a focused low/out view, filter, or tab.
- Support manually marking an item low, out, in stock, or unknown.
- Apply optional threshold-derived low state only when the Pantry Item quantity and threshold units match exactly.
- Add empty state for no low/out items.
- Include a V1 follow-up note or placeholder for reviewed restock candidates without creating grocery items automatically.

### Out of Scope

- Automatically adding low/out items to grocery lists.
- Grocery generation changes.
- Pantry restock automation.
- Unit conversion.
- AI restock predictions.

### Acceptance Criteria

- Low and out states are visually distinct from in-stock and unknown states.
- Users can manually update stock status.
- Threshold-derived low state does not convert units.
- No grocery list rows are created, updated, checked, or deleted by low-stock behavior.
- Empty low/out state is clear.

### Test Expectations

- Unit tests cover stock status transitions and threshold behavior.
- Tests prove grocery list state is not mutated by Smart Pantry low/out behavior.
- UI tests cover low/out filtering if existing route test patterns support it.

### Dependencies

- Issue 2.
- Issue 3.
- Issue 4.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:ui`
- `area:grocery-list`
- `area:tests`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 7: Add Expiring-Soon and Expired Views

### Goal

Highlight pantry lots that are expired or close to expiration without adding notifications or recipe suggestions.

### Scope

- Add expired and expiring-soon indicators to pantry list and item detail/edit surfaces.
- Add a focused expiring-soon/expired view, filter, or tab.
- Use a sensible default expiring-soon window if no household setting exists.
- Sort expiring items by nearest expiration.
- Ensure rollups show the nearest relevant expiration while preserving lot-level details.
- Add empty state for no expiring-soon items.

### Out of Scope

- Push notifications or reminders.
- Recipe matching or use-soon suggestions.
- AI insights.
- Prepared leftovers.
- Background jobs.

### Acceptance Criteria

- Expired items are distinct from expiring-soon items.
- Items expiring today are handled deterministically.
- Items without expiration dates are not treated as expiring.
- Expiring rollups show the nearest relevant expiration.
- The focused view is usable on mobile and desktop.

### Test Expectations

- Unit tests cover today, expired, inside-window, outside-window, and missing expiration cases.
- Unit tests cover rollup nearest expiration.
- UI or route tests cover the focused expiring view if existing patterns support it.

### Dependencies

- Issue 2.
- Issue 3.
- Issue 4.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:ui`
- `area:tests`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 8: Add Pantry Event History and Discard Lifecycle

### Goal

Make Pantry Events visible and complete the manual lifecycle for stock leaving active pantry state.

### Scope

- Add Pantry Event history to Pantry Item detail or edit surfaces.
- Show event type, timestamp, optional note, and before/after summary where practical.
- Add discard/archive action for Pantry Items.
- Ensure discarded or archived items leave active pantry views but remain inspectable where appropriate.
- Write Pantry Events for discard/archive and normal corrections.
- Prevent hard deletion from being the normal user-facing correction path.

### Out of Scope

- Generic cross-domain event log.
- Grocery intake events from completed grocery lists.
- Cooking consumption events from Cooking Sessions.
- Recipe matching or planning suggestions.
- Notifications.

### Acceptance Criteria

- Users can inspect recent Pantry Events for a Pantry Item.
- Discard/archive removes stock from active pantry views.
- Discard/archive writes a Pantry Event.
- Corrections write adjustment events and update current Pantry Item state.
- The UI does not require reconstructing current pantry state from events.

### Test Expectations

- Unit or data-access tests cover create, edit/adjust, status change, expiration change, category change, storage change, notes change, and discard/archive events.
- Tests verify discarded items are hidden from active views.
- Tests verify events remain readable for authorized household members.

### Dependencies

- Issue 1.
- Issue 2.
- Issue 4.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:ui`
- `area:database`
- `type:ui`
- `priority:p1`
- `size:medium`

### Estimated Size

medium

## Issue 9: Add Smart Pantry End-to-End Verification

### Goal

Add focused verification that proves the Smart Pantry V0 path works end to end and stays inside the manual pantry boundary.

### Scope

- Add focused browser smoke coverage for the Smart Pantry route if routes are implemented.
- Cover adding a Pantry Item, editing status to low, setting expiration, searching, viewing category grouping, inspecting event history, and discarding an item.
- Add narrow or mobile viewport smoke coverage for create/edit, search, low-stock, and expiring-soon views.
- Add regression tests proving Smart Pantry V0 does not mutate grocery list items, Already Have state, Cooking Sessions, or recipe suggestions.
- Document any verification gaps if the repo does not have a suitable test pattern.

### Out of Scope

- Broad visual redesign.
- External tracker publication.
- Barcode scanning, AI insights, automatic unit conversion, recipe matching, pantry deduction, or grocery automation.

### Acceptance Criteria

- The core Smart Pantry V0 browser path is covered by a repeatable smoke test.
- Mobile or narrow viewport usability is verified for the key path.
- Existing unit, lint, typecheck, build, and migration checks pass.
- Tests explicitly protect the review-first boundary against grocery, cooking, and recipe side effects.

### Test Expectations

- Run the narrowest relevant tests for changed pantry helpers and route behavior.
- Run full repo checks expected for MealBoard before final submission: unit tests, lint, typecheck, build, migration verification when schema changes exist, and `git diff --check`.
- Capture any browser verification command and result in the implementation summary.

### Dependencies

- Issue 3.
- Issue 4.
- Issue 5.
- Issue 6.
- Issue 7.
- Issue 8.

### Suggested Labels

- `feature:smart-pantry`
- `area:pantry`
- `area:ui`
- `area:tests`
- `type:test`
- `priority:p1`
- `size:medium`

### Estimated Size

medium
