import type { RecipeStatus, RecipeWithDetails } from "./types";

export type RecipePlanningFilter = "all" | "approved";
export type RecipeNutritionFilter = "all" | "needs_review";

export type RecipeFilters = {
  nutrition?: RecipeNutritionFilter;
  planning?: RecipePlanningFilter;
  q?: string;
  status?: RecipeStatus | "all";
};

export function filterRecipes(
  recipes: RecipeWithDetails[],
  filters: RecipeFilters
) {
  const query = normalize(filters.q ?? "");
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const planning = filters.planning ?? "all";
  const nutrition = filters.nutrition ?? "all";

  return recipes.filter((recipe) => {
    if (query && !matchesQuery(recipe, query)) {
      return false;
    }

    if (status && recipe.status !== status) {
      return false;
    }

    if (
      planning === "approved" &&
      !recipe.approvals.some((approval) => approval.approved_for_planning)
    ) {
      return false;
    }

    if (nutrition === "needs_review" && !needsNutritionReview(recipe)) {
      return false;
    }

    return true;
  });
}

export function needsNutritionReview(recipe: RecipeWithDetails) {
  return (
    recipe.estimated_calories_per_serving === null ||
    recipe.estimated_protein_grams_per_serving === null ||
    recipe.nutrition_confidence === null ||
    recipe.nutrition_confidence === "low"
  );
}

function matchesQuery(recipe: RecipeWithDetails, query: string) {
  if (normalize(recipe.name).includes(query)) {
    return true;
  }

  return recipe.tags.some((tag) => normalize(tag.tag).includes(query));
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
