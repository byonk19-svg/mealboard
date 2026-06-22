import type { MealType, RecipeStatus } from "@/lib/recipes/types";

export type WrapUpPlanItem = {
  displayName: string;
  isTryThis: boolean;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: MealType;
  planDate: string;
  recipeId: string | null;
  recipeName: string | null;
  recipeStatus: RecipeStatus | null;
  weeklyPlanItemId: string;
};

export type WrapUpGroceryItem = {
  alreadyHave: boolean;
  checked: boolean;
  displayName: string;
  groceryListItemId: string;
};

export type RecipeReviewWrapUpCandidate = {
  displayName: string;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: MealType;
  planDate: string;
  promptType: "recipe_review";
  recipeId: string;
  recipeName: string;
  weeklyPlanItemId: string;
};

export type UnusedGroceryWrapUpCandidate = {
  displayName: string;
  groceryListItemId: string;
  promptType: "unused_grocery_item";
};

export type WeeklyWrapUpCandidates = {
  recipeReviewCandidates: RecipeReviewWrapUpCandidate[];
  unusedGroceryCandidates: UnusedGroceryWrapUpCandidate[];
};

export function buildWeeklyWrapUpCandidates({
  existingReviewedPlanItemIds,
  groceryItems,
  planItems
}: {
  existingReviewedPlanItemIds: Set<string>;
  groceryItems: WrapUpGroceryItem[];
  planItems: WrapUpPlanItem[];
}): WeeklyWrapUpCandidates {
  return {
    recipeReviewCandidates: planItems
      .filter((item) => item.recipeId && shouldPromptForRecipeReview(item))
      .filter((item) => !existingReviewedPlanItemIds.has(item.weeklyPlanItemId))
      .map((item) => ({
        displayName: item.displayName,
        mealProfileId: item.mealProfileId,
        mealProfileName: item.mealProfileName,
        mealType: item.mealType,
        planDate: item.planDate,
        promptType: "recipe_review",
        recipeId: item.recipeId ?? "",
        recipeName: item.recipeName ?? item.displayName,
        weeklyPlanItemId: item.weeklyPlanItemId
      })),
    unusedGroceryCandidates: groceryItems
      .filter((item) => !item.checked && !item.alreadyHave)
      .map((item) => ({
        displayName: item.displayName,
        groceryListItemId: item.groceryListItemId,
        promptType: "unused_grocery_item"
      }))
  };
}

function shouldPromptForRecipeReview(item: WrapUpPlanItem) {
  return item.isTryThis || item.recipeStatus === "tried";
}
