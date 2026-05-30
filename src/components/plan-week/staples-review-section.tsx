import { saveWeeklyPlanStaples } from "@/app/(app)/plan-week/actions";
import { formatStapleFrequency } from "@/lib/settings/staples";
import type { Staple } from "@/lib/settings/types";
import { groupStaplesForWeeklyReview } from "@/lib/weekly-plans/staples-review";

export function StaplesReviewSection({
  selectedStapleIds,
  staples,
  weekStartDate,
  weeklyPlanId
}: {
  selectedStapleIds: Set<string>;
  staples: Staple[];
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  const groups = groupStaplesForWeeklyReview(staples, selectedStapleIds);
  const selectedCount = groups.reduce(
    (count, group) =>
      count + group.staples.filter((staple) => staple.selected).length,
    0
  );

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Staples review</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose reusable staples for this weekly plan. Selected staples are
            included the next time you generate groceries for this week.
          </p>
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Selected: {selectedCount}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="mt-5 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Add active staples in Settings before reviewing them for the week.
        </div>
      ) : (
        <form action={saveWeeklyPlanStaples} className="mt-5 space-y-5">
          <input name="weekStartDate" type="hidden" value={weekStartDate} />
          <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />

          {groups.map((group) => (
            <div className="rounded-md border border-border" key={group.contextLabel}>
              <div className="border-b border-border bg-muted/50 px-4 py-3">
                <h3 className="font-semibold">{group.contextLabel}</h3>
              </div>
              <div className="divide-y divide-border">
                {group.staples.map((staple) => (
                  <label
                    className="flex cursor-pointer items-start gap-3 p-4"
                    key={staple.id}
                  >
                    <input
                      className="mt-1 size-5"
                      defaultChecked={staple.selected}
                      name="stapleIds"
                      type="checkbox"
                      value={staple.id}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {staple.display_name}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {getStapleDetailText(staple)}
                      </span>
                      {staple.notes ? (
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {staple.notes}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="submit"
          >
            Save selected staples
          </button>
        </form>
      )}
    </section>
  );
}

function getStapleDetailText(staple: Staple) {
  const parts = [
    formatStapleFrequency(staple.frequency),
    staple.preferred_quantity_text ?? getQuantityText(staple),
    staple.grocery_category_name,
    staple.food_name ? `Food: ${staple.food_name}` : null
  ].filter(Boolean);

  return parts.join(" - ");
}

function getQuantityText(staple: Staple) {
  if (staple.default_quantity === null && !staple.default_unit) {
    return null;
  }

  return [staple.default_quantity, staple.default_unit].filter(Boolean).join(" ");
}
