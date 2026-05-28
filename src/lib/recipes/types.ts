import type {
  FoodPreferenceLevel,
  RecipePreferenceEvaluation
} from "@/lib/preferences/evaluate-recipe-for-profile";

export type RecipeStatus = "idea" | "tried" | "approved" | "favorite" | "retired";
export type RecipeRating = "love" | "like" | "okay" | "dislike" | "hard_no";
export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "drink"
  | "side"
  | "baby_meal"
  | "other";
export type EstimateConfidence = "low" | "medium" | "high";
export type RecipeRepeatRule =
  | "weekly"
  | "every_two_weeks"
  | "monthly"
  | "rarely";

export type GroceryCategory = {
  id: string;
  household_id: string;
  name: string;
};

export type Recipe = {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  status: RecipeStatus;
  meal_type: MealType;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  effort_level: string | null;
  repeat_rule: RecipeRepeatRule | null;
  instructions: string | null;
  notes: string | null;
  estimated_calories_per_serving: number | null;
  estimated_protein_grams_per_serving: number | null;
  nutrition_confidence: EstimateConfidence | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  household_id: string;
  recipe_id: string;
  food_id: string | null;
  food_name: string | null;
  display_name: string;
  quantity: number | null;
  unit: string | null;
  grocery_category_id: string | null;
  grocery_category_name: string | null;
  preparation: string | null;
  notes: string | null;
  optional: boolean;
  sort_order: number;
};

export type RecipeTag = {
  id: string;
  recipe_id: string;
  tag: string;
};

export type RecipeProfileApproval = {
  id: string;
  recipe_id: string;
  meal_profile_id: string;
  meal_profile_name: string;
  status: RecipeStatus;
  rating: RecipeRating | null;
  approved_for_planning: boolean;
  notes: string | null;
};

export type RecipeWithDetails = Recipe & {
  ingredients: RecipeIngredient[];
  tags: RecipeTag[];
  approvals: RecipeProfileApproval[];
  preferenceEvaluations: Array<{
    mealProfileId: string;
    mealProfileName: string;
    evaluation: RecipePreferenceEvaluation;
  }>;
};

export type RecipeFoodPreference = {
  meal_profile_id: string;
  meal_profile_name: string;
  food_id: string;
  food_name: string;
  preference: FoodPreferenceLevel;
  notes: string | null;
  prep_notes: string | null;
};

export const recipeStatuses = [
  "idea",
  "tried",
  "approved",
  "favorite",
  "retired"
] as const satisfies readonly RecipeStatus[];

export const mealTypes = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "drink",
  "side",
  "baby_meal",
  "other"
] as const satisfies readonly MealType[];

export const estimateConfidences = [
  "low",
  "medium",
  "high"
] as const satisfies readonly EstimateConfidence[];

export const recipeRepeatRules = [
  "weekly",
  "every_two_weeks",
  "monthly",
  "rarely"
] as const satisfies readonly RecipeRepeatRule[];

export function formatRecipeStatus(status: RecipeStatus) {
  return formatToken(status);
}

export function formatMealType(mealType: MealType) {
  return mealType === "baby_meal" ? "Baby meal" : formatToken(mealType);
}

export function formatEstimateConfidence(confidence: EstimateConfidence) {
  return formatToken(confidence);
}

export function formatRecipeRepeatRule(rule: RecipeRepeatRule) {
  return formatToken(rule);
}

function formatToken(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
