# MealBoard Agent Guidance

This repo is MealBoard, not RT Scheduler.

## Source of Truth

- Follow `docs/PRD.md` and `docs/TECHNICAL_PLAN.md` as the source of truth.
- Use `docs/CODEX_TASKS.md` to keep implementation work in ordered, small, reviewable slices.
- Do not implement future-phase features unless explicitly asked.

## MVP Boundaries

Do not add these features in the MVP unless explicitly requested:

- AI features
- H-E-B integration
- Native iPhone or Android apps
- Full pantry inventory
- Reminders or notifications
- Recipe photos
- Full macro tracking

## Code Organization

- Keep business logic in `src/lib` where practical.
- Keep UI components focused on display and interaction, not core decision logic.
- Add tests for pure business logic.
- Prefer simple, explicit code over premature abstractions.

## Verification and Reporting

- Run lint, typecheck, and tests when available.
- After each task, summarize changed files and verification results.
- Include any risks or follow-up tasks that remain.
