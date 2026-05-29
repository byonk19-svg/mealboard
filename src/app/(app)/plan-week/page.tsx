import {
  createOrSelectWeeklyPlan,
  saveWeeklyPlanSetup
} from "@/app/(app)/plan-week/actions";
import { generateGroceryListForWeek } from "@/app/(app)/grocery-list/actions";
import { ManualPlanSection } from "@/components/plan-week/manual-plan-section";
import { StaplesReviewSection } from "@/components/plan-week/staples-review-section";
import { getMealProfiles, getStaples } from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  getPlanRecipeOptions,
  getWeeklyPlan,
  getWeeklyPlanGoals,
  getWeeklyPlanItems,
  getWeeklyPlanProfileDays,
  getWeeklyPlanStapleSelections
} from "@/lib/weekly-plans/data";
import {
  formatAdultDayType,
  formatWeeklyGoal,
  type WeeklyPlanItem,
  weeklyGoalTypes,
  type AdultDayType
} from "@/lib/weekly-plans/types";
import { getWeekDates, getWeekStartDate } from "@/lib/weekly-plans/week-dates";

type PlanWeekPageProps = {
  searchParams: Promise<{
    message?: string;
    weekStartDate?: string;
  }>;
};

export default async function PlanWeekPage({
  searchParams
}: PlanWeekPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message, weekStartDate: requestedWeekStartDate } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const weekStartDate = getWeekStartDate(requestedWeekStartDate ?? new Date());
  const [profiles, weeklyPlan] = await Promise.all([
    getMealProfiles(householdContext.household.id),
    getWeeklyPlan(householdContext.household.id, weekStartDate)
  ]);
  const adultProfiles = profiles.filter(
    (profile) =>
      profile.profile_type === "adult" &&
      ["Brianna", "Elaine"].includes(profile.name)
  );
  const planningProfiles = profiles.filter((profile) =>
    ["adult", "baby", "shared"].includes(profile.profile_type)
  );
  const weekDates = getWeekDates(weekStartDate);
  const [
    profileDays,
    goals,
    planItems,
    recipeOptions,
    staples,
    stapleSelections
  ] = weeklyPlan
    ? await Promise.all([
        getWeeklyPlanProfileDays(householdContext.household.id, weeklyPlan.id),
        getWeeklyPlanGoals(householdContext.household.id, weeklyPlan.id),
        getWeeklyPlanItems(householdContext.household.id, weeklyPlan.id),
        getPlanRecipeOptions(householdContext.household.id),
        getStaples(householdContext.household.id),
        getWeeklyPlanStapleSelections(
          householdContext.household.id,
          weeklyPlan.id
        )
      ])
    : [[], [], [], [], [], []];
  const profileDayLookup = new Map(
    profileDays.map((day) => [
      `${day.meal_profile_id}:${day.plan_date}`,
      day.adult_day_type
    ])
  );
  const selectedGoals = new Set(goals.map((goal) => goal.goal));
  const planItemsByDate = new Map<string, WeeklyPlanItem[]>();

  planItems.forEach((item) => {
    const existingItems = planItemsByDate.get(item.plan_date) ?? [];
    planItemsByDate.set(item.plan_date, [...existingItems, item]);
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Plan Week</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Weekly Planning
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Create a planning week, mark adult work/off days, and save the
          week&apos;s goal tags. Add recipes manually to keep this first
          planning slice explicit and reviewable.
        </p>
      </div>

      {message ? <PlanWeekMessage message={message} /> : null}

      <form
        action={createOrSelectWeeklyPlan}
        className="rounded-lg border border-border bg-card p-5 shadow-sm"
      >
        <h2 className="text-xl font-semibold">Choose week</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm font-medium">
            Week of
            <input
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              defaultValue={weekStartDate}
              name="weekStartDate"
              type="date"
            />
          </label>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="submit"
          >
            Create or select week
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          MealBoard weeks start on Sunday. Selected week starts{" "}
          {formatDisplayDate(weekStartDate)}.
        </p>
      </form>

      {weeklyPlan ? (
        <>
          <form action={saveWeeklyPlanSetup} className="space-y-6">
            <input name="weekStartDate" type="hidden" value={weekStartDate} />
            <input name="weeklyPlanId" type="hidden" value={weeklyPlan.id} />

            <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Adult day types</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Mark Brianna and Elaine as work or off days for this week.
                  </p>
                </div>
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Status: {weeklyPlan.status}
                </p>
              </div>

              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[720px] rounded-md border border-border">
                  <div className="grid grid-cols-[140px_repeat(7,minmax(78px,1fr))] border-b border-border bg-muted/60 text-sm font-medium">
                    <div className="p-3">Profile</div>
                    {weekDates.map((date) => (
                      <div className="p-3 text-center" key={date.dateKey}>
                        <span className="block">
                          {date.dayLabel.slice(0, 3)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatShortDate(date.dateKey)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {adultProfiles.map((profile) => (
                    <div
                      className="grid grid-cols-[140px_repeat(7,minmax(78px,1fr))] border-b border-border last:border-b-0"
                      key={profile.id}
                    >
                      <div className="p-3 text-sm font-medium">
                        {profile.name}
                      </div>
                      {weekDates.map((date) => {
                        const selected =
                          profileDayLookup.get(
                            `${profile.id}:${date.dateKey}`
                          ) ?? "";

                        return (
                          <div className="p-2" key={date.dateKey}>
                            <DayTypeSelect
                              dayLabel={date.dayLabel}
                              name={`adultDayType:${profile.id}:${date.dateKey}:${date.dayLabel}`}
                              selected={selected}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Weekly goals</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Save high-level goal tags for the selected week. Goal-specific
                recipe suggestions come later.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {weeklyGoalTypes.map((goal) => (
                  <label
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    key={goal}
                  >
                    <input
                      defaultChecked={selectedGoals.has(goal)}
                      name="weeklyGoals"
                      type="checkbox"
                      value={goal}
                    />
                    {formatWeeklyGoal(goal)}
                  </label>
                ))}
              </div>
            </section>

            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              type="submit"
            >
              Save weekly setup
            </button>
          </form>

          <ManualPlanSection
            planItemsByDate={planItemsByDate}
            profiles={planningProfiles}
            recipeOptions={recipeOptions}
            weekDates={weekDates}
            weekStartDate={weekStartDate}
            weeklyPlanId={weeklyPlan.id}
          />

          <StaplesReviewSection
            selectedStapleIds={
              new Set(stapleSelections.map((selection) => selection.staple_id))
            }
            staples={staples}
            weekStartDate={weekStartDate}
            weeklyPlanId={weeklyPlan.id}
          />

          <GroceryGenerationPanel
            approvedRecipeItemCount={
              planItems.filter((item) => item.is_approved && item.recipe_id)
                .length
            }
            selectedStapleCount={stapleSelections.length}
            weekStartDate={weekStartDate}
            weeklyPlanId={weeklyPlan.id}
          />
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Create this week first</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create or select the week above before saving work/off days and
            goals.
          </p>
        </div>
      )}
    </section>
  );
}

function GroceryGenerationPanel({
  approvedRecipeItemCount,
  selectedStapleCount,
  weekStartDate,
  weeklyPlanId
}: {
  approvedRecipeItemCount: number;
  selectedStapleCount: number;
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  const canGenerate = approvedRecipeItemCount > 0 || selectedStapleCount > 0;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Grocery list</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Generate a draft grocery list from approved recipe items in this
            week. If a draft already exists for this week, MealBoard replaces
            that draft instead of creating duplicates.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Approved recipe items ready: {approvedRecipeItemCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Selected staples ready: {selectedStapleCount}
          </p>
        </div>

        <form action={generateGroceryListForWeek}>
          <input name="weekStartDate" type="hidden" value={weekStartDate} />
          <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            disabled={!canGenerate}
            type="submit"
          >
            Generate grocery list
          </button>
        </form>
      </div>

      {!canGenerate ? (
        <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Approve at least one recipe item or select one staple before
          generating groceries.
        </p>
      ) : null}
    </section>
  );
}

function DayTypeSelect({
  dayLabel,
  name,
  selected
}: {
  dayLabel: string;
  name: string;
  selected: AdultDayType | "";
}) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      <span className="sr-only">{dayLabel}</span>
      <select
        className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={selected}
        name={name}
      >
        <option value="">Unset</option>
        <option value="work_day">{formatAdultDayType("work_day")}</option>
        <option value="off_day">{formatAdultDayType("off_day")}</option>
      </select>
    </label>
  );
}

function PlanWeekMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function formatDisplayDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(parseDateKey(dateKey));
}

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC"
  }).format(parseDateKey(dateKey));
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}
