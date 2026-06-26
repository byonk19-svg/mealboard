# MealBoard MVP Readiness

This document captures the current private family MVP state after the rule-based suggestions, smart swaps, Plan Week profile view, saved-food administration, Preferences food creation, actionable dashboard queue, baby weekly-plan persistence, baby Try This status handoff, pending grocery-change review/apply flow, household member lifecycle prep, owner transfer, mobile grocery spotty-service retry, generic grocery-list copy support, emergency grocery backup text, recent completed-list access and unavailable-history recovery, PWA install metadata, weekly wrap-up expansion, review-informed suggestion scoring, structured recipe URL import/private Chrome capture, section-aware recipe instructions, hardening, and E2E smoke slices. It is a handoff snapshot for future Codex work so the next phase can build from known product truth instead of rediscovering the app.

## Current Status

MealBoard is usable as a private family MVP for the core planning and grocery loop:

```txt
Recipes -> Plan Week -> Staples -> Grocery List -> Dashboard
```

The latest verified flow covers:

- Create and edit a recipe with structured ingredients, nutrition estimates, tags, and profile approvals.
- Import a structured recipe URL or private Chrome capture into Recipe Import Review, preserve readable instruction sections when available, correct flagged rows, and save only reviewed recipe fields plus source attribution.
- Configure the active weekly plan with adult work/off days and weekly goals.
- Review and add rule-based adult meal suggestion drafts.
- Let recent weekly wrap-up recipe ratings, skipped meals, too-much-leftover tags, and leftover-friendly tags influence rule-based suggestion ranking.
- Add saved recipes to specific days, profiles, and meal slots.
- Review the week by profile, including clear Baby Meal 1/2 rows.
- Approve planned meals for grocery generation.
- Review Baby Meal 1/2 routine suggestions on Plan Week and `/settings/baby`.
- Apply Baby Meal 1/2 to the selected planning week as explicit baby plan slots.
- Select active staples for the week.
- Generate a grocery list from approved planned meals, approved persisted baby foods, and selected staples.
- Review and apply pending grocery add/remove/keep updates when a protected grocery list would differ from the current plan.
- Open a smart swap panel, review ranked replacements, see grocery add/remove/keep impact, and confirm a swap without silently changing protected grocery lists.
- Use Shopping, Profile, and Meal grocery views.
- Add a manual grocery item with household/profile context and source note.
- Toggle checked and already-have item states, including local pending-state preservation, bounded retry backoff, manual retry, and terminal feedback for item-state requests that can no longer apply.
- Copy a generic plain-text grocery list grouped by category for manual use outside MealBoard, or reveal the emergency backup text when clipboard/PWA behavior is unreliable.
- Advance a grocery list through Draft -> Finalized -> Shopping Started -> Completed.
- Reopen a recent completed grocery list for source context or copying without changing current shopping state.
- Recover from stale or unavailable completed grocery list links with a clear path back to the current grocery list and recent completed lists.
- Open the optional weekly wrap-up after completed shopping.
- Capture made/skipped meal outcomes, leftovers, source-aware unused grocery notes, and hand source-aware staple adjustment intent to Settings for explicit review before any staple changes.
- Confirm Dashboard reflects current week planning, grocery status, next best action, setup-aware and calorie-guidance needs-attention items, and wrap-up entry when eligible.
- Filter the recipe library by search text, recipe status, planning approval, and nutrition-review needs.
- Link an existing auth user to the current household from `/settings/household` when signed in as an owner, transfer ownership to a non-owner member, and remove a non-owner member from that household.
- Create, edit, archive, and restore household foods from `/settings/foods`.
- Serve PWA install metadata and icon assets without adding offline/service-worker behavior.
- Run unauthenticated Playwright auth-boundary smoke coverage plus credential-gated core-loop, mobile grocery, recipe import, household member lifecycle, extension capture, and related settings smokes.

## Manual Smoke Checklist

Use a linked local household user. Do not commit `.env.local`, `.env.cloud.local`, service-role keys, access tokens, Supabase temp files, or smoke credentials.

1. Open `/recipes`.
2. Create a recipe with:
   - name
   - status approved or favorite
   - meal type
   - servings
   - at least one structured ingredient
   - calorie/protein estimates if known
   - one or more profile approvals
3. Open the created recipe, edit a small field, and save.
4. Open `/recipes/import`, load a structured recipe URL or use the private Chrome capture extension, review the imported draft, correct one flagged row, save it, and confirm the final recipe shows Recipe source attribution without storing the source page content.
5. Open `/plan-week`.
6. Select the active week.
7. Save adult work/off days and one weekly goal.
8. Add a saved recipe to a day/profile/meal slot.
9. If rule-based suggestions are available, add suggested meals and confirm they stay unapproved.
10. Approve at least one planned meal for groceries.
11. Apply Baby routine suggestions, approve at least one baby plan row if baby groceries should be included, and confirm Baby Meal 1/2 labels are clear.
12. Select at least one active staple and save selected staples.
13. Open a planned meal swap, review grocery impact, and cancel or confirm it.
14. Switch Plan Week to Profile view and confirm Brianna, Elaine, Baby, and Shared/Family sections are clear.
15. Generate the grocery list.
16. Open `/grocery-list`.
17. Confirm generated recipe items, approved baby foods, and selected staples appear with sensible quantities, categories, and source context.
18. Add a manual grocery item with a note/context.
19. Confirm Shopping, Profile, and Meal views still render.
20. Expand source context and confirm recipe/staple/baby/manual explanations are visible.
21. Toggle checked and already-have on an item. On mobile, simulate a failed item-state request and confirm the pending local state remains visible, then use Retry pending changes after service recovery.
22. Advance lifecycle one step at a time:
    - Draft -> Finalized
    - Finalized -> Shopping Started
    - Shopping Started -> Completed
23. Open `/dashboard`.
24. Confirm current week, planning status, grocery status, next best action, needs-attention queue, and wrap-up entry are reasonable.
25. After finalizing or starting shopping, change an approved planned meal, confirm Plan Week shows pending grocery changes, apply the reviewed grocery updates, and confirm manual items/check state are preserved where applicable.
26. Open the weekly wrap-up, save one meal outcome with leftover context if prompted, acknowledge unused groceries with a future staple adjustment if prompted, confirm Settings opens a review banner instead of changing staples automatically, or dismiss it.
27. Open `/settings/baby`, track a Try This food when one is available, and confirm it becomes a normal baby food status without adding it to groceries automatically.
28. Open `/settings/foods`, create a household food with defaults, archive it, and restore it.
29. Open `/settings/household` as the owner, link an existing unlinked auth user by email, transfer ownership to that member, sign in as the new owner, transfer ownership back, remove that non-owner member, then confirm the member no longer reaches household-scoped routes.
30. Open `/manifest.webmanifest` and confirm install icons are served.

## Known Local Environment Note

The local Supabase `supabase_vector_mealboard` container has previously entered a restart loop after a local reset. This was a local Docker/Supabase container issue, not an app migration failure.

If it blocks local Supabase startup or `supabase db reset`, remove only that container and let Supabase recreate it:

```powershell
docker rm -f supabase_vector_mealboard
supabase start
supabase db reset
```

Do not delete Docker volumes as part of this recovery, and do not remove unrelated containers.

## Dependency Audit Note

As of June 23, 2026, `npm audit --omit=dev` passes after aligning Next packages
to the current stable patch and applying a targeted PostCSS override for Next's
vendored dependency. Do not use `npm audit fix --force` without inspecting the
proposed tree.

## Deferred Features

These are intentionally out of scope for the current MVP unless a future task explicitly reopens them:

- AI meal planning or AI nutrition estimation
- H-E-B integration, H-E-B-specific export, aisle mapping, or price behavior
- Native iPhone or Android apps
- Full pantry inventory, barcode scanning, expiration tracking, or reminders
- Recipe photos, full recipe-link automation, and public Chrome Web Store extension release
- Full macro tracking, nutrition API integrations, strict warnings, or nutrition dashboards
- Baby nutrition, milk intake, and reaction tracking
- Email-delivered household invitations, role editing beyond owner transfer, and multi-household switching
- Full offline/PWA service-worker behavior
- Grocery history intelligence beyond recent completed-list access

## Next Phase Options

Good next slices should stay narrow and start from the verified MVP loop. Candidate directions:

- Member role editing beyond owner transfer and household switching
- Broader PWA/mobile offline resilience for grocery shopping beyond bounded item-state retry
- Email-delivered invitations if shared household use becomes frequent

Prefer one focused slice at a time, and keep cloud Supabase migration pushes as explicit approval points.
