# MealBoard MVP Hardening and Baby Planning Completion

> **For byonk:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan.

## Goal

Complete the ordered hardening path for MealBoard:

1. Fix form accessibility label ambiguity and make `npm run e2e:smoke` pass with local seeded credentials.
2. Complete Task 16 smart swap selection and confirmation UX.
3. Complete Task 18 mobile grocery polish.
4. Complete Task 19 empty states, setup warnings, and user-facing error states.
5. Complete Task 20 MVP hardening.
6. Only after those are solid, persist Baby Meal 1/2 into Plan Week and define baby grocery behavior.

## Guardrails

- Keep MVP boundaries from `AGENTS.md`, `docs/PRD.md`, and `docs/TECHNICAL_PLAN.md`.
- No AI, H-E-B integration, native apps, reminders, recipe photos, full pantry inventory, or full macro tracking.
- Keep business logic in `src/lib` where practical.
- Add tests for pure logic and broaden only where the risk warrants it.
- Do not push cloud Supabase migrations; local validation only.

## Execution Slices

### Slice 1: Smoke E2E and Accessibility

- Replace ambiguous form labels with specific, user-facing labels.
- Update smoke E2E selectors to target stable accessible names.
- Ensure local seeded credentials are documented or scripted enough for repeatable local smoke runs.
- Verification: `npm run e2e:smoke` with local credentials, plus focused component/type checks if touched.

### Slice 2: Smart Swaps

- Add pure swap-selection logic that ranks compatible recipe alternatives and explains why.
- Add confirmation UX before mutating a planned meal.
- Warn about grocery impact without changing finalized/shopping lists silently.
- Verification: focused pure tests, lint/typecheck, browser click path.

### Slice 3: Mobile Grocery Polish

- Improve mobile grocery scanability, action placement, pending-change visibility, and touch targets.
- Preserve desktop behavior.
- Verification: browser viewport checks for mobile and desktop grocery pages.

### Slice 4: Empty, Setup, and Error States

- Add practical empty states for routes that currently fail silently or look unfinished.
- Add setup warnings for missing household inputs that block useful planning.
- Convert avoidable raw failures into user-facing guidance.
- Verification: focused tests for pure setup-warning logic and browser checks for key states.

### Slice 5: MVP Hardening

- Run security/dependency, build, lint, typecheck, tests, migration validation, and route review.
- Fix low-risk findings found during hardening; defer risky dependency jumps with explicit notes.
- Verification: full local validation suite and final manual review.

### Slice 6: Baby Meal Persistence and Grocery Behavior

- Persist Baby Meal 1 and Baby Meal 2 as explicit weekly-plan slots only after adult planning loop hardening passes.
- Keep baby routine suggestions deterministic and based on tried/liked foods.
- Define grocery behavior narrowly: approved persisted baby food plan items can enter groceries; preview-only items do not.
- Verification: schema/type tests where applicable, pure baby routine tests, grocery-generation tests, and browser Plan Week path.

## Completion Standard

- Ordered slices are implemented or explicitly proven already complete.
- Relevant tests exist for new pure logic.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`, and relevant E2E/browser smoke paths pass or have a concrete external blocker.
- Code review is performed before commit.
- Changes are committed and pushed when appropriate.
