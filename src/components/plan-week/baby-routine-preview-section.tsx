import Link from "next/link";
import type { BabyMealSuggestionSummary } from "@/lib/baby/generate-baby-meals";

type BabyRoutinePreviewSectionProps = {
  applyRoutineAction: (formData: FormData) => void | Promise<void>;
  stageLabel: string;
  summary: BabyMealSuggestionSummary;
  weekStartDate: string;
  weeklyPlanId: string;
};

export function BabyRoutinePreviewSection({
  applyRoutineAction,
  stageLabel,
  summary,
  weekStartDate,
  weeklyPlanId
}: BabyRoutinePreviewSectionProps) {
  const canApplyRoutine = summary.slots.some((slot) => slot.foodId);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Baby routine suggestions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Baby Meal 1 and Baby Meal 2 ideas from tried or liked baby foods.
            Apply them as unapproved weekly plan items, then approve only the
            baby foods that should enter groceries.
          </p>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Stage context: {stageLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="w-fit rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
            href="/settings/baby"
          >
            Edit baby foods
          </Link>
          <form action={applyRoutineAction}>
            <input name="weekStartDate" type="hidden" value={weekStartDate} />
            <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
            <button
              className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canApplyRoutine}
              type="submit"
            >
              Apply to week
            </button>
          </form>
        </div>
      </div>

      {summary.warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {summary.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {summary.slots.map((slot) => (
          <article
            className="rounded-md border border-border bg-background p-4"
            key={slot.slot}
          >
            <p className="text-sm font-medium text-muted-foreground">
              {slot.label}
            </p>
            <h3 className="mt-2 text-lg font-semibold">
              {slot.foodName ?? "Needs another food"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {slot.reason}
            </p>
            {slot.prepNotes ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Prep: {slot.prepNotes}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
