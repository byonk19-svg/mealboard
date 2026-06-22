import {
  confirmWeeklyPlanItemSwap,
  addWeeklyPlanItem,
  approveWeeklyPlanItem,
  removeWeeklyPlanItem,
  toggleWeeklyPlanItemLock
} from "@/app/(app)/plan-week/actions";
import Link from "next/link";
import type { SwapGroceryImpact } from "@/lib/grocery/data";
import type { RuleBasedSwapSuggestion } from "@/lib/meal-planning/rule-based-suggestions";
import {
  formatMealType,
  mealTypes,
  type MealType
} from "@/lib/recipes/types";
import type { MealProfile } from "@/lib/settings/types";
import type { PlanItemProfileGroup } from "@/lib/weekly-plans/group-plan-items";
import type {
  PlanRecipeOption,
  WeeklyPlanItem
} from "@/lib/weekly-plans/types";
import type { getWeekDates } from "@/lib/weekly-plans/week-dates";
import type { ReactNode } from "react";

type WeekDate = ReturnType<typeof getWeekDates>[number];

const planMealTypes = [
  "lunch",
  "dinner",
  "snack",
  "side",
  "other"
] as const satisfies readonly MealType[];

export function ManualPlanSection({
  planItemsByProfile,
  planItemsByDate,
  profiles,
  recipeOptions,
  selectedSwapItemId,
  swapGroceryImpacts,
  swapSuggestions,
  view,
  weekDates,
  weekStartDate,
  weeklyPlanId
}: {
  planItemsByProfile: PlanItemProfileGroup[];
  planItemsByDate: Map<string, WeeklyPlanItem[]>;
  profiles: MealProfile[];
  recipeOptions: PlanRecipeOption[];
  selectedSwapItemId: string | null;
  swapGroceryImpacts: SwapGroceryImpact[];
  swapSuggestions: RuleBasedSwapSuggestion[];
  view: "day" | "profile";
  weekDates: WeekDate[];
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  const canAddItems = profiles.length > 0 && recipeOptions.length > 0;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Manual plan</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add saved recipes in Day view, or review the full week by profile.
            Approve items when they should count toward grocery generation.
          </p>
        </div>
        <PlanViewSelector
          selectedSwapItemId={selectedSwapItemId}
          view={view}
          weekStartDate={weekStartDate}
        />
      </div>

      {!canAddItems ? (
        <div className="mt-5 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          {recipeOptions.length === 0
            ? "Add a recipe before assigning meals to this week."
            : "Add meal profiles before assigning recipes to this week."}
        </div>
      ) : null}

      {view === "profile" ? (
        <ProfilePlanView
          groups={planItemsByProfile}
          selectedSwapItemId={selectedSwapItemId}
          swapGroceryImpacts={swapGroceryImpacts}
          swapSuggestions={swapSuggestions}
          weekStartDate={weekStartDate}
        />
      ) : (
        <DayPlanView
          canAddItems={canAddItems}
          planItemsByDate={planItemsByDate}
          profiles={profiles}
          recipeOptions={recipeOptions}
          selectedSwapItemId={selectedSwapItemId}
          swapGroceryImpacts={swapGroceryImpacts}
          swapSuggestions={swapSuggestions}
          weekDates={weekDates}
          weekStartDate={weekStartDate}
          weeklyPlanId={weeklyPlanId}
        />
      )}
    </section>
  );
}

function DayPlanView({
  canAddItems,
  planItemsByDate,
  profiles,
  recipeOptions,
  selectedSwapItemId,
  swapGroceryImpacts,
  swapSuggestions,
  weekDates,
  weekStartDate,
  weeklyPlanId
}: {
  canAddItems: boolean;
  planItemsByDate: Map<string, WeeklyPlanItem[]>;
  profiles: MealProfile[];
  recipeOptions: PlanRecipeOption[];
  selectedSwapItemId: string | null;
  swapGroceryImpacts: SwapGroceryImpact[];
  swapSuggestions: RuleBasedSwapSuggestion[];
  weekDates: WeekDate[];
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  return (
    <div className="mt-5 grid gap-4">
      {weekDates.map((date) => (
        <article
          className="rounded-md border border-border bg-background p-4"
          key={date.dateKey}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-lg font-semibold">{date.dayLabel}</h3>
            <p className="text-sm text-muted-foreground">
              {formatDisplayDate(date.dateKey)}
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {(planItemsByDate.get(date.dateKey) ?? []).length > 0 ? (
              (planItemsByDate.get(date.dateKey) ?? []).map((item) => (
                  <PlanItemCard
                    item={item}
                    key={item.id}
                    selectedSwapItemId={selectedSwapItemId}
                    swapGroceryImpacts={swapGroceryImpacts}
                    swapSuggestions={swapSuggestions}
                    view="day"
                    weekStartDate={weekStartDate}
                  />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                Nothing planned for this day yet.
              </p>
            )}
          </div>

          {canAddItems ? (
            <AddPlanItemForm
              date={date}
              profiles={profiles}
              recipeOptions={recipeOptions}
              weekStartDate={weekStartDate}
              weeklyPlanId={weeklyPlanId}
            />
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ProfilePlanView({
  groups,
  selectedSwapItemId,
  swapGroceryImpacts,
  swapSuggestions,
  weekStartDate
}: {
  groups: PlanItemProfileGroup[];
  selectedSwapItemId: string | null;
  swapGroceryImpacts: SwapGroceryImpact[];
  swapSuggestions: RuleBasedSwapSuggestion[];
  weekStartDate: string;
}) {
  if (groups.length === 0) {
    return (
      <p className="mt-5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
        Nothing is planned for any profile yet. Switch to Day view to add saved
        recipes.
      </p>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      {groups.map((group) => (
        <article
          className="rounded-md border border-border bg-background p-4"
          key={group.profileName}
        >
          <h3 className="text-lg font-semibold">{group.profileName}</h3>
          <div className="mt-4 grid gap-3">
            {group.items.length > 0 ? (
              group.items.map(({ item, slotLabel }) => (
                <PlanItemCard
                  contextLabel={`${formatDisplayDate(item.plan_date)} - ${formatSlotLabel(slotLabel)}`}
                  item={item}
                  key={item.id}
                  selectedSwapItemId={selectedSwapItemId}
                  swapGroceryImpacts={swapGroceryImpacts}
                  swapSuggestions={swapSuggestions}
                  view="profile"
                  weekStartDate={weekStartDate}
                />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                {group.profileName.toLowerCase() === "baby"
                  ? "No Baby Meal 1 or Baby Meal 2 items are planned yet."
                  : "No meals are planned for this profile yet."}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function PlanViewSelector({
  selectedSwapItemId,
  view,
  weekStartDate
}: {
  selectedSwapItemId: string | null;
  view: "day" | "profile";
  weekStartDate: string;
}) {
  const options = [
    { label: "Day view", value: "day" },
    { label: "Profile view", value: "profile" }
  ] as const;

  return (
    <nav
      aria-label="Plan view"
      className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1"
    >
      {options.map((option) => {
        const isActive = view === option.value;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`rounded px-3 py-2 text-center text-sm font-medium ${
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card/60"
            }`}
            href={buildPlanWeekHref({
              swapItemId: selectedSwapItemId,
              view: option.value,
              weekStartDate
            })}
            key={option.value}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AddPlanItemForm({
  date,
  profiles,
  recipeOptions,
  weekStartDate,
  weeklyPlanId
}: {
  date: WeekDate;
  profiles: MealProfile[];
  recipeOptions: PlanRecipeOption[];
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  return (
    <form
      action={addWeeklyPlanItem}
      className="mt-4 grid gap-3 rounded-md border border-dashed border-border p-3 md:grid-cols-[1fr_1fr_1.3fr_auto]"
    >
      <input name="planDate" type="hidden" value={date.dateKey} />
      <input name="weekStartDate" type="hidden" value={weekStartDate} />
      <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />

      <label className="text-sm font-medium">
        Profile for {date.dayLabel}
        <select
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          name="mealProfileId"
          required
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Meal slot for {date.dayLabel}
        <select
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          name="mealType"
          required
        >
          {planMealTypes.map((mealType) => (
            <option key={mealType} value={mealType}>
              {formatMealType(mealType)}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Recipe for {date.dayLabel}
        <select
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          name="recipeId"
          required
        >
          {recipeOptions.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.name} ({formatMealType(recipe.meal_type)})
            </option>
          ))}
        </select>
      </label>

      <button
        className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        type="submit"
      >
        Add recipe
      </button>
    </form>
  );
}

function PlanItemCard({
  contextLabel,
  item,
  selectedSwapItemId,
  swapGroceryImpacts,
  swapSuggestions,
  view,
  weekStartDate
}: {
  contextLabel?: string;
  item: WeeklyPlanItem;
  selectedSwapItemId: string | null;
  swapGroceryImpacts: SwapGroceryImpact[];
  swapSuggestions: RuleBasedSwapSuggestion[];
  view: "day" | "profile";
  weekStartDate: string;
}) {
  const canSwap = canSwapPlanItem(item);
  const isSwapOpen = selectedSwapItemId === item.id;

  return (
    <article
      aria-label={`Planned meal ${item.display_name}`}
      className="rounded-md border border-border bg-card p-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip>{item.meal_profile_name ?? "Unassigned"}</StatusChip>
            {contextLabel ? <StatusChip>{contextLabel}</StatusChip> : null}
            <StatusChip>{formatMealType(item.meal_type)}</StatusChip>
            <StatusChip tone={item.is_approved ? "success" : "muted"}>
              {item.is_approved ? "Approved for groceries" : "Needs approval"}
            </StatusChip>
            <StatusChip tone={item.is_locked ? "success" : "muted"}>
              {item.is_locked ? "Locked" : "Unlocked"}
            </StatusChip>
            {item.is_try_this ? (
              <StatusChip tone="muted">Try This</StatusChip>
            ) : null}
            {hasMissingEstimate(item) ? (
              <StatusChip tone="muted">Missing estimate</StatusChip>
            ) : null}
          </div>
          <p className="mt-2 font-medium">{item.display_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPlanItemSupportText(item)}
          </p>
          {item.why_this ? (
            <p className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {item.why_this}
            </p>
          ) : null}
          {item.reason_labels.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.reason_labels.map((reason) => (
                <span
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  key={reason}
                >
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
          {item.recipe_name && item.recipe_name !== item.display_name ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Recipe: {item.recipe_name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {!item.is_approved ? (
            <PlanItemActionForm
              action={approveWeeklyPlanItem}
              buttonLabel="Approve for groceries"
              itemId={item.id}
              view={view}
              weekStartDate={weekStartDate}
            />
          ) : null}
          <PlanItemActionForm
            action={toggleWeeklyPlanItemLock}
            buttonLabel={item.is_locked ? "Unlock" : "Lock"}
            itemId={item.id}
            view={view}
            weekStartDate={weekStartDate}
          />
          {canSwap ? (
            <Link
              className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={buildPlanWeekHref({
                swapItemId: item.id,
                view,
                weekStartDate
              })}
            >
              Swap
            </Link>
          ) : null}
          <PlanItemActionForm
            action={removeWeeklyPlanItem}
            buttonLabel="Remove"
            itemId={item.id}
            tone="danger"
            view={view}
            weekStartDate={weekStartDate}
          />
        </div>
      </div>

      {isSwapOpen ? (
        <MealSwapPanel
          item={item}
          swapGroceryImpacts={swapGroceryImpacts}
          suggestions={swapSuggestions}
          view={view}
          weekStartDate={weekStartDate}
        />
      ) : null}
    </article>
  );
}

function MealSwapPanel({
  item,
  swapGroceryImpacts,
  suggestions,
  view,
  weekStartDate
}: {
  item: WeeklyPlanItem;
  swapGroceryImpacts: SwapGroceryImpact[];
  suggestions: RuleBasedSwapSuggestion[];
  view: "day" | "profile";
  weekStartDate: string;
}) {
  const groceryImpactByRecipeId = new Map(
    swapGroceryImpacts.map((impact) => [impact.recipeId, impact])
  );

  return (
    <section className="mt-4 rounded-md border border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold">Swap {item.display_name}</h4>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Pick a reviewed replacement. Existing finalized or shopping lists
            are not changed automatically.
          </p>
        </div>
        <Link
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          href={buildPlanWeekHref({ view, weekStartDate })}
        >
          Cancel
        </Link>
      </div>

      {suggestions.length === 0 ? (
        <p className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          No eligible swaps are available for this meal right now.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {suggestions.map((suggestion) => (
            <article
              className="rounded-md border border-border bg-card p-3"
              key={suggestion.recipeId}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h5 className="font-medium">{suggestion.recipeName}</h5>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Score {suggestion.score}
                    {suggestion.warningCount > 0
                      ? ` - ${suggestion.warningCount} preference warning${suggestion.warningCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestion.reasonLabels.map((reason) => (
                      <span
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                        key={reason}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                  <SwapGroceryImpactSummary
                    impact={groceryImpactByRecipeId.get(suggestion.recipeId) ?? null}
                  />
                </div>
                <form action={confirmWeeklyPlanItemSwap}>
                  <input name="weekStartDate" type="hidden" value={weekStartDate} />
                  <input name="weeklyPlanItemId" type="hidden" value={item.id} />
                  <input name="recipeId" type="hidden" value={suggestion.recipeId} />
                  <input name="view" type="hidden" value={view} />
                  <button
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    type="submit"
                  >
                    Confirm swap
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SwapGroceryImpactSummary({
  impact
}: {
  impact: SwapGroceryImpact | null;
}) {
  if (!impact) {
    return (
      <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        Grocery impact could not be previewed. Confirming still updates only
        the meal plan.
      </p>
    );
  }

  if (!impact.hasGroceryList) {
    return (
      <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        No grocery list exists for this week yet. This swap affects the next
        generated list.
      </p>
    );
  }

  if (!impact.appliesToApprovedItem) {
    return (
      <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        This meal is not approved for groceries yet, so the swap has no grocery
        impact until approval.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Grocery impact</p>
      <p className="mt-1">
        {impact.hasChanges
          ? `${formatImpactCount(impact.addedCount, "add")} - ${formatImpactCount(impact.removedCount, "remove")} - ${formatImpactCount(impact.keptCount, "keep")}`
          : "No item changes compared with the current grocery list."}
      </p>
      {impact.listStatus === "finalized" ||
      impact.listStatus === "shopping_started" ? (
        <p className="mt-1">
          Current {formatGroceryListStatus(impact.listStatus)} list stays
          unchanged until you review pending changes.
        </p>
      ) : null}
    </div>
  );
}

function formatPlanItemSupportText(item: WeeklyPlanItem) {
  const approvalText = item.is_approved
    ? "Will be included when groceries are generated."
    : "Approve this item when it should be included in groceries.";
  const lockText = item.is_locked
    ? "Locked for this week's plan."
    : "Unlocked and easy to change.";
  const nutritionText = hasMissingEstimate(item)
    ? "Nutrition estimate is incomplete."
    : "Nutrition estimate is available.";

  return `${approvalText} ${lockText} ${nutritionText}`;
}

function formatImpactCount(
  count: number,
  verb: "add" | "keep" | "remove"
) {
  return `${count} ${verb}`;
}

function formatGroceryListStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSlotLabel(slotLabel: string) {
  if (mealTypes.includes(slotLabel as MealType)) {
    return formatMealType(slotLabel as MealType);
  }

  return slotLabel;
}

function buildPlanWeekHref({
  swapItemId,
  view,
  weekStartDate
}: {
  swapItemId?: string | null;
  view: "day" | "profile";
  weekStartDate: string;
}) {
  const params = new URLSearchParams({
    view,
    weekStartDate
  });

  if (swapItemId) {
    params.set("swapItemId", swapItemId);
  }

  return `/plan-week?${params.toString()}`;
}

function hasMissingEstimate(item: WeeklyPlanItem) {
  return (
    item.estimated_calories === null || item.estimated_protein_grams === null
  );
}

function canSwapPlanItem(item: WeeklyPlanItem) {
  return (
    !item.is_locked &&
    !item.is_try_this &&
    item.meal_profile_type === "adult" &&
    Boolean(item.recipe_id)
  );
}

function PlanItemActionForm({
  action,
  buttonLabel,
  itemId,
  tone = "default",
  view,
  weekStartDate
}: {
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  itemId: string;
  tone?: "default" | "danger";
  view: "day" | "profile";
  weekStartDate: string;
}) {
  const buttonClassName =
    tone === "danger"
      ? "rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      : "rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <form action={action}>
      <input name="weekStartDate" type="hidden" value={weekStartDate} />
      <input name="weeklyPlanItemId" type="hidden" value={itemId} />
      <input name="view" type="hidden" value={view} />
      <button className={buttonClassName} type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}

function StatusChip({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: "default" | "muted" | "success";
}) {
  const className =
    tone === "success"
      ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
      : tone === "muted"
        ? "rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
        : "rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium";

  return <span className={className}>{children}</span>;
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
