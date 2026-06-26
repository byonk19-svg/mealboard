import { formatMealType } from "@/lib/recipes/types";
import type { RuleBasedMealSuggestion } from "@/lib/meal-planning/rule-based-suggestions";

type RuleBasedSuggestionsSectionProps = {
  addSuggestionsAction: (formData: FormData) => void | Promise<void>;
  suggestions: RuleBasedMealSuggestion[];
  weekStartDate: string;
  weeklyPlanId: string;
};

export function RuleBasedSuggestionsSection({
  addSuggestionsAction,
  suggestions,
  weekStartDate,
  weeklyPlanId
}: RuleBasedSuggestionsSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Rule-based suggestions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            MealBoard can draft open adult meal slots from approved recipes,
            weekly goals, work/off days, and profile preferences. Suggestions
            stay unapproved until reviewed.
          </p>
        </div>
        <form action={addSuggestionsAction}>
          <input name="weekStartDate" type="hidden" value={weekStartDate} />
          <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
          <button
            className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            disabled={suggestions.length === 0}
            type="submit"
          >
            Add suggested meals
          </button>
        </form>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {suggestions.map((suggestion) => (
            <article
              className="rounded-md border border-border bg-background p-4"
              key={`${suggestion.mealProfileId}:${suggestion.planDate}:${suggestion.mealType}:${suggestion.recipeId}`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-semibold">{suggestion.recipeName}</h3>
                <p className="text-sm text-muted-foreground">
                  Score {suggestion.score}
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {suggestion.mealProfileName} · {formatMealType(suggestion.mealType)} ·{" "}
                {formatDisplayDate(suggestion.planDate)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestion.reasonLabels.map((reason) => (
                  <span
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    key={reason}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          No suggestions are ready. Add approved recipes for adult profiles,
          choose a week, and leave at least one adult lunch or dinner slot open.
        </p>
      )}
    </section>
  );
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
