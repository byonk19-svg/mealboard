import {
  addRuleBasedMealSuggestions,
  addWeeklyPlanItem,
  applyBabyRoutineToWeek,
  approveWeeklyPlanItem,
  confirmWeeklyPlanItemSwap,
  createOrSelectWeeklyPlan,
  removeWeeklyPlanItem,
  saveWeeklyPlanStaples,
  saveWeeklyPlanSetup,
  toggleWeeklyPlanItemLock
} from "@/app/(app)/plan-week/actions";
import Image from "next/image";
import type { Metadata } from "next";
import {
  applyPendingGroceryChangesForWeek,
  generateGroceryListForWeek
} from "@/app/(app)/grocery-list/actions";
import { BabyRoutinePreviewSection } from "@/components/plan-week/baby-routine-preview-section";
import { ManualPlanSection } from "@/components/plan-week/manual-plan-section";
import { NutritionSummarySection } from "@/components/plan-week/nutrition-summary-section";
import { RuleBasedSuggestionsSection } from "@/components/plan-week/rule-based-suggestions-section";
import { StaplesReviewSection } from "@/components/plan-week/staples-review-section";
import { SetupCallout } from "@/components/shared/setup-callout";
import {
  getPendingGroceryChangesForWeeklyPlan,
  getSwapGroceryImpactsForWeeklyPlanItem,
  type WeeklyPlanPendingGroceryChanges
} from "@/lib/grocery/data";
import {
  getPendingGroceryChangeApplyState,
  type PendingGroceryChangeItem
} from "@/lib/grocery/pending-grocery-changes";
import { generateBabyMeals } from "@/lib/baby/generate-baby-meals";
import {
  buildRuleBasedMealSuggestions,
  buildRuleBasedSwapSuggestions
} from "@/lib/meal-planning/rule-based-suggestions";
import { calculateCalorieTargetGuidance } from "@/lib/nutrition/calculate-calorie-target-guidance";
import { calculateDailyNutritionTotals } from "@/lib/nutrition/calculate-daily-totals";
import { getPantryUseSoonSignals } from "@/lib/pantry/data";
import { getRecipes } from "@/lib/recipes/data";
import {
  getBabyFoodStatuses,
  getMealProfiles,
  getStaples
} from "@/lib/settings/data";
import {
  buildBabySettingsSummary,
  getBabyProfile
} from "@/lib/settings/baby-settings";
import {
  getBabySetupWarning,
  getProtectedGroceryWarning,
  getRecipeSetupWarning,
  type SetupWarning
} from "@/lib/setup/setup-warnings";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  getPlanRecipeOptions,
  getWeeklyPlan,
  getWeeklyPlanGoals,
  getWeeklyPlanItems,
  getWeeklyPlanProfileDays,
  getWeeklyPlanStapleSelections
} from "@/lib/weekly-plans/data";
import { getRecipeReviewSignals } from "@/lib/weekly-wrap-up/data";
import { buildPlanItemsByProfile } from "@/lib/weekly-plans/group-plan-items";
import {
  buildPlanWeekSummary,
  type PlanWeekSummary
} from "@/lib/weekly-plans/plan-week-summary";
import {
  formatAdultDayType,
  formatWeeklyGoal,
  type WeeklyPlanItem,
  weeklyGoalTypes,
  type AdultDayType
} from "@/lib/weekly-plans/types";
import { getWeekDates, getWeekStartDate } from "@/lib/weekly-plans/week-dates";

const planWeekImageUrl =
  "/images/mealboard/plan-week-notebook.png";

export const metadata: Metadata = {
  title: "Plan Week",
  description:
    "Plan meals, staples, baby routine rows, and grocery readiness for the household week."
};

type PlanWeekPageProps = {
  searchParams: Promise<{
    message?: string;
    swapItemId?: string;
    view?: string;
    weekStartDate?: string;
  }>;
};

export default async function PlanWeekPage({
  searchParams
}: PlanWeekPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const {
    message,
    swapItemId,
    view: viewParam,
    weekStartDate: requestedWeekStartDate
  } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const weekStartDate = getWeekStartDate(requestedWeekStartDate ?? new Date());
  const [profiles, weeklyPlan] = await Promise.all([
    getMealProfiles(householdContext.household.id),
    getWeeklyPlan(householdContext.household.id, weekStartDate)
  ]);
  const adultProfiles = profiles.filter(
    (profile) => profile.profile_type === "adult"
  );
  const planningProfiles = profiles.filter((profile) =>
    ["adult", "baby", "shared"].includes(profile.profile_type)
  );
  const babyProfile = getBabyProfile(profiles);
  const weekDates = getWeekDates(weekStartDate);
  const [
    profileDays,
    goals,
    planItems,
    recipeOptions,
    recipes,
    pantryUseSoonSignals,
    reviewSignals,
    staples,
    pendingGroceryChanges,
    stapleSelections
  ] = weeklyPlan
    ? await Promise.all([
        getWeeklyPlanProfileDays(householdContext.household.id, weeklyPlan.id),
        getWeeklyPlanGoals(householdContext.household.id, weeklyPlan.id),
        getWeeklyPlanItems(householdContext.household.id, weeklyPlan.id),
        getPlanRecipeOptions(householdContext.household.id),
        getRecipes(householdContext.household.id),
        getPantryUseSoonSignals({ householdId: householdContext.household.id }),
        getRecipeReviewSignals(householdContext.household.id),
        getStaples(householdContext.household.id),
        getPendingGroceryChangesForWeeklyPlan({
          householdId: householdContext.household.id,
          weeklyPlanId: weeklyPlan.id
        }),
        getWeeklyPlanStapleSelections(
          householdContext.household.id,
          weeklyPlan.id
        )
      ])
    : [[], [], [], [], [], [], [], [], null, []];
  const profileDayLookup = new Map(
    profileDays.map((day) => [
      `${day.meal_profile_id}:${day.plan_date}`,
      day.adult_day_type
    ])
  );
  const selectedGoals = new Set(goals.map((goal) => goal.goal));
  const planItemsByDate = new Map<string, WeeklyPlanItem[]>();
  const planView = viewParam === "profile" ? "profile" : "day";
  const nutritionSummaries = calculateDailyNutritionTotals(planItems);
  const calorieGuidance = weeklyPlan
    ? calculateCalorieTargetGuidance({
        profileDays,
        profiles,
        strictness: weeklyPlan.calorie_strictness,
        summaries: nutritionSummaries
      })
    : [];
  const planWeekSummary = weeklyPlan
    ? buildPlanWeekSummary({
        planItems,
        selectedStapleCount: stapleSelections.length,
        weekDateKeys: weekDates.map((date) => date.dateKey)
      })
    : null;
  const ruleBasedSuggestions = weeklyPlan
    ? buildRuleBasedMealSuggestions({
        goals: goals.map((goal) => goal.goal),
        planItems,
        pantryUseSoonSignals,
        profileDays,
        profiles,
        recipes,
        reviewSignals,
        weekDateKeys: weekDates.map((date) => date.dateKey)
      })
    : [];
  const selectedSwapItem = planItems.find((item) => item.id === swapItemId) ?? null;
  const swapSuggestions = selectedSwapItem
    ? buildRuleBasedSwapSuggestions({
        goals: goals.map((goal) => goal.goal),
        pantryUseSoonSignals,
        planItems,
        profileDays,
        recipes,
        reviewSignals,
        targetItem: selectedSwapItem
      })
    : [];
  const swapGroceryImpacts =
    weeklyPlan && selectedSwapItem && swapSuggestions.length > 0
      ? await getSwapGroceryImpactsForWeeklyPlanItem({
          householdId: householdContext.household.id,
          recipeIds: swapSuggestions.map((suggestion) => suggestion.recipeId),
          targetItemId: selectedSwapItem.id,
          weeklyPlanId: weeklyPlan.id
        })
      : [];
  const babySummary = buildBabySettingsSummary(babyProfile, new Date());
  const babyFoodStatuses = babyProfile
    ? await getBabyFoodStatuses(householdContext.household.id, babyProfile.id)
    : [];
  const babyRoutineSuggestions = babyProfile
    ? generateBabyMeals(babyFoodStatuses, {
        stageName: babySummary.resolution?.stageName
      })
    : null;
  const setupWarnings = [
    getRecipeSetupWarning({
      approvedRecipeCount: recipes.filter((recipe) =>
        recipe.approvals.some((approval) => approval.approved_for_planning)
      ).length,
      totalRecipeCount: recipes.length
    }),
    getBabySetupWarning({
      hasBabyProfile: Boolean(babyProfile),
      setupWarning: babySummary.resolution?.setupWarning ?? null
    }),
    getProtectedGroceryWarning({
      hasChanges: pendingGroceryChanges?.changes.hasChanges ?? false,
      status: pendingGroceryChanges?.groceryList.status ?? null
    })
  ].filter((warning): warning is NonNullable<typeof warning> => warning !== null);

  planItems.forEach((item) => {
    const existingItems = planItemsByDate.get(item.plan_date) ?? [];
    planItemsByDate.set(item.plan_date, [...existingItems, item]);
  });
  const planItemsByProfile = buildPlanItemsByProfile({
    planItems,
    profiles: planningProfiles
  });

  return (
    <section className="space-y-7">
      <div>
        <p className="calm-eyebrow">Plan Week</p>
        <h1 className="calm-heading mt-3 text-4xl md:text-[40px] md:leading-[48px]">
          Start this week&apos;s meals
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Create the week first, then add one saved recipe or staple. Work days,
          goals, baby rows, and grocery readiness can be refined after the first
          useful item is on the board.
        </p>
      </div>

      {message ? <PlanWeekMessage message={message} /> : null}

      <form
        action={createOrSelectWeeklyPlan}
        className="calm-card overflow-hidden"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-6 md:p-8">
            <p className="calm-eyebrow">Choose week</p>
            <h2 className="calm-heading mt-3 text-3xl">
              Create the week, then add one useful item
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              MealBoard will keep the rest reviewable. Start small: one dinner,
              one lunch, or one staple is enough to make the grocery path clear.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block text-sm font-bold text-primary">
                Week of
                <input
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  defaultValue={weekStartDate}
                  name="weekStartDate"
                  type="date"
                />
              </label>
              <button
                className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(22,56,38,0.16)] hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                type="submit"
              >
                Create or select week
              </button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              MealBoard weeks start on Sunday. Selected week starts{" "}
              {formatDisplayDate(weekStartDate)}.
            </p>
          </div>
          <div className="relative min-h-64 overflow-hidden bg-secondary">
            <Image
              alt="A calm kitchen table with a blank planning notebook."
              className="h-full w-full object-cover"
              fetchPriority="high"
              fill
              loading="eager"
              sizes="(min-width: 1024px) 320px, 100vw"
              src={planWeekImageUrl}
            />
          </div>
        </div>
      </form>

      {setupWarnings.length > 0 ? (
        <SetupWarningsPanel warnings={setupWarnings} />
      ) : null}

      {weeklyPlan ? (
        <>
          <form action={saveWeeklyPlanSetup} className="space-y-6">
            <input name="weekStartDate" type="hidden" value={weekStartDate} />
            <input name="weeklyPlanId" type="hidden" value={weeklyPlan.id} />

            {planWeekSummary ? (
              <PlanWeekSummaryPanel summary={planWeekSummary} />
            ) : null}

            <section className="calm-card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="calm-heading text-xl">Adult day types</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Mark adult profiles as work or off days for this week.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                    Scroll the day grid sideways to see the full week.
                  </p>
                </div>
                <p className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
                  Status: {weeklyPlan.status}
                </p>
              </div>

              <div className="mt-5 overflow-x-auto pb-2">
                <div className="min-w-[720px] overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[140px_repeat(7,minmax(78px,1fr))] border-b border-border bg-muted/80 text-sm font-bold text-primary">
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

            <section className="calm-card p-5">
              <h2 className="calm-heading text-xl">Weekly goals</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Save high-level goal tags for the selected week. Rule-based
                suggestions use these goals to explain draft meal ideas.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {weeklyGoalTypes.map((goal) => (
                  <label
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm font-medium"
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
              className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(22,56,38,0.16)] hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              type="submit"
            >
              Save weekly setup
            </button>
          </form>

          <RuleBasedSuggestionsSection
            addSuggestionsAction={addRuleBasedMealSuggestions}
            suggestions={ruleBasedSuggestions}
            weekStartDate={weekStartDate}
            weeklyPlanId={weeklyPlan.id}
          />

          {babyRoutineSuggestions ? (
            <BabyRoutinePreviewSection
              applyRoutineAction={applyBabyRoutineToWeek}
              stageLabel={babySummary.statusLabel}
              summary={babyRoutineSuggestions}
              weekStartDate={weekStartDate}
              weeklyPlanId={weeklyPlan.id}
            />
          ) : null}

          <ManualPlanSection
            actions={{
              addWeeklyPlanItem,
              approveWeeklyPlanItem,
              confirmWeeklyPlanItemSwap,
              removeWeeklyPlanItem,
              toggleWeeklyPlanItemLock
            }}
            planItemsByProfile={planItemsByProfile}
            planItemsByDate={planItemsByDate}
            profiles={planningProfiles}
            recipeOptions={recipeOptions}
            selectedSwapItemId={selectedSwapItem?.id ?? null}
            swapGroceryImpacts={swapGroceryImpacts}
            swapSuggestions={swapSuggestions}
            view={planView}
            weekDates={weekDates}
            weekStartDate={weekStartDate}
            weeklyPlanId={weeklyPlan.id}
          />

          <NutritionSummarySection
            calorieGuidance={calorieGuidance}
            calorieStrictness={weeklyPlan.calorie_strictness}
            summaries={nutritionSummaries}
          />

          <StaplesReviewSection
            saveStaplesAction={saveWeeklyPlanStaples}
            selectedStapleIds={
              new Set(stapleSelections.map((selection) => selection.staple_id))
            }
            staples={staples}
            weekStartDate={weekStartDate}
            weeklyPlanId={weeklyPlan.id}
          />

          <GroceryGenerationPanel
            approvedRecipeItemCount={
              planWeekSummary?.approvedItemCount ??
              planItems.filter((item) => item.is_approved && item.recipe_id)
                .length
            }
            pendingChanges={pendingGroceryChanges}
            selectedStapleCount={stapleSelections.length}
            weekStartDate={weekStartDate}
            weeklyPlanId={weeklyPlan.id}
          />
        </>
      ) : (
        <div className="calm-card p-5">
          <h2 className="calm-heading text-xl">Create this week first</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create or select the week above before saving work/off days and
            goals.
          </p>
        </div>
      )}
    </section>
  );
}

function PlanWeekSummaryPanel({ summary }: { summary: PlanWeekSummary }) {
  return (
    <section className="calm-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="calm-eyebrow">Week at a glance</p>
          <h2 className="calm-heading mt-2 text-xl">
            {summary.primaryAttention.label}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {summary.primaryAttention.description}
          </p>
        </div>
        <span className={getAttentionClassName(summary.primaryAttention.tone)}>
          {formatAttentionTone(summary.primaryAttention.tone)}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryMetric label="Planned items" value={summary.totalItemCount} />
        <SummaryMetric label="Approved" value={summary.approvedItemCount} />
        <SummaryMetric label="Locked" value={summary.lockedItemCount} />
        <SummaryMetric label="Selected staples" value={summary.selectedStapleCount} />
        <SummaryMetric label="Empty days" value={summary.emptyDayCount} />
      </dl>

      {summary.missingEstimateItemCount > 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {summary.missingEstimateItemCount} planned{" "}
          {summary.missingEstimateItemCount === 1 ? "item is" : "items are"}{" "}
          missing calories or protein. That affects estimates only.
        </p>
      ) : null}
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div
      aria-label={`${label}: ${value}`}
      className="rounded-lg border border-border bg-background/70 p-3"
    >
      <dt className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd aria-live="polite" className="mt-1 text-xl font-bold text-primary">
        {value}
      </dd>
    </div>
  );
}

function GroceryGenerationPanel({
  approvedRecipeItemCount,
  pendingChanges,
  selectedStapleCount,
  weekStartDate,
  weeklyPlanId
}: {
  approvedRecipeItemCount: number;
  pendingChanges: WeeklyPlanPendingGroceryChanges | null;
  selectedStapleCount: number;
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  const canGenerate = approvedRecipeItemCount > 0 || selectedStapleCount > 0;
  const protectedListExists = Boolean(pendingChanges);

  return (
    <section className="calm-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="calm-heading text-xl">Grocery list</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Generate a draft grocery list from approved recipe items and
            selected staples. Existing draft lists for this week are replaced.
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Approved recipes ready</dt>
              <dd className="font-medium">{approvedRecipeItemCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Selected staples ready</dt>
              <dd className="font-medium">{selectedStapleCount}</dd>
            </div>
          </dl>
        </div>

        {!protectedListExists ? (
          <form action={generateGroceryListForWeek}>
            <input name="weekStartDate" type="hidden" value={weekStartDate} />
            <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
            <button
              className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              disabled={!canGenerate}
              type="submit"
            >
              Generate grocery list
            </button>
          </form>
        ) : null}
      </div>

      {pendingChanges ? (
        <PendingGroceryChangesPanel
          pendingChanges={pendingChanges}
          weekStartDate={weekStartDate}
          weeklyPlanId={weeklyPlanId}
        />
      ) : null}

      {!canGenerate ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Nothing is ready for groceries yet. Approve a planned recipe or select
          a staple first.
        </p>
      ) : null}
    </section>
  );
}

function PendingGroceryChangesPanel({
  pendingChanges,
  weekStartDate,
  weeklyPlanId
}: {
  pendingChanges: WeeklyPlanPendingGroceryChanges;
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  const { changes, groceryList } = pendingChanges;
  const applyState = getPendingGroceryChangeApplyState(changes);

  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">
        Protected grocery list: {formatGroceryStatus(groceryList.status)}
      </p>
      <p className="mt-2 leading-6">
        MealBoard will not silently change this list. Current plan changes would
        add {changes.addedCount}, remove {changes.removedCount}, and keep{" "}
        {changes.keptCount} automatic grocery{" "}
        {changes.keptCount === 1 ? "item" : "items"}.
        {changes.manualItemCount > 0
          ? ` ${changes.manualItemCount} manual ${changes.manualItemCount === 1 ? "item stays" : "items stay"} outside automatic updates.`
          : ""}
      </p>
      {!changes.hasChanges ? (
        <p className="mt-2 leading-6">
          The protected list still matches the approved plan and selected
          staples.
        </p>
      ) : null}
      {changes.hasChanges ? (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <PendingGroceryChangeList
              heading="Add"
              items={changes.added}
              tone="add"
            />
            <PendingGroceryChangeList
              heading="Remove"
              items={changes.removed}
              tone="remove"
            />
            <PendingGroceryChangeList
              heading="Keep"
              items={changes.kept}
              tone="keep"
            />
          </div>
          <form action={applyPendingGroceryChangesForWeek} className="mt-4">
            <input name="weekStartDate" type="hidden" value={weekStartDate} />
            <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
            <button
              className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!applyState.canApply}
              type="submit"
            >
              {applyState.label}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}

function PendingGroceryChangeList({
  heading,
  items,
  tone
}: {
  heading: string;
  items: PendingGroceryChangeItem[];
  tone: "add" | "keep" | "remove";
}) {
  const toneClassName =
    tone === "add"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "remove"
        ? "border-red-200 bg-red-50 text-red-950"
        : "border-border bg-white/70 text-amber-950";

  return (
    <section className={`rounded-lg border p-3 ${toneClassName}`}>
      <h3 className="font-semibold">
        {heading} {items.length}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm opacity-80">No items.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.slice(0, 6).map((item, index) => (
            <li className="text-sm" key={`${item.displayName}:${index}`}>
              {item.displayName}{" "}
              <span className="opacity-75">({formatPendingQuantity(item)})</span>
            </li>
          ))}
        </ul>
      )}
      {items.length > 6 ? (
        <p className="mt-2 text-xs opacity-75">
          {items.length - 6} more {items.length - 6 === 1 ? "item" : "items"}.
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
        className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
    <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function SetupWarningsPanel({ warnings }: { warnings: SetupWarning[] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="calm-eyebrow">Setup notes</p>
        <h2 className="calm-heading mt-2 text-xl">
          Helpful, but not required to start
        </h2>
      </div>
      <div className="grid gap-3">
        {warnings.map((warning) => (
          <SetupCallout
            body={warning.body}
            ctaHref={warning.ctaHref}
            ctaLabel={warning.ctaLabel}
            key={warning.title}
            title={warning.title}
            tone={warning.tone}
          />
        ))}
      </div>
    </section>
  );
}

function getAttentionClassName(tone: PlanWeekSummary["primaryAttention"]["tone"]) {
  if (tone === "success") {
    return "w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800";
  }

  if (tone === "info") {
    return "w-fit rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground";
  }

  return "w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900";
}

function formatAttentionTone(tone: PlanWeekSummary["primaryAttention"]["tone"]) {
  if (tone === "success") {
    return "Ready";
  }

  if (tone === "info") {
    return "Estimate cue";
  }

  return "Needs review";
}

function formatGroceryStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPendingQuantity(item: PendingGroceryChangeItem) {
  if (item.preferredQuantityText) {
    return item.preferredQuantityText;
  }

  if (item.quantity === null && !item.unit) {
    return "quantity needs review";
  }

  return [item.quantity, item.unit]
    .filter((value) => value !== null && value !== "")
    .join(" ");
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
