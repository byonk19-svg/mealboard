# Implementation Loop Goal

The goal of each implementation loop is to take one clearly scoped issue from
planning to a reviewed pull request while preserving MealBoard's product
boundaries, keeping `main` stable, and avoiding scope creep.

Each loop should be small, test-backed, and independently reviewable. The agent
should complete the full issue loop without asking for approval at every step,
but must stop and ask when it finds a blocker, product ambiguity, destructive
operation, or scope conflict.

## Default Loop

For each issue:

1. Start from a clean working tree.
2. Create or use a dedicated branch for the issue.
3. Read the relevant source docs before coding.
4. Restate the issue scope and out-of-scope boundaries.
5. Inspect existing project patterns before making changes.
6. Implement only the selected issue.
7. Add or update tests where the repo has an existing pattern.
8. Run the narrowest useful verification first.
9. Run full verification before finishing.
10. Review the diff for scope creep, architecture drift, and accidental file
    changes.
11. Commit with a focused commit message.
12. Push the branch.
13. Open a PR.
14. Summarize what changed, what passed, and any follow-up needed.

## Source Of Truth

Use these docs as the source of truth when implementing Cooking Mode V0:

- `CONTEXT.md`
- `docs/COOKING_MODE_V0_PRD.md`
- `docs/issues/COOKING_MODE_V0_ISSUES.md`
- `docs/ISSUE_LABELS.md`
- `docs/adr/0001-review-first-pantry-and-cooking-boundaries.md`
- Existing migrations, tests, and app patterns

If a source doc conflicts with existing code, inspect carefully and choose the
smallest safe path. If the conflict changes product behavior or schema meaning,
stop and ask.

## Scope Rules

Implement one issue at a time.

Do not include unrelated work. Do not do "while I'm here" refactors.

For Cooking Mode V0, do not introduce:

- Smart Pantry integration
- pantry deduction
- grocery-list mutation
- voice controls
- recipe photos
- push notifications
- background timers
- Dashboard resume
- direct recipe scale adjustment
- unrelated schema changes
- unrelated UI changes
- unrelated refactors

## Autonomy Rules

The agent may proceed without asking when:

- the issue scope is clear
- existing project patterns are obvious
- the change is reversible and local to the issue
- tests/checks can verify the work
- no product behavior is being invented

The agent must stop and ask when:

- the issue requires a product decision not answered by the docs
- the implementation would cross into another issue
- the implementation would require a destructive migration
- the implementation would change existing behavior outside the issue
- RLS/security behavior is unclear
- generated files or build outputs change unexpectedly
- verification fails and the fix is not obvious
- the branch is not clean at the start

## Verification Standard

Run the narrowest relevant check first, then broader checks before finishing.

Default full verification:

```bash
npm run verify
```

For schema/RLS changes, also run:

```bash
supabase db reset
supabase db lint
```

If the repo has more specific tests for the touched area, run those first.

## Diff Review Standard

Before committing, review:

```bash
git status --short
git diff --stat
git diff
```

Confirm:

- only expected files changed
- no unrelated docs/code changed
- no generated files changed accidentally
- no scope exclusions were violated
- tests and checks passed
- the issue is independently reviewable

## Commit And PR Standard

Use a focused commit message:

```txt
feat: add Cooking Mode data helpers
fix: tighten Cooking Mode lifecycle validation
test: add Cooking Mode helper coverage
docs: clarify Cooking Mode implementation scope
```

Do not use `git add .` unless the diff has been reviewed and every changed file
belongs to the issue.

Prefer targeted staging:

```bash
git add <specific-files>
```

After committing:

```bash
git push -u origin <branch-name>
```

Then open a PR with:

- issue implemented
- files changed
- tests/checks run
- scope exclusions confirmed
- known follow-ups
- whether blockers remain

## Done Criteria

An implementation loop is done when:

- the issue is implemented
- scope boundaries were respected
- tests/checks passed
- the diff was reviewed
- the work was committed
- the branch was pushed
- a PR was opened
- the working tree is clean
- the summary clearly states what changed and what remains
