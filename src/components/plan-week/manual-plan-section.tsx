import {
  addWeeklyPlanItem,
  approveWeeklyPlanItem,
  removeWeeklyPlanItem,
  toggleWeeklyPlanItemLock
} from "@/app/(app)/plan-week/actions";
import { formatMealType, type MealType } from "@/lib/recipes/types";
import type { MealProfile } from "@/lib/settings/types";
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
  "baby_meal",
  "other"
] as const satisfies readonly MealType[];

export function ManualPlanSection({
  planItemsByDate,
  profiles,
  recipeOptions,
  weekDates,
  weekStartDate,
  weeklyPlanId
}: {
  planItemsByDate: Map<string, WeeklyPlanItem[]>;
  profiles: MealProfile[];
  recipeOptions: PlanRecipeOption[];
  weekDates: WeekDate[];
  weekStartDate: string;
  weeklyPlanId: string;
}) {
  const canAddItems = profiles.length > 0 && recipeOptions.length > 0;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Manual plan</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Add saved recipes to a specific day, profile, and meal slot. This
          stays manual for now; smart suggestions and grocery generation come
          later.
        </p>
      </div>

      {!canAddItems ? (
        <div className="mt-5 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          {recipeOptions.length === 0
            ? "Add a recipe before assigning meals to this week."
            : "Add meal profiles before assigning recipes to this week."}
        </div>
      ) : null}

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
              {(planItemsByDate.get(date.dateKey) ?? []).map((item) => (
                <PlanItemCard
                  item={item}
                  key={item.id}
                  weekStartDate={weekStartDate}
                />
              ))}
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
    </section>
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
        Profile
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
        Meal slot
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
        Recipe
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
  item,
  weekStartDate
}: {
  item: WeeklyPlanItem;
  weekStartDate: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip>{item.meal_profile_name ?? "Unassigned"}</StatusChip>
            <StatusChip>{formatMealType(item.meal_type)}</StatusChip>
            <StatusChip tone={item.is_approved ? "success" : "muted"}>
              {item.is_approved ? "Approved" : "Draft"}
            </StatusChip>
            <StatusChip tone={item.is_locked ? "success" : "muted"}>
              {item.is_locked ? "Locked" : "Unlocked"}
            </StatusChip>
          </div>
          <p className="mt-2 font-medium">{item.display_name}</p>
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
              buttonLabel="Approve"
              itemId={item.id}
              weekStartDate={weekStartDate}
            />
          ) : null}
          <PlanItemActionForm
            action={toggleWeeklyPlanItemLock}
            buttonLabel={item.is_locked ? "Unlock" : "Lock"}
            itemId={item.id}
            weekStartDate={weekStartDate}
          />
          <PlanItemActionForm
            action={removeWeeklyPlanItem}
            buttonLabel="Remove"
            itemId={item.id}
            tone="danger"
            weekStartDate={weekStartDate}
          />
        </div>
      </div>
    </div>
  );
}

function PlanItemActionForm({
  action,
  buttonLabel,
  itemId,
  tone = "default",
  weekStartDate
}: {
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  itemId: string;
  tone?: "default" | "danger";
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
