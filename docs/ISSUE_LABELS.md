# MealBoard Issue Label Vocabulary

Use these labels for MealBoard implementation issues, PRD follow-ups, and docs tasks. The vocabulary is intentionally small and boring so future issue generation stays consistent.

## Labeling Rules

- Every issue should have one feature label when applicable.
- Every implementation issue should have at least one area label.
- Every issue should have one type label.
- Every issue should have one priority label.
- Every issue should have one size label.
- Avoid creating new labels unless the existing vocabulary is clearly insufficient.
- Prefer boring, reusable labels over overly specific labels.

## Feature Labels

Feature labels identify the product feature or PRD stream an issue belongs to. Use one feature label when the work clearly belongs to a feature.

| Label | When to use | Examples |
| --- | --- | --- |
| `feature:cooking-mode` | Use for Cooking Mode V0 work around manual recipe execution, Recipe Steps, Cooking Sessions, ingredient readiness, step progress, timers, and session persistence. | Add Recipe Step schema; build Cooking Session lifecycle; add in-app Cooking Timers; add resume active session entry point. |
| `feature:smart-pantry` | Use for Smart Pantry V0 work around Pantry Item CRUD, category grouping, search, low-stock, expiring-soon, and Pantry Events. | Add Pantry Item schema; build pantry search; add low-stock filter; show Pantry Event history. |

## Area Labels

Area labels identify the part of the codebase or product surface affected. Implementation issues should usually have at least one area label, and may have more when the work crosses boundaries.

| Label | When to use | Examples |
| --- | --- | --- |
| `area:recipes` | Use when the work touches saved recipes, Recipe Ingredients, Recipe Steps, recipe detail/edit flows, recipe status, or recipe review handoff. | Add reviewed Recipe Steps; convert freeform instructions into step candidates; show Start Cooking on recipe detail. |
| `area:pantry` | Use when the work touches Pantry Items, Pantry Events, stock status, low-stock, expiration, storage location, or pantry search/grouping. | Add Pantry Item CRUD; implement expiring-soon filter; record Pantry Event on status change. |
| `area:grocery-list` | Use when the work touches grocery list generation, grocery item state, Already Have behavior, source context, or shopping views. | Confirm Smart Pantry V0 does not mutate grocery items; add future restock handoff issue; document Already Have boundary. |
| `area:database` | Use when the work adds or changes schema, migrations, database constraints, indexes, enums, or seed data. | Add `pantry_items`; add `cooking_sessions`; create index for pantry expiration queries. |
| `area:ui` | Use when the work changes pages, forms, components, layout, responsive behavior, or user-facing state. | Build Smart Pantry page; add Cooking Mode timer controls; add empty state for no pantry items. |
| `area:tests` | Use when the main work is test coverage, smoke tests, test fixtures, or test helpers. Also use as a secondary label when implementation includes substantial test harness work. | Add Cooking Session lifecycle tests; add pantry search unit tests; add Playwright smoke for Smart Pantry CRUD. |
| `area:rls` | Use when the work touches Supabase Row Level Security, grants, household scoping policies, or access-control verification. | Add RLS for `pantry_events`; verify household members cannot read another household's pantry; grant authenticated access to new tables. |
| `area:docs` | Use when the work changes durable documentation, PRDs, ADRs, task plans, README guidance, or issue-generation docs. | Add Cooking Mode V0 PRD; add Smart Pantry V0 PRD; update issue label vocabulary. |

## Type Labels

Type labels identify the kind of work. Every issue should have exactly one primary type label.

| Label | When to use | Examples |
| --- | --- | --- |
| `type:prd` | Use for product requirements, feature scoping, acceptance criteria, or PRD refinement work. | Write Cooking Mode V0 PRD; revise Smart Pantry V0 out-of-scope list. |
| `type:schema` | Use for database shape, migrations, enums, constraints, indexes, or RLS schema-adjacent work. | Add pantry stock status enum; add `recipe_steps`; add `cooking_timers`. |
| `type:data-layer` | Use for server actions, data-fetching helpers, persistence logic, state transition helpers, or pure domain modules. | Implement pantry item normalization; build session snapshot creation; add timer state transition helper. |
| `type:ui` | Use for user-facing pages, components, forms, empty states, responsive layout, and interaction flows. | Build Cooking Mode page; add Pantry Item form; add expiring-soon panel. |
| `type:test` | Use when the issue is primarily about test coverage or verification infrastructure. | Add Playwright smoke for Cooking Mode resume; add unit tests for low-stock threshold logic. |
| `type:bug` | Use for correcting broken, inconsistent, or unsafe behavior. | Fix Cooking Session completion updating abandoned sessions; fix pantry search hiding low-stock markers. |
| `type:refactor` | Use for internal restructuring that should preserve behavior and make future work easier. | Extract pantry grouping helper; move Cooking Timer transitions into a pure module. |
| `type:docs` | Use for documentation-only issues. | Add issue label vocabulary; document review-first pantry boundary; update CODEX task prompts. |

## Priority Labels

Priority labels describe sequencing and impact. Every issue should have exactly one priority label.

| Label | When to use | Examples |
| --- | --- | --- |
| `priority:p0` | Use for blockers, correctness issues, data integrity risks, access-control risks, or work required before any dependent issue can proceed. | Add household-scoped RLS before exposing Pantry Items; fix Cooking Session completion mutating pantry; resolve migration failure. |
| `priority:p1` | Use for core V0 functionality required for the feature to be useful. | Add Pantry Item CRUD; implement Cooking Session lifecycle; add Recipe Step review flow; add low-stock and expiring-soon views. |
| `priority:p2` | Use for follow-up polish, secondary views, nice-to-have coverage, or work that can wait until after the core path works. | Add extra empty-state copy; improve pantry category count display; add a narrow mobile smoke after basic UI passes. |

## Size Labels

Size labels estimate implementation effort and review complexity. Every issue should have exactly one size label.

| Label | When to use | Examples |
| --- | --- | --- |
| `size:small` | Use for narrow, low-risk changes that fit in one small diff and have limited test scope. | Add an empty state; add one pure helper test; update docs for a known label rule. |
| `size:medium` | Use for a focused feature slice touching a few files, usually with schema or UI plus tests but limited cross-domain behavior. | Add Pantry Item CRUD; add Cooking Timer state helper and UI controls; add Recipe Step conversion review. |
| `size:large` | Use for work that crosses schema, data layer, UI, and browser verification, or changes multiple lifecycle states. Split large issues when possible. | Build full Cooking Session start/resume/complete flow; add Smart Pantry schema, page, search, events, and smoke coverage in one slice. |

## Common Label Combinations

- Cooking Mode schema issue: `feature:cooking-mode`, `area:database`, `area:recipes`, `type:schema`, `priority:p1`, `size:medium`.
- Cooking Mode session UI issue: `feature:cooking-mode`, `area:recipes`, `area:ui`, `type:ui`, `priority:p1`, `size:medium`.
- Smart Pantry schema issue: `feature:smart-pantry`, `area:pantry`, `area:database`, `area:rls`, `type:schema`, `priority:p1`, `size:medium`.
- Smart Pantry search issue: `feature:smart-pantry`, `area:pantry`, `area:ui`, `type:ui`, `priority:p1`, `size:medium`.
- Docs-only issue: `area:docs`, `type:docs`, `priority:p2`, `size:small`.
