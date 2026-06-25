import { RecipeImportReviewClient } from "@/components/recipes/recipe-import-review-client";
import { getGroceryCategories } from "@/lib/recipes/data";
import { getFoods, getMealProfiles } from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type RecipeImportReviewPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function RecipeImportReviewPage({
  searchParams
}: RecipeImportReviewPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message } = await searchParams;

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

      {message ? <RecipeImportMessage message={message} /> : null}

      <RecipeImportReviewClient
        categories={categories}
        foods={foods}
        profiles={profiles}
      />
    </section>
  );
}

function RecipeImportMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
