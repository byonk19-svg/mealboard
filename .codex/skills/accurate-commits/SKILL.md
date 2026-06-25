---
name: accurate-commits
description: Accurate Git commits plus optional session handoff. Sync with main, stage by intent, verify the index, avoid junk/generated paths, push safely, and when requested land the branch by merging it into main. Use for commits, PR prep, pre-push, landing work, or chat wrap-up and handoff.
version: 1.2.0-mealboard
---

# Accurate Commits

Guide a safe, intentional commit or a small series of commits. Do not rush `git add .`.

## When To Use

- User is ready to `commit`, `push`, open a PR, or merge to `main`.
- Working tree mixes several concerns.
- User wants one commit to equal one intent.
- User is switching chats and wants a clean handoff.

## How To Invoke

- Ask the agent to read and follow `.codex/skills/accurate-commits/SKILL.md`.
- Or: `Run the accurate-commits skill before I push.`
- Or: `accurate-commits wrap-up - I'm switching context.`

## MealBoard Rules

- This repo is `C:\dev\mealboard`.
- Follow `AGENTS.md`, `docs/PRD.md`, `docs/TECHNICAL_PLAN.md`, and `docs/CODEX_TASKS.md`.
- Keep MVP boundaries: no AI features, H-E-B integration, native apps, full pantry inventory, reminders, recipe photos, or full macro tracking unless explicitly requested.
- Do not push cloud Supabase migrations without explicit approval.
- Generated files and smoke artifacts are not commit material unless explicitly requested:
  - `.next/`
  - `test-results/`
  - Playwright traces/videos/screenshots unless they are deliberate docs artifacts
  - temporary logs such as `tmp-*.log`
- `next-env.d.ts` may churn between `.next/dev/types/routes.d.ts` and `.next/types/routes.d.ts` after dev/build. Do not commit that generated churn unless there is a deliberate Next config reason.
- PowerShell route-group paths must be quoted, for example `'src/app/(app)/grocery-list/page.tsx'`.

## Decide The Landing Target First

Pick one mode before making git moves:

- `branch-only`: commit and push the feature branch, or prepare a PR.
- `land-on-main`: finish the branch work and merge it into `main`.

If the user explicitly asks to merge, land, ship, or "make sure it gets to main", use `land-on-main`.
If the user only asked for a commit, push, or PR, stay in `branch-only`.
If already on `main` and the user asks to commit and push, verify, commit, push `origin main`, and prove clean state.

## Procedure

### 1. Baseline

PowerShell:

```powershell
cd "C:\dev\mealboard"
git status -sb
git fetch origin
```

State the current branch, ahead/behind state, and whether there are untracked trees.

### 2. Exclude Junk

Treat generated or one-off paths as out of scope unless the user says to version them.
If generated paths keep appearing, suggest adding patterns to `.gitignore` once.

### 3. Sync The Working Branch

For branch work:

```powershell
git merge origin/main
```

Use rebase only if the user prefers rebasing, and warn that it rewrites history.
Resolve conflicts, then run checks appropriate to the risk.

### 4. Slice Work: One Commit = One Intent

Group files by story.

For each commit:

1. Stage only paths for that story:

   ```powershell
   git add 'src/app/(app)/grocery-list/page.tsx' src/lib/grocery/data.ts
   ```

2. Verify the index:

   ```powershell
   git diff --cached --stat
   git diff --cached
   ```

3. If anything is wrong, unstage it:

   ```powershell
   git restore --staged -- <file>
   ```

4. Commit with a why-first subject line:

   ```powershell
   git commit -m "Improve grocery list recovery"
   ```

Repeat until intentional tracked changes are committed and junk remains unstaged or removed.

### 5. Verify Branch Scope Before Push Or Merge

```powershell
git log --oneline origin/main..HEAD
git status -sb
```

Confirm the commit list matches what should ship.

### 6. Run Verification

Match verification to risk. For most MealBoard feature work, prefer:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

For browser-facing or protected-route work, include the relevant smoke:

```powershell
$env:MEALBOARD_E2E_EMAIL='mealboard-e2e-local@example.test'
$env:MEALBOARD_E2E_PASSWORD='Mealboard-e2e-local-12345!'
npm run e2e:smoke
npm run e2e:grocery-mobile
npm run e2e:recipe-import
```

Use focused smokes when the slice is narrow, but state exactly what ran and what did not.

### 7. Choose The Finish Path

#### Path A: Branch-Only

Use when the user wants a commit, push, or PR but did not ask to land directly on `main`.

```powershell
git push -u origin "<branch-name>"
```

#### Path B: Land-On-Main

Use when the user asked to merge to `main`, land the work, or otherwise complete integration.

1. Make sure branch verification already passed.
2. Switch to `main` and fast-forward it:

   ```powershell
   git checkout main
   git pull --ff-only origin main
   ```

3. Merge the working branch into `main`:

   ```powershell
   git merge --no-ff "<branch-name>"
   ```

   If the repo or user prefers fast-forward-only and history allows it, `git merge --ff-only "<branch-name>"` is also fine.

4. Re-run appropriate verification on `main`.
5. Push `main`:

   ```powershell
   git push origin main
   ```

6. Only after the push succeeds, say the work is merged to `main`.

### 8. If GitHub Merge Fails

Treat a GitHub merge failure as a diagnosis-and-fix loop, not the end of the workflow.

1. Identify the concrete blocker:

   ```powershell
   gh auth status
   gh pr view <number> --json state,isDraft,mergeable,mergeStateStatus,reviewDecision,url
   gh pr checks <number>
   ```

2. Fix what is within repo control:
   - If the branch is behind `main`, sync it with `origin/main`, resolve conflicts, rerun verification, and push.
   - If required checks failed, inspect logs, fix the real code/config issue, verify locally, and push.
   - If the PR is draft, mark it ready.
   - If mergeability is blocked by conflicts, resolve locally.
   - If blocked by branch protection, approvals, merge queue, or permissions, name the policy/access gate.

3. Re-check PR state after each fix.

Do not report "GitHub merge failed" without naming the blocker and what was attempted.

### 9. Session Wrap-Up

Run when the user is closing a session or switching threads.

Do not update docs just to create a diary. Update project truth only when behavior, setup, routes, env vars, verification commands, migration status, or MVP readiness changed.

Likely MealBoard handoff docs:

- `docs/MVP_READINESS.md`
- `docs/CODEX_TASKS.md`
- `README.md`
- `.omx/plans/*` only when continuing a specific plan

Verification before handoff should match risk. Full pass is preferred before merge or deploy.

## Agent Checklist

- [ ] `git status -sb` reviewed; junk paths not staged.
- [ ] `origin/main` fetched and branch sync considered.
- [ ] Each commit's staged diff was reviewed with `git diff --cached`.
- [ ] Commit messages describe intent.
- [ ] Branch scope matches `git log origin/main..HEAD`.
- [ ] If landing on `main`, verification reran on `main` and `git push origin main` succeeded.
- [ ] If GitHub merge failed, concrete blocker identified and remediation attempted.
- [ ] Handoff/docs updated only if durable project truth changed.

Open this file, then execute the procedure and narrate which step you are on.
