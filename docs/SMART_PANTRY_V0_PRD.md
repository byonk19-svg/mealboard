# Smart Pantry V0 PRD

## Problem Statement

MealBoard already supports recipes, weekly planning, grocery lists, staples, and Already Have grocery state, but it does not have a dedicated place to track what the household currently believes it has on hand. The user needs a lightweight Smart Pantry surface for managing current household stock without turning MealBoard into a warehouse system.

Smart Pantry V0 should answer practical pantry questions: what do we have, what is low, what is expiring soon, where is it grouped, and what changed recently. It should support manual pantry item management and a clear pantry event history, while avoiding barcode scanning, AI insights, automatic unit conversion, and automatic grocery or pantry automation.

## Solution

Smart Pantry V0 adds a manual pantry management surface built around Pantry Items and Pantry Events. A Pantry Item is a current household stock record linked to a Household Item identity. Pantry Items can be created, viewed, edited, and archived or discarded. They can be grouped by category, searched, marked low/out/in stock/unknown, given expiration dates, and reviewed through simple expiring-soon and low-stock views.

Pantry Events explain how pantry state changed. Smart Pantry V0 writes events for meaningful user actions such as created, adjusted, marked low, marked out, marked in stock, expiration updated, and discarded. Events explain changes, but the editable Pantry Item remains the current source of truth.

Smart Pantry V0 does not mutate grocery lists, deduct stock from Cooking Mode, scan barcodes, infer insights with AI, or automatically convert units. If quantities use different units, MealBoard shows them as entered and avoids fake precision.

## User Stories

1. As Brianna, I want to open a Smart Pantry page, so that I can see household stock in one place.
2. As Brianna, I want to add a Pantry Item manually, so that I can record something the household has on hand.
3. As Brianna, I want a Pantry Item to link to a Household Item, so that pantry stock uses the same identity language as recipes, staples, and groceries.
4. As Brianna, I want to choose an existing Household Item when adding pantry stock, so that I avoid duplicate names.
5. As Brianna, I want to create a Household Item during pantry entry when needed, so that missing items do not block pantry capture.
6. As Brianna, I want Pantry Items to support food and non-food household goods, so that I can track items like yogurt, tortillas, diapers, wipes, and paper towels.
7. As Brianna, I want Pantry Items to show a household-facing display name, so that the list is easy to scan.
8. As Brianna, I want Pantry Items to preserve package or product details, so that "Daisy sour cream, 16 oz" can still be tied to the Household Item "sour cream."
9. As Brianna, I want Pantry Items to support optional quantity and unit, so that exact counts can be tracked when useful.
10. As Brianna, I want Pantry Items to support a quantity note, so that I can write "half bag" or "one unopened box" when exact units are not helpful.
11. As Brianna, I want Smart Pantry not to require exact quantity, so that low-friction entry is possible.
12. As Brianna, I want Pantry Items to support stock status, so that I can mark items as in stock, low, out, or unknown.
13. As Brianna, I want to manually mark an item low, so that low-stock tracking works even without exact thresholds.
14. As Brianna, I want to manually mark an item out, so that I can keep pantry truth current.
15. As Brianna, I want to manually mark an item back in stock, so that corrections are fast.
16. As Brianna, I want low-stock state to be visible in the pantry list, so that I can quickly see what needs attention.
17. As Brianna, I want out-of-stock state to be visible separately from low stock, so that I know the difference between nearly gone and gone.
18. As Brianna, I want optional low-stock thresholds, so that countable items like eggs or pouches can be flagged more consistently.
19. As Brianna, I want threshold behavior to work only when units are directly comparable, so that MealBoard does not invent conversions.
20. As Brianna, I want no automatic unit conversion, so that the pantry does not create misleading quantities.
21. As Brianna, I want Pantry Items to support expiration dates, so that I can see what needs to be used soon.
22. As Brianna, I want expiring-soon items to be visible in a focused view or filter, so that I do not miss food that may spoil.
23. As Brianna, I want expired items to be distinct from expiring-soon items, so that I can treat them differently.
24. As Brianna, I want expiration to be date-based, so that pantry tracking stays practical.
25. As Brianna, I want an expiring-soon window with a sensible default, so that the pantry can highlight near-term items without configuration work.
26. As Brianna, I want to change an item's expiration date, so that I can correct mistakes or add missing dates.
27. As Brianna, I want Pantry Items to support optional storage location, so that I can distinguish pantry, fridge, freezer, counter, and other.
28. As Brianna, I want storage location to be separate from category, so that "Dairy" and "fridge" do not mean the same thing.
29. As Brianna, I want Pantry Items grouped by category, so that scanning the pantry feels similar to grocery organization.
30. As Brianna, I want category grouping to reuse existing MealBoard grocery/household categories where practical, so that MealBoard does not introduce a second conflicting taxonomy.
31. As Brianna, I want uncategorized pantry items to appear in a clear group, so that missing category data is visible but not blocking.
32. As Brianna, I want to filter or switch between category groups, so that a long pantry list stays manageable.
33. As Brianna, I want to search pantry items by Household Item name, so that I can quickly find whether we have something.
34. As Brianna, I want search to include display name and package notes, so that brand or package wording is still findable.
35. As Brianna, I want search to include category and storage location when useful, so that broad searches like "freezer" or "baby" can narrow the list.
36. As Brianna, I want search results to preserve low-stock and expiration indicators, so that search does not hide important status.
37. As Brianna, I want to edit Pantry Item details, so that current pantry truth stays correct.
38. As Brianna, I want edits to create Pantry Events, so that I can see what changed.
39. As Brianna, I want to archive or discard a Pantry Item, so that old stock can leave the active pantry.
40. As Brianna, I want discarded items to no longer appear as active stock, so that the active pantry reflects current belief.
41. As Brianna, I want discard actions to create Pantry Events, so that removals are explainable.
42. As Brianna, I want normal corrections to create adjustment events rather than deleting history, so that mistakes are traceable.
43. As Brianna, I want Pantry Events to show recent changes, so that I can understand why pantry state changed.
44. As Brianna, I want Pantry Events to be tied to the relevant Pantry Item, so that history is easy to inspect.
45. As Brianna, I want Pantry Events to include event type, timestamp, and optional note, so that each change has enough context.
46. As Brianna, I want Pantry Events to distinguish created, adjusted, status changed, expiration changed, and discarded changes, so that history is understandable.
47. As Brianna, I want Pantry Events to be domain-specific, so that pantry behavior is not hidden in a generic event log.
48. As Brianna, I want the active Pantry Item state to remain editable source of truth, so that I am not forced to reconstruct inventory from events.
49. As Brianna, I want pantry state to be household-scoped, so that pantry records belong to the current household.
50. As Brianna, I want Pantry Items to optionally carry meal profile context, so that baby-specific or Brianna-specific stock can be labeled without becoming exclusive ownership.
51. As Brianna, I want profile context to remain optional, so that normal household stock does not require a person.
52. As Brianna, I want Smart Pantry to support household goods, so that non-food recurring stock can be tracked.
53. As Brianna, I want non-food pantry items not to participate in recipe matching, so that diapers or paper towels do not affect cooking logic.
54. As Brianna, I want food-backed pantry items to be ready for future recipe matching, so that the model can grow later.
55. As Brianna, I want Smart Pantry V0 not to suggest AI insights, so that the first version stays explicit and predictable.
56. As Brianna, I want Smart Pantry V0 not to scan barcodes, so that manual entry and correction ship first.
57. As Brianna, I want Smart Pantry V0 not to add low-stock items to grocery lists automatically, so that grocery changes stay reviewed.
58. As Brianna, I want Smart Pantry V0 not to subtract stock after cooking, so that Cooking Mode and pantry remain separate for this slice.
59. As Brianna, I want Already Have grocery state not to create pantry stock automatically, so that grocery shortcuts do not corrupt inventory.
60. As Brianna, I want checked grocery items not to become pantry stock automatically, so that shopping completion does not fill the pantry with unreviewed records.
61. As Brianna, I want Smart Pantry to be usable on mobile, so that I can update stock while standing in the kitchen.
62. As Brianna, I want Smart Pantry to be comfortable on desktop, so that setup and cleanup are easier.
63. As Brianna, I want empty states for no pantry items, no low-stock items, and no expiring-soon items, so that each view explains what is missing.
64. As Brianna, I want clear validation when required fields are missing, so that pantry edits fail predictably.
65. As Brianna, I want duplicate pantry items to be allowed when they represent different lots, so that different expiration dates or storage locations are not forced together.
66. As Brianna, I want the pantry list to roll up related lots where useful, so that multiple yogurt containers do not make the list unreadable.
67. As Brianna, I want lot-level details to remain accessible from a rollup, so that I can inspect expiration and quantity differences.
68. As Brianna, I want expiring-soon rollups to show the nearest relevant expiration, so that the highest-risk item is visible first.
69. As Brianna, I want low-stock rollups to show low/out state clearly, so that status is visible even with multiple lots.
70. As Brianna, I want Smart Pantry V0 to avoid prepared leftovers, so that leftovers can be modeled separately later if needed.

## Implementation Decisions

- Smart Pantry V0 introduces Pantry Item CRUD as a post-MVP feature domain that extends existing MealBoard recipes, groceries, staples, and household item identity.
- Pantry Items represent current household stock lots. Multiple Pantry Items may exist for the same Household Item when expiration, storage location, opened state, package details, or category context differs.
- Pantry Items link to Household Item identity. The current implementation may continue using the existing foods-backed catalog until a broader table rename is justified.
- Pantry Items are household-scoped and may optionally carry meal profile context. Profile context means primarily intended for a profile, not exclusive ownership.
- Pantry Items support food and non-food household goods. Food-specific future behavior should only apply to food-backed items.
- Pantry Items should include stock status: in stock, low, out, and unknown.
- Pantry Items should support optional quantity, unit, and quantity note.
- Pantry Items should support optional package/product detail text.
- Pantry Items should support optional low-stock threshold quantity and unit.
- Low-stock threshold checks only apply when units match exactly or are trivially identical. Automatic unit conversion is out of scope.
- Pantry Items should support date-based expiration.
- Expiring-soon should be calculated from expiration date using a household-timezone date comparison and a simple configurable or default threshold.
- Expired should be distinct from expiring soon.
- Pantry Items should support optional storage location, separate from category.
- Category grouping should reuse the existing grocery/household category model where practical rather than introducing a parallel taxonomy.
- Uncategorized items should appear in an explicit uncategorized group.
- Search should cover Household Item name, pantry display/package text, notes, category, and storage location where available.
- Search should not hide status indicators; low-stock and expiring-soon markers remain visible in search results.
- Pantry Events explain changes to pantry state, but Pantry Item current state remains the editable source of truth.
- Smart Pantry V0 should write Pantry Events for creation, adjustment, status changes, expiration changes, category changes, storage changes, notes changes, and discard/archive actions when those actions are meaningful to the user.
- Pantry Events should include household, pantry item, event type, timestamp, optional before/after summary where practical, and optional note.
- Normal corrections should create adjustment events rather than deleting prior events.
- Pantry Events are domain-specific. Do not create a generic catch-all event table for pantry, grocery, cooking, and wrap-up behavior.
- Smart Pantry V0 does not create Pantry Intake Candidates from completed grocery lists.
- Smart Pantry V0 does not create Pantry Consumption Candidates from Cooking Sessions.
- Smart Pantry V0 does not add low-stock items to grocery lists automatically.
- Smart Pantry V0 does not subtract pantry stock from grocery generation.
- Smart Pantry V0 does not perform automatic unit conversion.
- Smart Pantry V0 does not include barcode scanning.
- Smart Pantry V0 does not include AI insights, AI predictions, or AI recipe matching.
- Smart Pantry V0 does not include prepared leftovers.
- Smart Pantry V0 should provide direct routes or navigation from Settings/Dashboard if appropriate, but it should not disturb existing grocery list lifecycle behavior.
- The implementation should reuse existing household/auth scoping, category, food/Household Item, form validation, and server action patterns.

## Testing Decisions

- Tests should cover user-visible pantry behavior and domain state transitions rather than implementation details.
- Pure pantry domain helpers should be covered with unit tests following existing Vitest patterns used for grocery, settings, recipes, weekly planning, baby, and dashboard helpers.
- Pantry Item normalization should be tested for required Household Item identity, optional quantity, optional notes, status, expiration date, storage location, category, and profile context.
- Stock status logic should be tested for in stock, low, out, unknown, manual status changes, and threshold-derived low status when units match exactly.
- Tests should prove that threshold logic does not perform automatic unit conversion.
- Expiring-soon logic should be tested for future expiration dates inside the window, future dates outside the window, today, expired dates, and missing expiration dates.
- Category grouping should be tested for categorized items, uncategorized items, multiple lots under the same Household Item, and rollup nearest expiration.
- Search should be tested for Household Item name, display/package text, notes, category name, storage location, low-stock markers remaining visible, and no-match empty state.
- Pantry Event behavior should be tested for create, edit/adjust, status change, expiration change, category change, storage change, discard/archive, and correction flows.
- Tests should prove Pantry Events do not have to reconstruct current pantry state.
- Tests should prove Smart Pantry V0 does not mutate grocery list items, Already Have state, Cooking Sessions, or recipe suggestions.
- Database/RLS verification should cover household scoping so one household cannot access another household's Pantry Items or Pantry Events.
- If migrations are added, local migration reset should be run when available.
- UI smoke coverage should use a focused browser flow if routes are implemented: add pantry item, edit status to low, set expiration, search, view category group, inspect event history, discard item.
- Mobile or narrow viewport smoke coverage should verify that pantry CRUD, search, low-stock, and expiring-soon views remain usable.
- Verification for implementation should include unit tests, lint, typecheck, build, migration verification if schema changes are added, and a focused browser smoke for the Smart Pantry route.

## Out of Scope

- Barcode scanning.
- AI insights.
- AI recipe matching.
- AI restock predictions.
- Automatic unit conversion.
- Automatic grocery list additions.
- Grocery list generation changes.
- Pantry deduction from Cooking Mode.
- Pantry Intake Candidates from completed grocery lists.
- Pantry Consumption Candidates from cooking sessions.
- H-E-B integration.
- Store aisle/location mapping.
- Price, budget, or cost tracking.
- Push notifications or reminders.
- Prepared leftovers.
- Nutrition or macro tracking.
- Full offline sync.
- Multi-household sharing changes beyond existing household scoping.
- Generic cross-domain event log.

## Further Notes

Smart Pantry V0 is intentionally manual. It should establish the pantry stock model, status model, category grouping, search, expiration visibility, and event history before coupling pantry to grocery completion, Cooking Mode, recipe matching, or planning.

The first implementation should be a narrow post-MVP slice:

1. Add Pantry Item and Pantry Event schema with household scoping and RLS.
2. Add manual Pantry Item create, edit, status update, and discard/archive behavior.
3. Add category grouping and uncategorized handling.
4. Add pantry search.
5. Add low-stock and out-of-stock indicators.
6. Add expiring-soon and expired indicators.
7. Add Pantry Event history for meaningful pantry changes.

Smart Pantry V0 should respect the review-first pantry boundary: it shows and records pantry truth, but it does not automatically change grocery lists, cooking sessions, recipes, or planning suggestions.

Future cooking-to-pantry stock writes must start from `docs/PANTRY_CONSUMPTION_STOCK_APPLICATION_V0_PRD.md` and remain separate from Smart Pantry V0 manual stock management.
