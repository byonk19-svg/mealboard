import { RecipeForm } from "@/components/recipes/recipe-form";
import { getGroceryCategories } from "@/lib/recipes/data";
import { getFoods, getMealProfiles } from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type NewRecipePageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function NewRecipePage({
  searchParams
}: NewRecipePageProps) {
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
        <p className="text-sm font-medium text-muted-foreground">Recipes</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Add Recipe
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Add a basic recipe with reviewed structured ingredients, pasted
          ingredient text, tags, nutrition estimates, and profile approvals.
        </p>
      </div>

      {message ? <RecipeMessage message={message} /> : null}

      <RecipeForm categories={categories} foods={foods} profiles={profiles} />
    </section>
  );
}

function RecipeMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
