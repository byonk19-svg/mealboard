# MealBoard MVP Readiness

This document captures the current private family MVP state after the rule-based suggestions, smart swaps, Plan Week profile view, Preferences food creation, actionable dashboard queue, baby weekly-plan persistence, pending grocery-change, weekly wrap-up expansion, hardening, and E2E smoke slices. It is a handoff snapshot for future Codex work so the next phase can build from known product truth instead of rediscovering the app.

## Current Status

MealBoard is usable as a private family MVP for the core planning and grocery loop:

```txt
Recipes -> Plan Week -> Staples -> Grocery List -> Dashboard
```

The latest verified flow covers:

- Create and edit a recipe with structured ingredients, nutrition estimates, tags, and profile approvals.
- Configure the active weekly plan with adult work/off days and weekly goals.
- Review and add rule-based adult meal suggestion drafts.
- Add saved recipes to specific days, profiles, and meal slots.
- Review the week by profile, including clear Baby Meal 1/2 rows.
- Approve planned meals for grocery generation.
- Review Baby Meal 1/2 routine suggestions on Plan Week and `/settings/baby`.
- Apply Baby Meal 1/2 to the selected planning week as explicit baby plan slots.
- Select active staples for the week.
- Generate a grocery list from approved planned meals, approved persisted baby foods, and selected staples.
- See pending grocery-change counts when a protected grocery list would differ from the current plan.
- Open a smart swap panel, review ranked replacements, see grocery add/remove/keep impact, and confirm a swap without silently changing protected grocery lists.
- Use Shopping, Profile, and Meal grocery views.
- Add a manual grocery item with household/profile context and source note.
- Toggle checked and already-have item states.
- Advance a grocery list through Draft -> Finalized -> Shopping Started -> Completed.
- Open the optional weekly wrap-up after completed shopping.
- Capture made/skipped meal outcomes, leftovers, source-aware unused grocery notes, and future buying/staple-adjustment intent in weekly wrap-up.
- Confirm Dashboard reflects current week planning, grocery status, next best action, setup-aware and calorie-guidance needs-attention items, and wrap-up entry when eligible.
- Filter the recipe library by search text, recipe status, planning approval, and nutrition-review needs.
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
20. Toggle checked and already-have on an item.
21. Advance lifecycle one step at a time:
    - Draft -> Finalized
    - Finalized -> Shopping Started
    - Shopping Started -> Completed
22. Open `/dashboard`.
23. Confirm current week, planning status, grocery status, next best action, needs-attention queue, and wrap-up entry are reasonable.
24. Open the weekly wrap-up, save one meal outcome with leftover context if prompted, acknowledge unused groceries with a future adjustment if prompted, or dismiss it.

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

As of June 22, 2026, `npm audit --omit=dev` still reports the Next vendored
PostCSS advisory and recommends `npm audit fix --force`, which would install a
breaking old Next version. Do not force that fix. Revisit when Next ships a
non-breaking stable release that removes the vulnerable vendored PostCSS path.

## Deferred Features

These are intentionally out of scope for the current MVP unless a future task explicitly reopens them:

- AI meal planning or AI nutrition estimation
- H-E-B integration, export, aisle mapping, or price behavior
- Native iPhone or Android apps
- Full pantry inventory, barcode scanning, expiration tracking, or reminders
- Recipe photos and full recipe-link import
- Full macro tracking, calorie targets, strict warnings, or nutrition dashboards
- Baby nutrition, milk intake, and reaction tracking
- Multi-user household invitations and shared account workflows
- PWA install/offline polish
- Grocery history intelligence
- Full grocery-list replacement review workflow beyond current pending add/remove/keep visibility

## Next Phase Options

Good next slices should stay narrow and start from the verified MVP loop. Candidate directions:

- Safe dependency-audit follow-up when a non-breaking Next/PostCSS fix is available
- Review workflow for applying source-aware weekly wrap-up staple suggestions without hidden automatic changes
- Shared household/member invite preparation
- PWA/mobile install polish

Prefer one focused slice at a time, and keep cloud Supabase migration pushes as explicit approval points.
