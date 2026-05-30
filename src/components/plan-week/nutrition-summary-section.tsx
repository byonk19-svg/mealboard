import type { DailyNutritionSummary } from "@/lib/nutrition/calculate-daily-totals";
import {
  getCalorieGuidanceKey,
  type CalorieTargetGuidance
} from "@/lib/nutrition/calculate-calorie-target-guidance";
import type { CalorieStrictness } from "@/lib/weekly-plans/types";

type NutritionSummarySectionProps = {
  calorieGuidance: CalorieTargetGuidance[];
  calorieStrictness: CalorieStrictness;
  summaries: DailyNutritionSummary[];
};

export function NutritionSummarySection({
  calorieGuidance,
  calorieStrictness,
  summaries
}: NutritionSummarySectionProps) {
  const calorieGuidanceByKey = new Map(
    calorieGuidance.map((guidance) => [
      getCalorieGuidanceKey(guidance.mealProfileId, guidance.date),
      guidance
    ])
  );

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Nutrition estimates</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Estimated calories and protein from planned meals assigned to a
          profile and day.
        </p>
      </div>

      {summaries.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {summaries.map((summary) => {
            const guidance = calorieGuidanceByKey.get(
              getCalorieGuidanceKey(summary.mealProfileId, summary.date)
            );

            return (
              <article
                className="rounded-md border border-border bg-background p-4"
                key={`${summary.mealProfileId}:${summary.date}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-semibold">
                    {summary.mealProfileName ?? "Unassigned"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDisplayDate(summary.date)}
                  </p>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Calories</dt>
                    <dd className="font-medium">
                      {formatEstimate(summary.calories, "cal")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Target</dt>
                    <dd className="font-medium">
                      {guidance
                        ? `${guidance.calorieTarget} cal`
                        : "No target"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Protein</dt>
                    <dd className="font-medium">
                      {formatEstimate(summary.proteinGrams, "g")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Planned items</dt>
                    <dd className="font-medium">{summary.itemCount}</dd>
                  </div>
                </dl>

                {guidance ? (
                  <p
                    className={`mt-3 rounded-md border px-3 py-2 text-sm ${getGuidanceClassName(
                      guidance.tone
                    )}`}
                  >
                    {formatCalorieGuidance(guidance, calorieStrictness)}
                  </p>
                ) : null}

                {summary.unknownCalorieItems > 0 ||
                summary.unknownProteinItems > 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Missing estimates on{" "}
                    {formatUnknownEstimateText(
                      summary.unknownCalorieItems,
                      summary.unknownProteinItems
                    )}
                    .
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Add planned meals with calorie or protein estimates to see
          profile/day nutrition estimates here.
        </p>
      )}
    </section>
  );
}

function formatCalorieGuidance(
  guidance: CalorieTargetGuidance,
  strictness: CalorieStrictness
) {
  const strictnessLabel = formatCalorieStrictness(strictness);

  if (guidance.status === "unknown") {
    return `${strictnessLabel} target set, but calorie estimates are unknown for this profile/day.`;
  }

  if (guidance.status === "guidance_only") {
    return `Loose week: ${formatDifference(
      guidance.difference
    )} target. Treat this as guidance only.`;
  }

  if (guidance.status === "near") {
    return `${strictnessLabel} target: planned estimates are near target.`;
  }

  return `${strictnessLabel} target: planned estimates are ${formatDifference(
    guidance.difference
  )} target.`;
}

function formatDifference(difference: number | null) {
  if (difference === null) {
    return "unknown against";
  }

  if (difference === 0) {
    return "right at";
  }

  const direction = difference > 0 ? "over" : "under";
  return `${Math.abs(difference)} cal ${direction}`;
}

function getGuidanceClassName(tone: CalorieTargetGuidance["tone"]) {
  if (tone === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "caution") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-border bg-muted/40 text-muted-foreground";
}

function formatCalorieStrictness(strictness: CalorieStrictness) {
  const labels: Record<CalorieStrictness, string> = {
    flexible: "Flexible",
    loose: "Loose",
    strict: "Strict"
  };

  return labels[strictness];
}

function formatEstimate(value: number | null, unit: string) {
  return value === null ? "Unknown" : `${value} ${unit}`;
}

function formatUnknownEstimateText(
  unknownCalorieItems: number,
  unknownProteinItems: number
) {
  if (unknownCalorieItems === unknownProteinItems) {
    return `${unknownCalorieItems} item${unknownCalorieItems === 1 ? "" : "s"}`;
  }

  if (unknownCalorieItems === 0) {
    return `${unknownProteinItems} protein item${
      unknownProteinItems === 1 ? "" : "s"
    }`;
  }

  if (unknownProteinItems === 0) {
    return `${unknownCalorieItems} calorie item${
      unknownCalorieItems === 1 ? "" : "s"
    }`;
  }

  return `${unknownCalorieItems} calorie item${
    unknownCalorieItems === 1 ? "" : "s"
  } and ${unknownProteinItems} protein item${
    unknownProteinItems === 1 ? "" : "s"
  }`;
}

function formatDisplayDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(parseDateKey(dateKey));
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}
