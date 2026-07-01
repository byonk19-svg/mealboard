# Plan: MealBoard Repo Hardening and Dogfood Closeout

**Generated**: 2026-07-01
**Estimated Complexity**: Medium

## Overview

This plan turns the external repo review into small, reviewable MealBoard work
without reopening deferred product areas. The best path is infrastructure and
correctness first, then narrow product hardening, then real household dogfood
for pantry stock application.

The plan intentionally avoids AI meal planning, H-E-B behavior, barcode
scanning, automatic pantry mutation, full offline sync, public signup,
multi-household switching, and other deferred features.

## Ground Rules

- Work from clean `main`.
- Use one branch per sprint or per atomic task when the diff grows.
- Keep schema/cloud Supabase pushes as explicit human approval points.
- Use local installed Next.js docs before editing Next proxy, image, route, or
  build behavior.
- Preserve pantry and Cooking Mode review-first behavior.
- Do not implement dogfood-derived pantry UX changes until there is one
  correctness stop condition or repeated real-use friction.
- Prefer issue-driven execution. Each issue should have acceptance criteria and
  verification commands.

## Recommended Skills by Phase

- `accurate-commits`: use before staging, committing, pushing, or opening each
  PR.
- `code-review`: use after each implementation branch, before merge.
- `playwright`: use for auth-boundary, PWA/image, Plan Week, grocery, or pantry
  browser-visible changes.
- `grill-with-docs`: use only if dogfood notes are ambiguous and need a sharper
  domain decision.

## Sprint 1: Issue Tracker and CI

**Goal**: Make future work explicit and ensure every PR runs the core local gate.

**Branch**: `codex/ci-and-hardening-issues`

**Issues**:

- [#28 Add core GitHub Actions CI](https://github.com/byonk19-svg/mealboard/issues/28)
- [#29 Generate Supabase database types and type clients](https://github.com/byonk19-svg/mealboard/issues/29)
- [#30 Align proxy protected paths with app navigation](https://github.com/byonk19-svg/mealboard/issues/30)
- [#31 Remove hardcoded adult planning profile names](https://github.com/byonk19-svg/mealboard/issues/31)
- [#32 Move remote hero images into local assets](https://github.com/byonk19-svg/mealboard/issues/32)
- [#33 Add private release-readiness notes](https://github.com/byonk19-svg/mealboard/issues/33)
- [#34 Dogfood pantry stock application path and classify notes](https://github.com/byonk19-svg/mealboard/issues/34)

**Demo/Validation**

- GitHub issues exist for the remaining work.
- CI runs `npm ci` and `npm run verify` on PRs and pushes to `main`.
- Local `npm run verify` passes before opening the PR.

### Task 1.1: Create narrow GitHub issues

- **Location**: GitHub Issues
- **Description**: Create concrete issues for:
  - Add core GitHub Actions CI.
  - Generate Supabase database types and type clients.
  - Align proxy protected paths with app navigation.
  - Remove hardcoded adult planning profile names.
  - Move remote hero images to local assets.
  - Add private release-readiness notes.
  - Run pantry stock application dogfood and classify notes.
- **Dependencies**: none
- **Acceptance Criteria**:
  - No broad issue like "Improve pantry" or "Add AI".
  - Each issue names owner, scope, non-goals, and verification.
- **Validation**:
  - `gh issue list --state open --json number,title,url`

### Task 1.2: Add core CI workflow

- **Location**: `.github/workflows/ci.yml`
- **Description**: Add GitHub Actions workflow for `pull_request` and `push` to
  `main`. Use Node 22, `npm ci`, and `npm run verify`.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - CI does not require Supabase service-role secrets.
  - CI does not run credential-gated Playwright smokes yet.
  - Workflow uses npm cache and may add `.next/cache` caching later if needed.
- **Validation**:
  - Review workflow syntax.
  - `npm run verify`

## Sprint 2: Auth Boundary Consistency

**Goal**: Make proxy optimistic auth redirects match app navigation and route
structure.

**Branch**: `codex/protected-route-alignment`

**Demo/Validation**

- Unauthenticated `/pantry` requests redirect to `/login` at the proxy layer.
- Existing `(app)` layout protection remains in place.

### Task 2.1: Add a protected path helper

- **Location**:
  - `src/lib/supabase/proxy.ts`
  - optional `src/lib/navigation.ts` or new focused route helper
- **Description**: Include `/pantry` and relevant `/pantry/*` paths in
  `isProtectedAppPath`. Keep `/recipes/*`, `/settings/*`, and
  `/weekly-wrap-up/*` behavior intact.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Navigation routes and proxy protected routes no longer drift for top-level
    app surfaces.
  - Layout-level household protection remains the source of truth for actual
    access control.
- **Validation**:
  - `npm run e2e:auth-boundary`
  - `npm run typecheck`
  - `npm run verify`

### Task 2.2: Add auth-boundary coverage

- **Location**: `e2e/auth-boundary.smoke.spec.ts`
- **Description**: Add `/pantry` to unauthenticated redirect assertions. Add a
  representative Cooking Mode recipe path if the fixture can avoid requiring a
  real recipe ID; otherwise document why layout protection covers dynamic
  Cooking Mode paths.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - `/pantry` is directly covered.
  - Test remains deterministic without seeded private data unless the existing
    script already seeds it.
- **Validation**:
  - `npm run e2e:auth-boundary`

## Sprint 3: Supabase Type Generation

**Goal**: Add generated database types and begin reducing schema drift risk
without a broad data-layer rewrite.

**Branch**: `codex/supabase-database-types`

**Demo/Validation**

- `src/types/database.ts` exists and is generated from the local schema.
- Supabase browser, server, proxy, and admin clients use the generated
  `Database` generic.
- Current manual row mappers continue to pass.

### Task 3.1: Generate local database types

- **Location**:
  - `src/types/database.ts`
  - `package.json`
- **Description**: Add generated Supabase database types from local schema,
  using `supabase gen types typescript --local > src/types/database.ts`.
  Add a script only if it is reliable in this repo's environment.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Types are generated after local migrations are applied.
  - No cloud project type generation is required.
  - No secrets are committed.
- **Validation**:
  - `supabase db reset`
  - `supabase gen types typescript --local > src/types/database.ts`
  - `npm run typecheck`

### Task 3.2: Type Supabase clients

- **Location**:
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/proxy.ts`
  - `src/lib/supabase/admin.ts`
- **Description**: Import `Database` and pass it to Supabase client creation.
  Keep existing query code shape and manual mapping in place.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Typecheck catches schema drift without forcing a broad refactor.
  - Server-only admin behavior remains server-only.
- **Validation**:
  - `npm run typecheck`
  - `npm run verify`

### Task 3.3: Opportunistic type cleanup only where forced

- **Location**: any files TypeScript forces during Task 3.2
- **Description**: Fix only errors caused by typed clients. Do not mass-convert
  all row types in one branch.
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - Diff stays focused on generated types and required compiler fixes.
- **Validation**:
  - `npm run typecheck`
  - `npm test`

## Sprint 4: Planning Profile Identity Cleanup

**Goal**: Remove private-MVP name coupling from Plan Week adult setup while
preserving existing household behavior.

**Branch**: `codex/adult-planning-profile-filter`

**Demo/Validation**

- Plan Week adult work/off-day setup works for adult profiles regardless of
  whether they are named Brianna or Elaine.
- Profile view remains ordered and understandable.

### Task 4.1: Extract adult planning profile selection

- **Location**:
  - `src/app/(app)/plan-week/page.tsx`
  - optional `src/lib/weekly-plans/*`
- **Description**: Replace `["Brianna", "Elaine"].includes(profile.name)` with
  a simple adult-profile filter. If the component needs display copy, make it
  profile-neutral.
- **Dependencies**: Sprint 2 or 3 can run first; no hard dependency except clean
  main.
- **Acceptance Criteria**:
  - Any adult meal profile can receive work/off-day controls.
  - Baby and shared profiles do not receive adult day controls.
  - No schema migration unless repeated use proves selective planning flags are
    needed.
- **Validation**:
  - focused unit test if helper is extracted
  - `npm run e2e:smoke`
  - `npm run typecheck`

### Task 4.2: Review name-coupled grouping behavior

- **Location**:
  - `src/lib/grocery/group-grocery-list-items.ts`
  - related tests
- **Description**: The hardcoded profile sort order may be acceptable for the
  private MVP, but review whether it creates incorrect behavior for renamed
  adult profiles. Fix only if it affects current planning/grocery correctness.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - If unchanged, document why it is display ordering only.
  - If changed, tests prove stable grouping order without private names.
- **Validation**:
  - `npm test -- src/lib/grocery/group-grocery-list-items.test.ts`
  - `npm run verify`

## Sprint 5: Local Hero Assets

**Goal**: Remove unnecessary dependency on Google-hosted image URLs.

**Branch**: `codex/local-hero-assets`

**Demo/Validation**

- Login, dashboard, grocery list, and Plan Week images render from local
  `public/` assets.
- `next.config.ts` no longer allows `lh3.googleusercontent.com` unless another
  code path still needs it.

### Task 5.1: Add local image assets

- **Location**: `public/`
- **Description**: Add small, optimized local image files for the four current
  hero/CTA images. If original licensing/source is unclear, replace them with
  simple generated or app-owned assets that fit MealBoard's calm family meal
  tone.
- **Dependencies**: none
- **Acceptance Criteria**:
  - Assets are reasonably sized.
  - No new dependency is added.
  - Images are app-owned or safe to commit.
- **Validation**:
  - Inspect file sizes.
  - Browser screenshot or Playwright page render check.

### Task 5.2: Replace remote URLs

- **Location**:
  - `src/app/login/page.tsx`
  - `src/app/(app)/dashboard/page.tsx`
  - `src/app/(app)/grocery-list/page.tsx`
  - `src/app/(app)/plan-week/page.tsx`
  - `next.config.ts`
- **Description**: Point `next/image` sources at local `/...` paths and remove
  the remote pattern if unused.
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - No `lh3.googleusercontent.com` remains in source.
  - Images still have meaningful alt text and stable dimensions.
- **Validation**:
  - `rg "lh3.googleusercontent.com|googleusercontent" .`
  - `npm run build`
  - `npm run e2e:pwa`

## Sprint 6: Release Readiness Notes

**Goal**: Capture private deploy and recovery procedure without expanding app
scope.

**Branch**: `codex/release-readiness-doc`

**Demo/Validation**

- A future maintainer can run local checks, understand env vars, and avoid
  accidental cloud migration or secret leakage.

### Task 6.1: Add private release-readiness doc

- **Location**: `docs/RELEASE_READINESS.md`
- **Description**: Document env vars, local Supabase reset, migration approval
  rules, smoke scripts, rollback expectations, generated type workflow, and CI
  expectations.
- **Dependencies**: Ideally after Sprints 1 and 3 so the doc reflects CI and
  generated types accurately.
- **Acceptance Criteria**:
  - No secrets or credentials.
  - Clear separation between local reset and cloud migration push.
  - Links to `docs/MVP_READINESS.md` and relevant npm scripts.
- **Validation**:
  - `git diff --check`
  - `npm run lint` if snippets or formatting warrant it.

## Sprint 7: Pantry Stock Application Dogfood

**Goal**: Complete the review's product recommendation using real household
evidence instead of speculative pantry work.

**Branch**: none unless dogfood produces a qualifying issue.

**Demo/Validation**

- Dogfood notes are classified against existing stop conditions.
- A branch is opened only for one correctness issue or repeated UX friction.

### Task 7.1: Run the dogfood checklist

- **Location**: `docs/dogfood/PANTRY_STOCK_APPLICATION_DOGFOOD.md`
- **Description**: Use the Cooking Mode -> pantry stock application path on real
  household meals. Capture allocation, reversal, copy, reload, and mobile notes.
- **Dependencies**: User real-use session
- **Acceptance Criteria**:
  - Notes say which meal/session was used.
  - Notes identify whether each issue is correctness, UX friction, or no issue.
  - Raw sensitive notes stay out of tracked docs unless sanitized.
- **Validation**:
  - Manual checklist completion.

### Task 7.2: Classify and branch only if warranted

- **Location**:
  - `docs/dogfood/PANTRY_STOCK_APPLICATION_DOGFOOD.md`
  - implementation files only if a concrete issue qualifies
- **Description**: Open an implementation branch only if any stop condition
  occurs, or the same UX friction appears twice.
- **Dependencies**: Task 7.1
- **Acceptance Criteria**:
  - No hidden pantry stock mutation.
  - No pantry-aware planning expansion unless dogfood points there directly.
  - Fix stays scoped to the observed issue.
- **Validation**:
  - `npm run e2e:pantry-consumption`
  - targeted pantry tests
  - `npm run verify:pantry-rls` if RPC, schema, or RLS behavior changes
  - `npm run verify`

## Cross-Sprint Testing Strategy

- Documentation-only: `git diff --check`, plus `npm run lint` when snippets or
  markdown-adjacent rules justify it.
- Next proxy/routes: read local Next docs, then run `npm run e2e:auth-boundary`,
  `npm run typecheck`, and `npm run verify`.
- Supabase schema/types: `supabase db reset`, generate types, `npm run
  typecheck`, and `npm run verify`.
- Plan Week profile behavior: `npm test`, `npm run e2e:smoke`, `npm run
  typecheck`, and `npm run verify`.
- Images/PWA: `npm run build`, `npm run e2e:pwa`, and browser screenshot checks
  if visual quality is uncertain.
- Pantry stock application: `npm run e2e:pantry-consumption`, targeted pantry
  tests, `npm run verify:pantry-rls` when data rules change, and `npm run
  verify`.

## Parallelization

Safe parallel lanes:

- Sprint 1 issue creation can happen alongside CI drafting.
- Sprint 2 route alignment and Sprint 5 local image research can be prepared in
  parallel, but should merge separately.
- Sprint 6 documentation can draft after CI/type decisions are known.

Do not parallelize:

- Supabase generated types with broad data-layer edits.
- Dogfood-derived pantry fixes with unrelated pantry improvements.
- Multiple schema migrations without a single ordered owner.

## Risks and Gotchas

- `npm run verify` includes `next build`, which can regenerate
  `next-env.d.ts`; restore generated churn unless the config intentionally
  changed.
- Supabase generated types can reveal many latent mismatches. Keep the first
  branch limited to client typing and required compiler fixes.
- CI may fail if environment assumptions differ from local Next builds. Keep
  credential-gated E2E out until local services are intentionally configured.
- Replacing remote images needs asset provenance. If provenance is unclear, use
  app-owned generated replacements rather than copying questionable files.
- Adding a profile planning flag is probably overkill right now. Start with
  profile type unless real household behavior requires selective adult planning.
- `/pantry` proxy alignment improves early redirects, but true access control
  remains the protected layout plus household-scoped data access.

## Rollback Plan

- CI: revert `.github/workflows/ci.yml` if it blocks urgent work, then recreate
  with a smaller job.
- Supabase types: revert generated type file and generic client typing as one
  branch if type fallout is too broad.
- Proxy paths: revert helper changes; layout protection remains as fallback.
- Planning profiles: revert Plan Week filter/copy changes if smoke tests show
  unexpected profile setup behavior.
- Images: revert local image references and restore `remotePatterns` if local
  assets fail production rendering.
- Docs: revert docs-only changes directly if they misstate the process.
- Dogfood fixes: reverse the narrow branch; pantry stock application already has
  regression coverage for apply, reverse, skip, reload, and multi-lot behavior.
