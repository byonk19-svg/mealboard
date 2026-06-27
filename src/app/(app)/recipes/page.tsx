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
    <section className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="calm-eyebrow">Recipe library</p>
          <h1 className="calm-heading mt-3 text-4xl md:text-[40px] md:leading-[48px]">
            Recipes
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Store basic recipes with structured ingredients, tags, nutrition
            estimates, and profile approvals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border border-primary/30 bg-card px-4 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="/recipes/import"
          >
            Import recipe
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(22,56,38,0.16)] hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="/recipes/new"
          >
            Add recipe
          </Link>
        </div>
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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : hasActiveFilters ? (
        <section className="calm-card p-6">
          <p className="calm-eyebrow">No matching recipes</p>
          <h2 className="calm-heading mt-3 text-2xl">Adjust filters</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Clear one or more filters to see more saved recipes.
          </p>
          <Link
            className="mt-4 inline-flex rounded-lg border border-primary/30 px-4 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-muted"
            href="/recipes"
          >
            Clear filters
          </Link>
        </section>
      ) : (
        <section className="calm-card p-6">
          <p className="calm-eyebrow">No recipes yet</p>
          <h2 className="calm-heading mt-3 text-2xl">Add the first recipe</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with a simple meal and a few structured ingredient rows.
            Profile approvals make the recipe available for Plan Week and
            grocery generation.
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
    <form className="calm-card p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-medium">
          Search recipes
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={filters.q}
            name="q"
            placeholder="Name or tag"
            type="search"
          />
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
            type="submit"
          >
            Apply filters
          </button>
          <Link
            className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-muted"
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
    <article className="calm-card overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              {formatMealType(recipe.meal_type)}
            </p>
            <h2 className="calm-heading mt-1 text-xl leading-tight">
              {recipe.name}
            </h2>
          </div>
          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
            {formatRecipeStatus(recipe.status)}
          </span>
        </div>

        {recipe.description ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {recipe.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          {recipe.tags.map((tag) => (
            <span
              className="rounded-full bg-muted px-3 py-1 text-primary"
              key={tag.id}
            >
              {tag.tag}
            </span>
          ))}
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <RecipeMetric label="Ingredients" value={recipe.ingredients.length} />
          <RecipeMetric
            label="Approvals"
            value={approvalDisplay.summaryLabel}
          />
          <RecipeMetric
            muted={nutritionDisplay.missingFields.includes("calories")}
            label="Calories"
            value={nutritionDisplay.caloriesLabel}
          />
          <RecipeMetric
            muted={nutritionDisplay.missingFields.includes("protein")}
            label="Protein"
            value={nutritionDisplay.proteinLabel}
          />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span
            className={
              nutritionDisplay.isComplete
                ? "rounded-full bg-muted px-3 py-1 text-muted-foreground"
                : "rounded-full border border-border px-3 py-1 text-muted-foreground"
            }
          >
            {nutritionDisplay.statusLabel}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            {nutritionDisplay.confidenceLabel}
          </span>
          {!approvalDisplay.hasApprovedProfiles ? (
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
              Add profile approval
            </span>
          ) : null}
        </div>

        {warningEvaluations.length > 0 ? (
          <div className="mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            {warningEvaluations.map(
              ({ evaluation, mealProfileId, mealProfileName }) => (
                <p key={mealProfileId}>
                  {mealProfileName}:{" "}
                  {evaluation.blocks.length > 0
                    ? `${evaluation.blocks.length} blocker`
                    : `${evaluation.warnings.length} warning`}
                </p>
              )
            )}
          </div>
        ) : null}

        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-primary/30 bg-card px-4 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={`/recipes/${recipe.id}`}
        >
          View and edit
        </Link>
      </div>
    </article>
  );
}

function RecipeMetric({
  label,
  muted = false,
  value
}: {
  label: string;
  muted?: boolean;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 font-bold ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function RecipeMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
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
