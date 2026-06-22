import Link from "next/link";
import {
  formatMealType,
  formatRecipeStatus,
  recipeStatuses,
  type RecipeWithDetails
} from "@/lib/recipes/types";
import { getRecipes } from "@/lib/recipes/data";
import {
  filterRecipes,
  type RecipeFilters,
  type RecipeNutritionFilter,
  type RecipePlanningFilter
} from "@/lib/recipes/filter-recipes";
import {
  getRecipeApprovalDisplay,
  getRecipeNutritionDisplay
} from "@/lib/recipes/recipe-display";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type RecipesPageProps = {
  searchParams: Promise<{
    message?: string;
    nutrition?: string;
    planning?: string;
    q?: string;
    status?: string;
  }>;
};

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const params = await searchParams;
  const { message } = params;

  if (!householdContext.household) {
    return null;
  }

  const recipes = await getRecipes(householdContext.household.id);
  const filters = normalizeRecipeFilters(params);
  const filteredRecipes = filterRecipes(recipes, filters);
  const hasActiveFilters =
    Boolean(filters.q) ||
    filters.status !== "all" ||
    filters.planning !== "all" ||
    filters.nutrition !== "all";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Recipe library
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Recipes
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Store basic recipes with structured ingredients, tags, nutrition
            estimates, and profile approvals.
          </p>
        </div>
        <Link
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/recipes/new"
        >
          Add recipe
        </Link>
      </div>

      {message ? <RecipeMessage message={message} /> : null}

      {recipes.length > 0 ? (
        <RecipeFiltersForm
          filters={filters}
          filteredCount={filteredRecipes.length}
          totalCount={recipes.length}
        />
      ) : null}

      {filteredRecipes.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : hasActiveFilters ? (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            No matching recipes
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Adjust filters</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Clear one or more filters to see more saved recipes.
          </p>
          <Link
            className="mt-4 inline-flex rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
            href="/recipes"
          >
            Clear filters
          </Link>
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            No recipes yet
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Add the first recipe</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with a simple meal and a few structured ingredient rows.
            Paste parsing, weekly planning, and grocery generation come later.
          </p>
        </section>
      )}
    </section>
  );
}

function RecipeFiltersForm({
  filteredCount,
  filters,
  totalCount
}: {
  filteredCount: number;
  filters: Required<RecipeFilters>;
  totalCount: number;
}) {
  return (
    <form className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-medium">
          Search recipes
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
            defaultValue={filters.q}
            name="q"
            placeholder="Name or tag"
            type="search"
          />
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
            defaultValue={filters.status}
            name="status"
          >
            <option value="all">All statuses</option>
            {recipeStatuses.map((status) => (
              <option key={status} value={status}>
                {formatRecipeStatus(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Planning
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
            defaultValue={filters.planning}
            name="planning"
          >
            <option value="all">All recipes</option>
            <option value="approved">Approved for planning</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Nutrition
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
            defaultValue={filters.nutrition}
            name="nutrition"
          >
            <option value="all">All estimates</option>
            <option value="needs_review">Needs review</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} recipes
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            type="submit"
          >
            Apply filters
          </button>
          <Link
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
            href="/recipes"
          >
            Clear filters
          </Link>
        </div>
      </div>
    </form>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const approvalDisplay = getRecipeApprovalDisplay(recipe.approvals);
  const nutritionDisplay = getRecipeNutritionDisplay(recipe);
  const warningEvaluations = recipe.preferenceEvaluations.filter(
    ({ evaluation }) => evaluation.status !== "allowed"
  );

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {formatMealType(recipe.meal_type)}
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{recipe.name}</h2>
        </div>
        <span className="w-fit rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          {formatRecipeStatus(recipe.status)}
        </span>
      </div>

      {recipe.description ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {recipe.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        {recipe.tags.map((tag) => (
          <span className="rounded-md bg-muted px-2 py-1" key={tag.id}>
            {tag.tag}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Ingredients</dt>
          <dd className="font-medium">{recipe.ingredients.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Planning approvals</dt>
          <dd className="font-medium">
            {approvalDisplay.summaryLabel}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estimated calories</dt>
          <dd
            className={
              nutritionDisplay.missingFields.includes("calories")
                ? "font-medium text-muted-foreground"
                : "font-medium"
            }
          >
            {nutritionDisplay.caloriesLabel}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estimated protein</dt>
          <dd
            className={
              nutritionDisplay.missingFields.includes("protein")
                ? "font-medium text-muted-foreground"
                : "font-medium"
            }
          >
            {nutritionDisplay.proteinLabel}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        <span
          className={
            nutritionDisplay.isComplete
              ? "rounded-md bg-muted px-2 py-1 text-muted-foreground"
              : "rounded-md border border-border px-2 py-1 text-muted-foreground"
          }
        >
          {nutritionDisplay.statusLabel}
        </span>
        <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
          {nutritionDisplay.confidenceLabel}
        </span>
        {!approvalDisplay.hasApprovedProfiles ? (
          <span className="rounded-md border border-border px-2 py-1 text-muted-foreground">
            Add profile approval
          </span>
        ) : null}
      </div>

      {warningEvaluations.length > 0 ? (
        <div className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {warningEvaluations.map(({ evaluation, mealProfileId, mealProfileName }) => (
            <p key={mealProfileId}>
              {mealProfileName}:{" "}
              {evaluation.blocks.length > 0
                ? `${evaluation.blocks.length} blocker`
                : `${evaluation.warnings.length} warning`}
            </p>
          ))}
        </div>
      ) : null}

      <Link
        className="mt-5 inline-flex rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={`/recipes/${recipe.id}`}
      >
        View and edit
      </Link>
    </article>
  );
}

function RecipeMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function normalizeRecipeFilters(params: {
  nutrition?: string;
  planning?: string;
  q?: string;
  status?: string;
}): Required<RecipeFilters> {
  return {
    nutrition: isRecipeNutritionFilter(params.nutrition)
      ? params.nutrition
      : "all",
    planning: isRecipePlanningFilter(params.planning)
      ? params.planning
      : "all",
    q: params.q?.trim() ?? "",
    status: recipeStatuses.includes(params.status as (typeof recipeStatuses)[number])
      ? (params.status as (typeof recipeStatuses)[number])
      : "all"
  };
}

function isRecipePlanningFilter(
  value: string | undefined
): value is RecipePlanningFilter {
  return value === "all" || value === "approved";
}

function isRecipeNutritionFilter(
  value: string | undefined
): value is RecipeNutritionFilter {
  return value === "all" || value === "needs_review";
}
