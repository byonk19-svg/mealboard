import type { DailyNutritionSummary } from "@/lib/nutrition/calculate-daily-totals";

type NutritionSummarySectionProps = {
  summaries: DailyNutritionSummary[];
};

export function NutritionSummarySection({
  summaries
}: NutritionSummarySectionProps) {
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
          {summaries.map((summary) => (
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

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Calories</dt>
                  <dd className="font-medium">
                    {formatEstimate(summary.calories, "cal")}
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
          ))}
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
