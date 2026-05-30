import { formatEstimateConfidence, type EstimateConfidence } from "./types";

type RecipeNutritionFields = {
  estimated_calories_per_serving: number | null;
  estimated_protein_grams_per_serving: number | null;
  nutrition_confidence: EstimateConfidence | null;
};

type RecipeApprovalFields = {
  approved_for_planning: boolean;
  meal_profile_name: string;
};

export type RecipeNutritionDisplay = {
  caloriesLabel: string;
  confidenceLabel: string;
  isComplete: boolean;
  missingFields: string[];
  proteinLabel: string;
  statusLabel: string;
};

export type RecipeApprovalDisplay = {
  approvedProfileNames: string[];
  hasApprovedProfiles: boolean;
  summaryLabel: string;
};

export function getRecipeNutritionDisplay(
  recipe: RecipeNutritionFields
): RecipeNutritionDisplay {
  const missingFields: string[] = [];

  if (recipe.estimated_calories_per_serving === null) {
    missingFields.push("calories");
  }

  if (recipe.estimated_protein_grams_per_serving === null) {
    missingFields.push("protein");
  }

  return {
    caloriesLabel:
      recipe.estimated_calories_per_serving === null
        ? "Missing calories"
        : `${recipe.estimated_calories_per_serving} cal/serving`,
    confidenceLabel: recipe.nutrition_confidence
      ? `${formatEstimateConfidence(recipe.nutrition_confidence)} confidence`
      : "No confidence set",
    isComplete: missingFields.length === 0,
    missingFields,
    proteinLabel:
      recipe.estimated_protein_grams_per_serving === null
        ? "Missing protein"
        : `${recipe.estimated_protein_grams_per_serving}g protein/serving`,
    statusLabel:
      missingFields.length === 0
        ? "Nutrition estimate ready"
        : "Needs nutrition estimate"
  };
}

export function getRecipeApprovalDisplay(
  approvals: RecipeApprovalFields[]
): RecipeApprovalDisplay {
  const approvedProfileNames = approvals
    .filter((approval) => approval.approved_for_planning)
    .map((approval) => approval.meal_profile_name);

  return {
    approvedProfileNames,
    hasApprovedProfiles: approvedProfileNames.length > 0,
    summaryLabel:
      approvedProfileNames.length > 0
        ? `Approved for ${approvedProfileNames.join(", ")}`
        : "No planning approvals yet"
  };
}
