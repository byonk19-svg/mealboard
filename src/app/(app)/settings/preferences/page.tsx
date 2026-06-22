import {
  createPreferenceFood,
  deleteFoodPreference,
  saveFoodPreference
} from "@/app/(app)/settings/actions";
import {
  formatPreferenceLevel,
  preferenceLevels,
  type Food,
  type FoodPreference,
  type MealProfile
} from "@/lib/settings/types";
import {
  getFoodPreferences,
  getFoods,
  getMealProfiles
} from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type PreferencesPageProps = {
  searchParams: Promise<{
    createdFoodId?: string;
    message?: string;
    q?: string;
  }>;
};

export default async function PreferencesPage({
  searchParams
}: PreferencesPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { createdFoodId, message, q } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const [profiles, searchedFoods, allFoods, preferences] = await Promise.all([
    getMealProfiles(householdContext.household.id),
    getFoods(householdContext.household.id, q),
    getFoods(householdContext.household.id, undefined, { limit: null }),
    getFoodPreferences(householdContext.household.id)
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Food Preferences
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Add household profile preferences for saved foods. Create a new food
          here if it is missing.
        </p>
      </div>

      {message ? <SettingsMessage message={message} /> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Add or update preference</h2>
          <FoodSearchForm query={q ?? ""} />
          <AddFoodForm />
          <PreferenceForm
            defaultFoodId={createdFoodId}
            foods={searchedFoods}
            profiles={profiles}
          />
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Current preferences</h2>
          <div className="mt-4 space-y-3">
            {preferences.length > 0 ? (
              preferences.map((preference) => (
                <PreferenceCard
                  foods={allFoods}
                  key={preference.id}
                  preference={preference}
                  profiles={profiles}
                />
              ))
            ) : (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                No food preferences have been added yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function FoodSearchForm({ query }: { query: string }) {
  return (
    <form className="mt-4 flex gap-2" method="get">
      <input
        className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={query}
        name="q"
        placeholder="Search household foods"
        type="search"
      />
      <button
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        type="submit"
      >
        Search
      </button>
    </form>
  );
}

function AddFoodForm() {
  return (
    <form
      action={createPreferenceFood}
      className="mt-4 rounded-md border border-dashed border-border p-3"
    >
      <h3 className="font-semibold">Add a food</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a household food, then assign a preference below.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1 text-sm font-medium">
          New food name
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="name"
            placeholder="Example: avocado"
            required
          />
        </label>
        <button
          className="self-end rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="submit"
        >
          Add food
        </button>
      </div>
    </form>
  );
}

function PreferenceForm({
  defaultFoodId,
  foods,
  profiles
}: {
  defaultFoodId?: string;
  foods: Food[];
  profiles: MealProfile[];
}) {
  return (
    <form action={saveFoodPreference} className="mt-4 space-y-4">
      <ProfileSelect profiles={profiles} />
      <FoodSelect defaultValue={defaultFoodId} foods={foods} />
      <PreferenceSelect />
      <NotesFields />
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        disabled={foods.length === 0 || profiles.length === 0}
        type="submit"
      >
        Save preference
      </button>
    </form>
  );
}

function PreferenceCard({
  foods,
  preference,
  profiles
}: {
  foods: Food[];
  preference: FoodPreference;
  profiles: MealProfile[];
}) {
  return (
    <article className="rounded-md border border-border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">
          {preference.meal_profile_name} · {preference.food_name}
        </h3>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          {formatPreferenceLevel(preference.preference)}
        </span>
      </div>

      <form action={saveFoodPreference} className="mt-4 space-y-3">
        <input name="preferenceId" type="hidden" value={preference.id} />
        <ProfileSelect
          defaultValue={preference.meal_profile_id}
          profiles={profiles}
        />
        <FoodSelect defaultValue={preference.food_id} foods={foods} />
        <PreferenceSelect defaultValue={preference.preference} />
        <NotesFields
          prepNotes={preference.prep_notes ?? ""}
          notes={preference.notes ?? ""}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="submit"
          >
            Update
          </button>
          <button
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            formAction={deleteFoodPreference}
            type="submit"
          >
            Delete
          </button>
        </div>
      </form>
    </article>
  );
}

function ProfileSelect({
  defaultValue,
  profiles
}: {
  defaultValue?: string;
  profiles: MealProfile[];
}) {
  return (
    <label className="block text-sm font-medium">
      Profile
      <select
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={defaultValue ?? ""}
        name="mealProfileId"
        required
      >
        <option disabled value="">
          Choose profile
        </option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function FoodSelect({
  defaultValue,
  foods
}: {
  defaultValue?: string;
  foods: Food[];
}) {
  return (
    <label className="block text-sm font-medium">
      Food
      <select
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={defaultValue ?? ""}
        name="foodId"
        required
      >
        <option disabled value="">
          {foods.length > 0 ? "Choose food" : "No foods match this search"}
        </option>
        {foods.map((food) => (
          <option key={food.id} value={food.id}>
            {food.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreferenceSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block text-sm font-medium">
      Preference
      <select
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={defaultValue ?? "like"}
        name="preference"
      >
        {preferenceLevels.map((level) => (
          <option key={level} value={level}>
            {formatPreferenceLevel(level)}
          </option>
        ))}
      </select>
    </label>
  );
}

function NotesFields({
  notes = "",
  prepNotes = ""
}: {
  notes?: string;
  prepNotes?: string;
}) {
  return (
    <div className="grid gap-3">
      <label className="block text-sm font-medium">
        Notes
        <textarea
          className="mt-2 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          defaultValue={notes}
          name="notes"
          placeholder="General preference context"
        />
      </label>
      <label className="block text-sm font-medium">
        Prep notes
        <textarea
          className="mt-2 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          defaultValue={prepNotes}
          name="prepNotes"
          placeholder="Example: okay in burritos, not plain"
        />
      </label>
    </div>
  );
}

function SettingsMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
