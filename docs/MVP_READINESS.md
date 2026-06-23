# MealBoard MVP Readiness

This document captures the current private family MVP state after the rule-based suggestions, smart swaps, Plan Week profile view, saved-food administration, Preferences food creation, actionable dashboard queue, baby weekly-plan persistence, baby Try This status handoff, pending grocery-change review/apply flow, household member lifecycle prep, owner transfer, mobile grocery spotty-service auto-retry, PWA install metadata, weekly wrap-up expansion, review-informed suggestion scoring, hardening, and E2E smoke slices. It is a handoff snapshot for future Codex work so the next phase can build from known product truth instead of rediscovering the app.

## Current Status

MealBoard is usable as a private family MVP for the core planning and grocery loop:

```txt
Recipes -> Plan Week -> Staples -> Grocery List -> Dashboard
```

The latest verified flow covers:

- Create and edit a recipe with structured ingredients, nutrition estimates, tags, and profile approvals.
- Configure the active weekly plan with adult work/off days and weekly goals.
- Review and add rule-based adult meal suggestion drafts.
- Let recent weekly wrap-up recipe ratings, skipped meals, and leftover tags influence rule-based suggestion ranking.
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
- Toggle checked and already-have item states, including automatic local retry for a failed mobile item-state request when the browser returns online or regains focus.
- Advance a grocery list through Draft -> Finalized -> Shopping Started -> Completed.
- Open the optional weekly wrap-up after completed shopping.
- Capture made/skipped meal outcomes, leftovers, source-aware unused grocery notes, and hand source-aware staple adjustment intent to Settings for explicit review before any staple changes.
- Confirm Dashboard reflects current week planning, grocery status, next best action, setup-aware and calorie-guidance needs-attention items, and wrap-up entry when eligible.
- Filter the recipe library by search text, recipe status, planning approval, and nutrition-review needs.
- Link an existing auth user to the current household from `/settings/household` when signed in as an owner, transfer ownership to a non-owner member, and remove a non-owner member from that household.
- Create, edit, archive, and restore household foods from `/settings/foods`.
- Serve PWA install metadata and icon assets without adding offline/service-worker behavior.
- Run unauthenticated Playwright auth-boundary smoke coverage plus credential-gated core-loop and mobile grocery smokes.

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
4. Open `/plan-week`.
5. Select the active week.
6. Save adult work/off days and one weekly goal.
7. Add a saved recipe to a day/profile/meal slot.
8. If rule-based suggestions are available, add suggested meals and confirm they stay unapproved.
9. Approve at least one planned meal for groceries.
10. Apply Baby routine suggestions, approve at least one baby plan row if baby groceries should be included, and confirm Baby Meal 1/2 labels are clear.
11. Select at least one active staple and save selected staples.
12. Open a planned meal swap, review grocery impact, and cancel or confirm it.
13. Switch Plan Week to Profile view and confirm Brianna, Elaine, Baby, and Shared/Family sections are clear.
14. Generate the grocery list.
15. Open `/grocery-list`.
16. Confirm generated recipe items, approved baby foods, and selected staples appear with sensible quantities, categories, and source context.
17. Add a manual grocery item with a note/context.
18. Confirm Shopping, Profile, and Meal views still render.
19. Expand source context and confirm recipe/staple/baby/manual explanations are visible.
20. Toggle checked and already-have on an item. On mobile, simulate a failed item-state request and confirm the pending local state clears automatically after browser online/focus retry.
21. Advance lifecycle one step at a time:
    - Draft -> Finalized
    - Finalized -> Shopping Started
    - Shopping Started -> Completed
22. Open `/dashboard`.
23. Confirm current week, planning status, grocery status, next best action, needs-attention queue, and wrap-up entry are reasonable.
24. After finalizing or starting shopping, change an approved planned meal, confirm Plan Week shows pending grocery changes, apply the reviewed grocery updates, and confirm manual items/check state are preserved where applicable.
25. Open the weekly wrap-up, save one meal outcome with leftover context if prompted, acknowledge unused groceries with a future staple adjustment if prompted, confirm Settings opens a review banner instead of changing staples automatically, or dismiss it.
26. Open `/settings/baby`, track a Try This food when one is available, and confirm it becomes a normal baby food status without adding it to groceries automatically.
27. Open `/settings/foods`, create a household food with defaults, archive it, and restore it.
28. Open `/settings/household` as the owner, link an existing unlinked auth user by email, transfer ownership to that member, sign in as the new owner, transfer ownership back, remove that non-owner member, then confirm the member no longer reaches household-scoped routes.
29. Open `/manifest.webmanifest` and confirm install icons are served.

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
- H-E-B integration, export, aisle mapping, or price behavior
- Native iPhone or Android apps
- Full pantry inventory, barcode scanning, expiration tracking, or reminders
- Recipe photos and full recipe-link import
- Full macro tracking, calorie targets, strict warnings, or nutrition dashboards
- Baby nutrition, milk intake, and reaction tracking
- Email-delivered household invitations, role editing beyond owner transfer, and multi-household switching
- Full offline/PWA service-worker behavior
- Grocery history intelligence

## Next Phase Options

Good next slices should stay narrow and start from the verified MVP loop. Candidate directions:

- Member role editing beyond owner transfer and household switching
- Broader PWA/mobile offline resilience for grocery shopping beyond item-state retry
- Email-delivered invitations if shared household use becomes frequent

Prefer one focused slice at a time, and keep cloud Supabase migration pushes as explicit approval points.
