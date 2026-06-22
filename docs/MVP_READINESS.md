# MealBoard MVP Readiness

This document captures the current private family MVP state after the rule-based suggestions, baby preview, pending grocery-change, weekly wrap-up, and E2E smoke slices. It is a handoff snapshot for future Codex work so the next phase can build from known product truth instead of rediscovering the app.

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
- Approve planned meals for grocery generation.
- Review read-only Baby Meal 1/2 routine suggestions on Plan Week and `/settings/baby`.
- Select active staples for the week.
- Generate a grocery list from approved planned meals plus selected staples.
- See pending grocery-change counts when a protected grocery list would differ from the current plan.
- Use Shopping, Profile, and Meal grocery views.
- Add a manual grocery item with household/profile context and source note.
- Toggle checked and already-have item states.
- Advance a grocery list through Draft -> Finalized -> Shopping Started -> Completed.
- Open the optional weekly wrap-up after completed shopping.
- Confirm Dashboard reflects current week planning, grocery status, next best action, and wrap-up entry when eligible.
- Run unauthenticated Playwright auth-boundary smoke coverage for protected routes.

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
10. Confirm Baby routine suggestions are read-only and link back to `/settings/baby`.
11. Select at least one active staple and save selected staples.
12. Generate the grocery list.
13. Open `/grocery-list`.
14. Confirm generated recipe items and selected staples appear with sensible quantities, categories, and source context.
15. Add a manual grocery item with a note/context.
16. Confirm Shopping, Profile, and Meal views still render.
17. Expand source context and confirm recipe/staple/manual explanations are visible.
18. Toggle checked and already-have on an item.
19. Advance lifecycle one step at a time:
    - Draft -> Finalized
    - Finalized -> Shopping Started
    - Shopping Started -> Completed
20. Open `/dashboard`.
21. Confirm current week, planning status, grocery status, next best action, and wrap-up entry are reasonable.
22. Open the weekly wrap-up, save one recipe review if prompted, or dismiss it.

## Known Local Environment Note

The local Supabase `supabase_vector_mealboard` container has previously entered a restart loop after a local reset. This was a local Docker/Supabase container issue, not an app migration failure.

If it blocks local Supabase startup or `supabase db reset`, remove only that container and let Supabase recreate it:

```powershell
docker rm -f supabase_vector_mealboard
supabase start
supabase db reset
```

Do not delete Docker volumes as part of this recovery, and do not remove unrelated containers.

## Deferred Features

These are intentionally out of scope for the current MVP unless a future task explicitly reopens them:

- AI meal planning or AI nutrition estimation
- H-E-B integration, export, aisle mapping, or price behavior
- Native iPhone or Android apps
- Full pantry inventory, barcode scanning, expiration tracking, or reminders
- Recipe photos and full recipe-link import
- Full macro tracking, calorie targets, strict warnings, or nutrition dashboards
- Persisted Baby Meal 1/2 weekly-plan writes, baby grocery behavior, baby nutrition, milk intake, and reaction tracking
- Full smart swap confirmation UX beyond pending grocery-change visibility
- Multi-user household invitations and shared account workflows
- PWA install/offline polish
- Grocery history intelligence

## Next Phase Options

Good next slices should stay narrow and start from the verified MVP loop. Candidate directions:

- Hardening the authenticated Playwright core-loop smoke with stable local Supabase credentials
- Smart swap confirmation UX using the pending grocery-change helper
- Persisted baby routine plan items once slot semantics and grocery/nutrition behavior are defined
- Calorie target and gentle warning expansion
- Recipe paste/import usability
- Shared household/member invite preparation
- PWA/mobile install polish

Prefer one focused slice at a time, and keep cloud Supabase migration pushes as explicit approval points.
