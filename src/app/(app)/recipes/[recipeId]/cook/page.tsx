import Link from "next/link";
import { notFound } from "next/navigation";
import {
  abandonCookingSessionAction,
  cancelCookingTimerAction,
  completeCookingSessionAction,
  confirmPantryConsumptionCandidateAction,
  createCookingTimerAction,
  dismissCookingTimerAction,
  pauseCookingSessionAction,
  pauseCookingTimerAction,
  resumeCookingSessionAction,
  saveCookingNotesAction,
  setCurrentStepAction,
  setIngredientReadyAction,
  setStepCheckedAction,
  skipPantryConsumptionCandidateAction,
  startCookingSessionAction,
  startCookingTimerAction
} from "@/app/(app)/recipes/[recipeId]/cook/actions";
import {
  getActiveCookingSession,
  getCookingModeRecipe,
  getCookingSession,
  getCookingSessionCompletionWarningsForSession
} from "@/lib/cooking-mode/data";
import type {
  CookingSession,
  CookingSessionIngredient,
  CookingTimer
} from "@/lib/cooking-mode/types";
import { getPantryConsumptionCandidates } from "@/lib/pantry/data";
import type { PantryConsumptionCandidate } from "@/lib/pantry/consumption-candidates";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type CookingModePageProps = {
  params: Promise<{
    recipeId: string;
  }>;
  searchParams: Promise<{
    message?: string;
    plannedMealId?: string;
    sessionId?: string;
  }>;
};

export default async function CookingModePage({
  params,
  searchParams
}: CookingModePageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { recipeId } = await params;
  const { message, plannedMealId, sessionId } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const recipe = await getCookingModeRecipe({
    householdId: householdContext.household.id,
    recipeId
  });

  if (!recipe) {
    notFound();
  }

  const requestedSession = sessionId
    ? await getCookingSession({
        householdId: householdContext.household.id,
        sessionId
      })
    : null;
  const activeSession = await getActiveCookingSession({
    householdId: householdContext.household.id,
    plannedMealId: plannedMealId ?? null,
    recipeId
  });
  const session =
    requestedSession && requestedSession.recipeId === recipeId
      ? requestedSession
      : activeSession;
  const warnings = session
    ? await getCookingSessionCompletionWarningsForSession({
        householdId: householdContext.household.id,
        sessionId: session.id
      })
    : null;
  const consumptionCandidates =
    session?.status === "completed"
      ? await getPantryConsumptionCandidates({
          cookingSessionId: session.id,
          householdId: householdContext.household.id
        })
      : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="calm-eyebrow">Cooking Mode</p>
          <h1 className="calm-heading mt-3 text-4xl leading-tight md:text-[40px]">
            {session?.recipeNameSnapshot ?? recipe.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Ingredient checks mean ready or prepped. Step checks mean the
            instruction is done. Cooking Mode does not change pantry or grocery
            lists.
          </p>
        </div>
        <Link
          className="w-fit rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted"
          href={`/recipes/${recipe.id}`}
        >
          Back to recipe
        </Link>
      </div>

      {message ? <StatusMessage message={message} /> : null}

      {!recipe.canStartCooking ? (
        <section className="calm-card p-5">
          <h2 className="calm-heading text-xl">Review cooking steps first</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This recipe needs reviewed Cooking Steps before it can start a
            Cooking Session.
          </p>
          <Link
            className="mt-4 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            href={`/recipes/${recipe.id}#cooking-steps`}
          >
            Review cooking steps
          </Link>
        </section>
      ) : !session ? (
        <StartCookingPanel
          plannedMealId={plannedMealId ?? null}
          recipeId={recipe.id}
          servings={recipe.servings}
        />
      ) : (
        <>
          <SessionSummary recipeUpdatedAt={recipe.updatedAt} session={session} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {isTerminalSession(session) ? (
              <>
                <ReadOnlyIngredientList ingredients={session.ingredients} />
                <ReadOnlyStepList session={session} />
              </>
            ) : (
              <>
                <IngredientChecklist
                  ingredients={session.ingredients}
                  plannedMealId={plannedMealId ?? null}
                  recipeId={recipe.id}
                  sessionId={session.id}
                />
                <StepChecklist
                  plannedMealId={plannedMealId ?? null}
                  recipeId={recipe.id}
                  session={session}
                />
              </>
            )}
          </div>
          {isTerminalSession(session) ? (
            <>
              <ReadOnlySessionDetails session={session} />
              {session.status === "completed" ? (
                <PantryConsumptionReviewSection
                  candidates={consumptionCandidates}
                  plannedMealId={plannedMealId ?? null}
                  recipeId={recipe.id}
                  sessionId={session.id}
                />
              ) : null}
            </>
          ) : (
            <>
              <TimerPanel
                plannedMealId={plannedMealId ?? null}
                recipeId={recipe.id}
                session={session}
              />
              <NotesPanel
                plannedMealId={plannedMealId ?? null}
                recipeId={recipe.id}
                session={session}
              />
              <LifecyclePanel
                plannedMealId={plannedMealId ?? null}
                recipeId={recipe.id}
                session={session}
                warnings={warnings}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}

function isTerminalSession(session: CookingSession) {
  return session.status === "completed" || session.status === "abandoned";
}

function StartCookingPanel({
  plannedMealId,
  recipeId,
  servings
}: {
  plannedMealId: string | null;
  recipeId: string;
  servings: number | null;
}) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Ready to cook</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        This starts a recipe-backed Cooking Session using{" "}
        {plannedMealId ? "the planned meal scale" : "the recipe default servings"}
        {servings ? ` (${servings} servings)` : ""}.
      </p>
      <form action={startCookingSessionAction} className="mt-4">
        <CommonInputs plannedMealId={plannedMealId} recipeId={recipeId} />
        <button
          className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/95"
          type="submit"
        >
          Start cooking
        </button>
      </form>
    </section>
  );
}

function SessionSummary({
  recipeUpdatedAt,
  session
}: {
  recipeUpdatedAt: string;
  session: CookingSession;
}) {
  const isStale = Boolean(
    session.recipeUpdatedAtSnapshot &&
      session.recipeUpdatedAtSnapshot !== recipeUpdatedAt
  );

  return (
    <section className="calm-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="calm-heading text-xl">Session progress</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Status: <strong>{formatToken(session.status)}</strong>. Serving
            snapshot: {session.servingsSnapshot ?? "not set"}. Scale:{" "}
            {session.scaleFactorSnapshot}.
          </p>
        </div>
        <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          {session.weeklyPlanItemId ? "Planned meal" : "Recipe default"}
        </span>
      </div>
      {isStale ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          The saved recipe changed after this session started. This page keeps
          the original cooking snapshot.
        </p>
      ) : null}
    </section>
  );
}

function IngredientChecklist({
  ingredients,
  plannedMealId,
  recipeId,
  sessionId
}: {
  ingredients: CookingSessionIngredient[];
  plannedMealId: string | null;
  recipeId: string;
  sessionId: string;
}) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Ingredients ready</h2>
      <div className="mt-4 grid gap-3">
        {ingredients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            This session has no ingredient rows.
          </p>
        ) : (
          ingredients.map((ingredient) => (
            <form
              action={setIngredientReadyAction}
              className="rounded-lg border border-border bg-background/70 p-3"
              key={ingredient.id}
            >
              <CommonInputs
                plannedMealId={plannedMealId}
                recipeId={recipeId}
                sessionId={sessionId}
              />
              <input name="ingredientId" type="hidden" value={ingredient.id} />
              <input
                name="checked"
                type="hidden"
                value={ingredient.isReady ? "false" : "true"}
              />
              <button
                aria-pressed={ingredient.isReady}
                className="flex w-full items-start gap-3 text-left"
                type="submit"
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border ${
                    ingredient.isReady
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {ingredient.isReady ? "✓" : ""}
                </span>
                <span>
                  <span className="block font-semibold">
                    {formatIngredient(ingredient)}
                  </span>
                  {ingredient.preparation || ingredient.notes ? (
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {[ingredient.preparation, ingredient.notes]
                        .filter(Boolean)
                        .join(" - ")}
                    </span>
                  ) : null}
                </span>
              </button>
            </form>
          ))
        )}
      </div>
    </section>
  );
}

function ReadOnlyIngredientList({
  ingredients
}: {
  ingredients: CookingSessionIngredient[];
}) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Ingredient snapshot</h2>
      <div className="mt-4 grid gap-3">
        {ingredients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            This session has no ingredient rows.
          </p>
        ) : (
          ingredients.map((ingredient) => (
            <div
              className="rounded-lg border border-border bg-background/70 p-3"
              key={ingredient.id}
            >
              <p className="font-semibold">{formatIngredient(ingredient)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ingredient.isReady ? "Marked ready" : "Not marked ready"}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StepChecklist({
  plannedMealId,
  recipeId,
  session
}: {
  plannedMealId: string | null;
  recipeId: string;
  session: CookingSession;
}) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Steps</h2>
      <div className="mt-4 grid gap-3">
        {session.steps.map((step) => {
          const isCurrent = step.sortOrder === session.currentStepSortOrder;

          return (
            <article
              className={`rounded-lg border p-3 ${
                isCurrent
                  ? "border-primary bg-secondary/70"
                  : "border-border bg-background/70"
              }`}
              key={step.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {step.sectionLabel ? (
                    <p className="calm-eyebrow">{step.sectionLabel}</p>
                  ) : null}
                  <p className="mt-1 font-semibold">
                    Step {step.sortOrder + 1}
                  </p>
                  <p className="mt-2 text-sm leading-6">{step.instruction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={setCurrentStepAction}>
                    <CommonInputs
                      plannedMealId={plannedMealId}
                      recipeId={recipeId}
                      sessionId={session.id}
                    />
                    <input name="sortOrder" type="hidden" value={step.sortOrder} />
                    <button
                      className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      disabled={isCurrent}
                      type="submit"
                    >
                      Current
                    </button>
                  </form>
                  <form action={setStepCheckedAction}>
                    <CommonInputs
                      plannedMealId={plannedMealId}
                      recipeId={recipeId}
                      sessionId={session.id}
                    />
                    <input name="stepId" type="hidden" value={step.id} />
                    <input name="sortOrder" type="hidden" value={step.sortOrder} />
                    <input
                      name="checked"
                      type="hidden"
                      value={step.isCompleted ? "false" : "true"}
                    />
                    <button
                      aria-pressed={step.isCompleted}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        step.isCompleted
                          ? "border border-border hover:bg-muted"
                          : "bg-primary text-primary-foreground hover:bg-primary/95"
                      }`}
                      type="submit"
                    >
                      {step.isCompleted ? "Uncheck" : "Complete"}
                    </button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReadOnlyStepList({ session }: { session: CookingSession }) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Step snapshot</h2>
      <div className="mt-4 grid gap-3">
        {session.steps.map((step) => (
          <article
            className="rounded-lg border border-border bg-background/70 p-3"
            key={step.id}
          >
            {step.sectionLabel ? (
              <p className="calm-eyebrow">{step.sectionLabel}</p>
            ) : null}
            <p className="mt-1 font-semibold">Step {step.sortOrder + 1}</p>
            <p className="mt-2 text-sm leading-6">{step.instruction}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {step.isCompleted ? "Completed" : "Not completed"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TimerPanel({
  plannedMealId,
  recipeId,
  session
}: {
  plannedMealId: string | null;
  recipeId: string;
  session: CookingSession;
}) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Timers</h2>
      <form
        action={createCookingTimerAction}
        className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]"
      >
        <CommonInputs
          plannedMealId={plannedMealId}
          recipeId={recipeId}
          sessionId={session.id}
        />
        <label className="text-sm font-medium">
          Label
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="label"
            placeholder="Simmer"
          />
        </label>
        <label className="text-sm font-medium">
          Minutes
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            min="0.02"
            name="durationMinutes"
            step="0.01"
            type="number"
          />
        </label>
        <label className="text-sm font-medium">
          Step
          <select
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="stepId"
          >
            <option value="">Ad hoc</option>
            {session.steps.map((step) => (
              <option key={step.id} value={step.id}>
                Step {step.sortOrder + 1}
              </option>
            ))}
          </select>
        </label>
        <button
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          type="submit"
        >
          Add timer
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {session.timers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            No timers yet.
          </p>
        ) : (
          session.timers.map((timer) => (
            <TimerCard
              key={timer.id}
              plannedMealId={plannedMealId}
              recipeId={recipeId}
              session={session}
              timer={timer}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TimerCard({
  plannedMealId,
  recipeId,
  session,
  timer
}: {
  plannedMealId: string | null;
  recipeId: string;
  session: CookingSession;
  timer: CookingTimer;
}) {
  const step = timer.cookingSessionStepId
    ? session.steps.find((candidate) => candidate.id === timer.cookingSessionStepId)
    : null;

  return (
    <article className="rounded-lg border border-border bg-background/70 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{timer.label ?? "Cooking timer"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatTimer(timer)}
            {step ? ` - Step ${step.sortOrder + 1}` : " - Ad hoc"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {timer.status === "ready" || timer.status === "paused" ? (
            <TimerActionForm
              action={startCookingTimerAction}
              label={timer.status === "paused" ? "Resume" : "Start"}
              plannedMealId={plannedMealId}
              recipeId={recipeId}
              sessionId={session.id}
              timerId={timer.id}
            />
          ) : null}
          {timer.status === "running" ? (
            <TimerActionForm
              action={pauseCookingTimerAction}
              label="Pause"
              plannedMealId={plannedMealId}
              recipeId={recipeId}
              sessionId={session.id}
              timerId={timer.id}
            />
          ) : null}
          {timer.status === "expired" ? (
            <TimerActionForm
              action={dismissCookingTimerAction}
              label="Dismiss"
              plannedMealId={plannedMealId}
              recipeId={recipeId}
              sessionId={session.id}
              timerId={timer.id}
            />
          ) : null}
          {timer.status !== "canceled" && timer.status !== "dismissed" ? (
            <TimerActionForm
              action={cancelCookingTimerAction}
              label="Cancel"
              plannedMealId={plannedMealId}
              recipeId={recipeId}
              sessionId={session.id}
              timerId={timer.id}
              tone="danger"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function NotesPanel({
  plannedMealId,
  recipeId,
  session
}: {
  plannedMealId: string | null;
  recipeId: string;
  session: CookingSession;
}) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Session notes</h2>
      <form action={saveCookingNotesAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <CommonInputs
          plannedMealId={plannedMealId}
          recipeId={recipeId}
          sessionId={session.id}
        />
        <label className="text-sm font-medium">
          Notes
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={session.notes ?? ""}
            name="notes"
          />
        </label>
        <label className="text-sm font-medium">
          Substitutions
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={session.substitutions ?? ""}
            name="substitutions"
          />
        </label>
        <button
          className="w-fit rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          type="submit"
        >
          Save notes
        </button>
      </form>
    </section>
  );
}

function ReadOnlySessionDetails({ session }: { session: CookingSession }) {
  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">
        {session.status === "completed"
          ? "Completed session"
          : "Abandoned session"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        This historical session snapshot is read-only. Later recipe edits do
        not rewrite it.
      </p>
      <dl className="mt-4 grid gap-3 md:grid-cols-3">
        <ReadOnlyMetric label="Ingredients" value={session.ingredients.length} />
        <ReadOnlyMetric label="Steps" value={session.steps.length} />
        <ReadOnlyMetric label="Timers" value={session.timers.length} />
      </dl>
      {session.notes || session.substitutions ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {session.notes ? (
            <div className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-sm font-semibold">Notes</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {session.notes}
              </p>
            </div>
          ) : null}
          {session.substitutions ? (
            <div className="rounded-lg border border-border bg-background/70 p-3">
              <p className="text-sm font-semibold">Substitutions</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {session.substitutions}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PantryConsumptionReviewSection({
  candidates,
  plannedMealId,
  recipeId,
  sessionId
}: {
  candidates: PantryConsumptionCandidate[];
  plannedMealId: string | null;
  recipeId: string;
  sessionId: string;
}) {
  const candidate = candidates[0] ?? null;

  return (
    <section className="calm-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="calm-heading text-xl">Pantry consumption review</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Food-backed ingredients from this completed session can be reviewed
            for pantry consumption. Confirming or skipping records only a review
            decision; pantry stock stays unchanged.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatItemCount(candidates.length)}
        </span>
      </div>

      {!candidate ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-3">
          <h3 className="font-bold text-primary">
            No pantry consumption candidates left.
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Ingredients without a linked household item and already reviewed
            ingredients do not appear here.
          </p>
        </div>
      ) : (
        <article className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-primary">
                {candidate.displayName}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatConsumptionCandidateDetails(candidate)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Source: {candidate.recipeNameSnapshot}
              </p>
            </div>
            {candidates.length > 1 ? (
              <span className="text-sm text-muted-foreground">
                {formatItemCount(candidates.length - 1)} after this
              </span>
            ) : null}
          </div>

          <form
            action={confirmPantryConsumptionCandidateAction}
            className="mt-4 space-y-3"
          >
            <CommonInputs
              plannedMealId={plannedMealId}
              recipeId={recipeId}
              sessionId={sessionId}
            />
            <input
              name="cookingSessionIngredientId"
              type="hidden"
              value={candidate.cookingSessionIngredientId}
            />
            <label className="block text-sm font-medium">
              Review note
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                name="note"
                placeholder="Used from pantry, bought fresh, partial package"
                type="text"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95"
                type="submit"
              >
                Confirm consumption
              </button>
            </div>
          </form>

          <form action={skipPantryConsumptionCandidateAction} className="mt-3">
            <CommonInputs
              plannedMealId={plannedMealId}
              recipeId={recipeId}
              sessionId={sessionId}
            />
            <input
              name="cookingSessionIngredientId"
              type="hidden"
              value={candidate.cookingSessionIngredientId}
            />
            <button
              className="min-h-11 w-full rounded-md border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:border-primary hover:bg-muted sm:w-auto"
              type="submit"
            >
              Skip this ingredient
            </button>
          </form>
        </article>
      )}
    </section>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <dt className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-bold text-primary">{value}</dd>
    </div>
  );
}

function LifecyclePanel({
  plannedMealId,
  recipeId,
  session,
  warnings
}: {
  plannedMealId: string | null;
  recipeId: string;
  session: CookingSession;
  warnings: {
    uncheckedIngredientNames: string[];
    uncheckedStepInstructions: string[];
  } | null;
}) {
  const hasWarnings =
    (warnings?.uncheckedIngredientNames.length ?? 0) > 0 ||
    (warnings?.uncheckedStepInstructions.length ?? 0) > 0;

  return (
    <section className="calm-card p-5">
      <h2 className="calm-heading text-xl">Finish session</h2>
      {hasWarnings ? (
        <details className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" open>
          <summary className="font-semibold">Unchecked items before completion</summary>
          {(warnings?.uncheckedIngredientNames.length ?? 0) > 0 ? (
            <p className="mt-2">
              Ingredients: {warnings?.uncheckedIngredientNames.join(", ")}
            </p>
          ) : null}
          {(warnings?.uncheckedStepInstructions.length ?? 0) > 0 ? (
            <p className="mt-2">
              Steps: {warnings?.uncheckedStepInstructions.length} unchecked.
            </p>
          ) : null}
        </details>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          All ingredients and steps are checked.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {session.status === "active" ? (
          <LifecycleActionForm
            action={pauseCookingSessionAction}
            label="Pause session"
            plannedMealId={plannedMealId}
            recipeId={recipeId}
            sessionId={session.id}
          />
        ) : null}
        {session.status === "paused" ? (
          <LifecycleActionForm
            action={resumeCookingSessionAction}
            label="Resume session"
            plannedMealId={plannedMealId}
            recipeId={recipeId}
            sessionId={session.id}
          />
        ) : null}
        <LifecycleActionForm
          action={completeCookingSessionAction}
          label="Complete session"
          plannedMealId={plannedMealId}
          recipeId={recipeId}
          sessionId={session.id}
        />
        <LifecycleActionForm
          action={abandonCookingSessionAction}
          label="Abandon session"
          plannedMealId={plannedMealId}
          recipeId={recipeId}
          sessionId={session.id}
          tone="danger"
        />
      </div>
    </section>
  );
}

function LifecycleActionForm({
  action,
  label,
  plannedMealId,
  recipeId,
  sessionId,
  tone = "default"
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  plannedMealId: string | null;
  recipeId: string;
  sessionId: string;
  tone?: "default" | "danger";
}) {
  return (
    <form action={action}>
      <CommonInputs
        plannedMealId={plannedMealId}
        recipeId={recipeId}
        sessionId={sessionId}
      />
      <button
        className={
          tone === "danger"
            ? "rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            : "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95"
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function TimerActionForm({
  action,
  label,
  plannedMealId,
  recipeId,
  sessionId,
  timerId,
  tone = "default"
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  plannedMealId: string | null;
  recipeId: string;
  sessionId: string;
  timerId: string;
  tone?: "default" | "danger";
}) {
  return (
    <form action={action}>
      <CommonInputs
        plannedMealId={plannedMealId}
        recipeId={recipeId}
        sessionId={sessionId}
      />
      <input name="timerId" type="hidden" value={timerId} />
      <button
        className={
          tone === "danger"
            ? "rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            : "rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function CommonInputs({
  plannedMealId,
  recipeId,
  sessionId
}: {
  plannedMealId: string | null;
  recipeId: string;
  sessionId?: string;
}) {
  return (
    <>
      <input name="recipeId" type="hidden" value={recipeId} />
      {sessionId ? <input name="sessionId" type="hidden" value={sessionId} /> : null}
      {plannedMealId ? (
        <input name="plannedMealId" type="hidden" value={plannedMealId} />
      ) : null}
    </>
  );
}

function StatusMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function formatIngredient(ingredient: CookingSessionIngredient) {
  return [
    ingredient.quantity,
    ingredient.unit,
    ingredient.displayName
  ]
    .filter((value) => value !== null && value !== "")
    .join(" ");
}

function formatConsumptionCandidateDetails(candidate: PantryConsumptionCandidate) {
  const quantity = [candidate.quantity, candidate.unit]
    .filter((value) => value !== null && value !== "")
    .join(" ");
  const parts = [
    quantity || null,
    candidate.foodName,
    candidate.preparation,
    candidate.optional ? "Optional" : null,
    candidate.isReady ? "Marked ready" : "Not marked ready"
  ].filter(Boolean);

  return parts.join(" - ");
}

function formatItemCount(value: number) {
  return `${value} ${value === 1 ? "item" : "items"}`;
}

function formatTimer(timer: CookingTimer) {
  return `${formatToken(timer.status)} - ${Math.round(timer.durationSeconds / 60)} min`;
}

function formatToken(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
