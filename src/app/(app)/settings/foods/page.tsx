import {
  archiveSavedFood,
  restoreSavedFood,
  saveSavedFood
} from "@/app/(app)/settings/actions";
import { getGroceryCategories } from "@/lib/recipes/data";
import type { GroceryCategory } from "@/lib/recipes/types";
import { getSavedFoods } from "@/lib/settings/data";
import type { SavedFood } from "@/lib/settings/types";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type SavedFoodsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function SavedFoodsPage({
  searchParams
}: SavedFoodsPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const [foods, groceryCategories] = await Promise.all([
    getSavedFoods(householdContext.household.id),
    getGroceryCategories(householdContext.household.id)
  ]);
  const activeFoods = foods.filter((food) => !food.archived_at);
  const archivedFoods = foods.filter((food) => food.archived_at);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Saved Foods
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Manage the household food list used by preferences, staples, recipes,
          Baby solids status, and grocery defaults.
        </p>
      </div>

      {message ? <SettingsMessage message={message} /> : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Add food</h2>
        <SavedFoodForm
          groceryCategories={groceryCategories}
          labelPrefix="New food"
          submitLabel="Create food"
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Active foods</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Active foods can be selected in preferences, staples, recipes, and
            Baby food status.
          </p>
        </div>

        {activeFoods.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            No active foods yet.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeFoods.map((food) => (
              <SavedFoodCard
                food={food}
                groceryCategories={groceryCategories}
                key={food.id}
              />
            ))}
          </div>
        )}
      </section>

      {archivedFoods.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Archived foods</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {archivedFoods.map((food) => (
              <ArchivedFoodCard food={food} key={food.id} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SavedFoodCard({
  food,
  groceryCategories
}: {
  food: SavedFood;
  groceryCategories: GroceryCategory[];
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">{food.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFoodDefaults(food)}
          </p>
        </div>
        <form action={archiveSavedFood}>
          <input name="foodId" type="hidden" value={food.id} />
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            type="submit"
          >
            Archive
          </button>
        </form>
      </div>

      <SavedFoodForm
        food={food}
        groceryCategories={groceryCategories}
        labelPrefix={`${food.name} food`}
        submitLabel="Save food"
      />
    </article>
  );
}

function ArchivedFoodCard({ food }: { food: SavedFood }) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{food.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatFoodDefaults(food)}
          </p>
        </div>
        <form action={restoreSavedFood}>
          <input name="foodId" type="hidden" value={food.id} />
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            type="submit"
          >
            Restore
          </button>
        </form>
      </div>
    </article>
  );
}

function SavedFoodForm({
  food,
  groceryCategories,
  labelPrefix,
  submitLabel
}: {
  food?: SavedFood;
  groceryCategories: GroceryCategory[];
  labelPrefix: string;
  submitLabel: string;
}) {
  return (
    <form action={saveSavedFood} className="mt-4 space-y-4">
      {food ? <input name="foodId" type="hidden" value={food.id} /> : null}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)_minmax(0,0.8fr)]">
        <label className="block text-sm font-medium">
          {labelPrefix} name
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={food?.name ?? ""}
            name="name"
            required
            type="text"
          />
        </label>

        <label className="block text-sm font-medium">
          {labelPrefix} default unit
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={food?.default_unit ?? ""}
            name="defaultUnit"
            placeholder="each, bunch, oz"
            type="text"
          />
        </label>

        <label className="block text-sm font-medium">
          {labelPrefix} grocery category
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={food?.default_grocery_category_id ?? ""}
            name="defaultGroceryCategoryId"
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

      <button
        className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function formatFoodDefaults(food: SavedFood) {
  const parts = [
    food.default_unit ? `Default unit: ${food.default_unit}` : null,
    food.grocery_category_name ? `Category: ${food.grocery_category_name}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : "Defaults not set";
}

function SettingsMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
