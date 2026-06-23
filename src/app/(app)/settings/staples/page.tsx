import {
  deactivateStaple,
  saveStaple
} from "@/app/(app)/settings/actions";
import { getGroceryCategories } from "@/lib/recipes/data";
import type { GroceryCategory } from "@/lib/recipes/types";
import {
  getFoods,
  getMealProfiles,
  getStaples
} from "@/lib/settings/data";
import {
  formatStapleFrequency,
  stapleFrequencies
} from "@/lib/settings/staples";
import type {
  Food,
  MealProfile,
  Staple
} from "@/lib/settings/types";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import { getStapleWrapUpAdjustmentReview } from "@/lib/weekly-wrap-up/data";

type StaplesPageProps = {
  searchParams: Promise<{
    message?: string;
    wrapUpItemId?: string;
  }>;
};

export default async function StaplesPage({
  searchParams
}: StaplesPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message, wrapUpItemId } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const [
    profiles,
    foods,
    groceryCategories,
    staples,
    wrapUpAdjustmentIntent
  ] = await Promise.all([
    getMealProfiles(householdContext.household.id),
    getFoods(householdContext.household.id),
    getGroceryCategories(householdContext.household.id),
    getStaples(householdContext.household.id),
    wrapUpItemId
      ? getStapleWrapUpAdjustmentReview({
          householdId: householdContext.household.id,
          wrapUpItemId
        })
      : Promise.resolve(null)
  ]);
  const activeStaples = staples.filter((staple) => staple.active);
  const inactiveStaples = staples.filter((staple) => !staple.active);
  const contextGroups = buildContextGroups(activeStaples, profiles);
  const wrapUpStaple = wrapUpAdjustmentIntent
    ? staples.find((staple) => staple.id === wrapUpAdjustmentIntent.stapleId) ??
      null
    : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Staples
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Manage reusable household and profile staples. These are settings
          only in this slice; weekly review and grocery generation come later.
        </p>
      </div>

      {message ? <SettingsMessage message={message} /> : null}

      {wrapUpItemId ? (
        <StapleWrapUpReviewCallout
          intent={wrapUpAdjustmentIntent}
          staple={wrapUpStaple}
        />
      ) : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Add staple</h2>
        <StapleForm
          foods={foods}
          groceryCategories={groceryCategories}
          labelPrefix="New staple"
          mealProfiles={profiles}
          submitLabel="Create staple"
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Active staples</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Staples are grouped by Household or meal profile context.
          </p>
        </div>

        {activeStaples.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            No active staples yet.
          </p>
        ) : (
          contextGroups.map((group) => (
            <div className="space-y-3" key={group.id}>
              <h3 className="text-lg font-semibold">{group.name}</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {group.staples.map((staple) => (
                  <StapleCard
                    foods={foods}
                    groceryCategories={groceryCategories}
                    isReviewTarget={
                      staple.id === wrapUpAdjustmentIntent?.stapleId
                    }
                    key={staple.id}
                    mealProfiles={profiles}
                    staple={staple}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {inactiveStaples.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Inactive staples</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {inactiveStaples.map((staple) => (
              <article
                className="rounded-lg border border-border bg-muted/30 p-4"
                key={staple.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {staple.display_name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {staple.meal_profile_name ?? "Household"} -{" "}
                      {formatStapleFrequency(staple.frequency)}
                    </p>
                  </div>
                  <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                    Inactive
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function StapleCard({
  foods,
  groceryCategories,
  isReviewTarget = false,
  mealProfiles,
  staple
}: {
  foods: Food[];
  groceryCategories: GroceryCategory[];
  isReviewTarget?: boolean;
  mealProfiles: MealProfile[];
  staple: Staple;
}) {
  return (
    <article
      className={`rounded-lg border bg-card p-5 shadow-sm ${
        isReviewTarget ? "border-amber-300 ring-2 ring-amber-200" : "border-border"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">{staple.display_name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {staple.meal_profile_name ?? "Household"} -{" "}
            {formatStapleFrequency(staple.frequency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatStapleQuantity(staple)}
            {staple.grocery_category_name
              ? ` - ${staple.grocery_category_name}`
              : ""}
          </p>
        </div>
        <form action={deactivateStaple}>
          <input name="stapleId" type="hidden" value={staple.id} />
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            type="submit"
          >
            Deactivate
          </button>
        </form>
      </div>

      <StapleForm
        foods={foods}
        groceryCategories={groceryCategories}
        labelPrefix={`${staple.display_name} staple`}
        mealProfiles={mealProfiles}
        staple={staple}
        submitLabel="Save staple"
      />
    </article>
  );
}

function StapleWrapUpReviewCallout({
  intent,
  staple
}: {
  intent: Awaited<ReturnType<typeof getStapleWrapUpAdjustmentReview>>;
  staple: Staple | null;
}) {
  if (!intent || !staple) {
    return (
      <section className="rounded-lg border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
        This wrap-up item could not be matched to one active staple. Review
        staples manually before changing anything.
      </section>
    );
  }

  const isPause = intent.resolution === "pause_future_buy";

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <h2 className="text-lg font-semibold">Review staple change</h2>
      <p className="mt-2 leading-6">
        You marked {intent.groceryDisplayName} unused and chose to{" "}
        {isPause ? "review whether to pause it" : "buy less next time"}. No
        staple has changed yet.
      </p>
      <p className="mt-2 leading-6">
        {isPause
          ? `Deactivate ${staple.display_name} only if you want MealBoard to stop suggesting it.`
          : `Edit ${staple.display_name}'s quantity, frequency, or notes, then save the staple.`}
      </p>
      {intent.notes ? (
        <p className="mt-2 rounded-md bg-white/70 px-3 py-2">
          Wrap-up note: {intent.notes}
        </p>
      ) : null}
    </section>
  );
}

function StapleForm({
  foods,
  groceryCategories,
  labelPrefix,
  mealProfiles,
  staple,
  submitLabel
}: {
  foods: Food[];
  groceryCategories: GroceryCategory[];
  labelPrefix: string;
  mealProfiles: MealProfile[];
  staple?: Staple;
  submitLabel: string;
}) {
  return (
    <form action={saveStaple} className="mt-4 space-y-4">
      {staple ? <input name="stapleId" type="hidden" value={staple.id} /> : null}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.5fr)_minmax(0,0.6fr)]">
        <label className="block text-sm font-medium">
          {labelPrefix} name
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={staple?.display_name ?? ""}
            name="displayName"
            required
            type="text"
          />
        </label>
        <label className="block text-sm font-medium">
          {labelPrefix} default quantity
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={staple?.default_quantity ?? ""}
            min="0.01"
            name="quantity"
            step="any"
            type="number"
          />
        </label>
        <label className="block text-sm font-medium">
          {labelPrefix} default unit
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={staple?.default_unit ?? ""}
            name="unit"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium">
          {labelPrefix} context
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={staple?.meal_profile_id ?? ""}
            name="mealProfileId"
          >
            <option value="">Household</option>
            {mealProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          {labelPrefix} frequency
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={staple?.frequency ?? "as_needed"}
            name="frequency"
          >
            {stapleFrequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {formatStapleFrequency(frequency)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium">
          {labelPrefix} food link
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={staple?.food_id ?? ""}
            name="foodId"
          >
            <option value="">No food link</option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          {labelPrefix} grocery category
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={staple?.grocery_category_id ?? ""}
            name="groceryCategoryId"
          >
            <option value="">Needs category</option>
            {groceryCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium">
        {labelPrefix} preferred grocery quantity
        <input
          className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          defaultValue={staple?.preferred_quantity_text ?? ""}
          name="preferredQuantityText"
          placeholder="1 pack, 1 bag, 1 container"
          type="text"
        />
      </label>

      <label className="block text-sm font-medium">
        {labelPrefix} notes
        <textarea
          className="mt-1 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          defaultValue={staple?.notes ?? ""}
          name="notes"
        />
      </label>

      <button
        className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function buildContextGroups(staples: Staple[], mealProfiles: MealProfile[]) {
  const contextOrder = [
    { id: "household", name: "Household" },
    ...mealProfiles.map((profile) => ({
      id: profile.id,
      name: profile.name
    }))
  ];

  return contextOrder
    .map((context) => ({
      ...context,
      staples: staples.filter((staple) =>
        context.id === "household"
          ? staple.meal_profile_id === null
          : staple.meal_profile_id === context.id
      )
    }))
    .filter((group) => group.staples.length > 0);
}

function formatStapleQuantity(staple: Staple) {
  if (staple.preferred_quantity_text) {
    return staple.preferred_quantity_text;
  }

  const quantity = [staple.default_quantity, staple.default_unit]
    .filter((value) => value !== null)
    .join(" ");

  return quantity || "Quantity not set";
}

function SettingsMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
