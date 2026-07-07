import { notFound } from "next/navigation";
import Link from "next/link";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { RecipeStepsEditor } from "@/components/recipes/recipe-steps-editor";
import {
  getActiveCookingSession,
  getCookingModeRecipe,
  getRecipeStepDrafts
} from "@/lib/cooking-mode/data";
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

  const [recipe, cookingModeRecipe, profiles, foods, categories] = await Promise.all([
    getRecipe(householdContext.household.id, recipeId),
    getCookingModeRecipe({
      householdId: householdContext.household.id,
      recipeId
    }),
    getMealProfiles(householdContext.household.id),
    getFoods(householdContext.household.id),
    getGroceryCategories(householdContext.household.id)
  ]);

  if (!recipe) {
    notFound();
  }

  const activeCookingSession = cookingModeRecipe
    ? await getActiveCookingSession({
        householdId: householdContext.household.id,
        recipeId
      })
    : null;

  return (
    <section className="space-y-7">
      <section className="calm-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-6 md:p-8">
            <p className="calm-eyebrow">Recipes</p>
            <h1 className="calm-heading mt-3 text-4xl leading-tight md:text-[40px]">
              {recipe.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Review recipe details, structured ingredients, tags, nutrition
              estimates, and profile approvals.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {cookingModeRecipe?.canStartCooking ? (
                <Link
                  className="calm-button-primary px-5 py-3 hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={`/recipes/${recipe.id}/cook`}
                >
                  {activeCookingSession ? "Resume cooking" : "Start cooking"}
                </Link>
              ) : (
                <a
                  className="calm-button-secondary px-5 py-3 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href="#cooking-steps"
                >
                  Review cooking steps
                </a>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 bg-muted/70 p-5 lg:grid-cols-1 lg:p-6">
            <RecipeHeroMetric
              label="Ingredients"
              value={String(recipe.ingredients.length)}
            />
            <RecipeHeroMetric label="Tags" value={String(recipe.tags.length)} />
            <RecipeHeroMetric
              label="Calories"
              value={
                recipe.estimated_calories_per_serving
                  ? String(recipe.estimated_calories_per_serving)
                  : "Not set"
              }
            />
            <RecipeHeroMetric
              label="Protein"
              value={
                recipe.estimated_protein_grams_per_serving
                  ? `${recipe.estimated_protein_grams_per_serving}g`
                  : "Not set"
              }
            />
          </dl>
        </div>
      </section>

      {message ? <RecipeMessage message={message} /> : null}

      {recipe.source_url ? (
        <section className="calm-card p-5">
          <p className="calm-eyebrow">Recipe source</p>
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

      {cookingModeRecipe ? (
        <div id="cooking-steps">
          <RecipeStepsEditor
            draftSteps={getRecipeStepDrafts(cookingModeRecipe.instructions)}
            recipeId={recipe.id}
            steps={cookingModeRecipe.steps}
          />
        </div>
      ) : null}
    </section>
  );
}

function RecipeMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function RecipeHeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3">
      <dt className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-base font-extrabold text-primary">{value}</dd>
    </div>
  );
}
