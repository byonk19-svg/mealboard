import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { getGroceryCategories, getRecipe } from "@/lib/recipes/data";
import { getFoods, getMealProfiles } from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type RecipeDetailPageProps = {
  params: Promise<{
    recipeId: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function RecipeDetailPage({
  params,
  searchParams
}: RecipeDetailPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { recipeId } = await params;
  const { message } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const [recipe, profiles, foods, categories] = await Promise.all([
    getRecipe(householdContext.household.id, recipeId),
    getMealProfiles(householdContext.household.id),
    getFoods(householdContext.household.id),
    getGroceryCategories(householdContext.household.id)
  ]);

  if (!recipe) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Recipes</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          {recipe.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Review recipe details, structured ingredients, tags, nutrition
          estimates, and profile approvals.
        </p>
      </div>

      {message ? <RecipeMessage message={message} /> : null}

      {recipe.source_url ? (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Recipe source
          </p>
          <a
            className="mt-2 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
            href={recipe.source_url}
            rel="noreferrer"
            target="_blank"
          >
            {recipe.source_title ?? recipe.source_url}
          </a>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            MealBoard stores the reviewed recipe fields and source attribution,
            not the original page content.
          </p>
        </section>
      ) : null}

      <RecipeForm
        categories={categories}
        foods={foods}
        profiles={profiles}
        recipe={recipe}
      />
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
