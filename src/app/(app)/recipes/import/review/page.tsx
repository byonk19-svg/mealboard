import { RecipeImportReviewClient } from "@/components/recipes/recipe-import-review-client";
import { getGroceryCategories } from "@/lib/recipes/data";
import { getFoods, getMealProfiles } from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

export default async function RecipeImportReviewPage() {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    return null;
  }

  const [profiles, foods, categories] = await Promise.all([
    getMealProfiles(householdContext.household.id),
    getFoods(householdContext.household.id),
    getGroceryCategories(householdContext.household.id)
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Recipe import
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Review imported recipe
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Check imported fields and flagged ingredients before saving this as a
          normal MealBoard recipe.
        </p>
      </div>

      <RecipeImportReviewClient
        categories={categories}
        foods={foods}
        profiles={profiles}
      />
    </section>
  );
}
