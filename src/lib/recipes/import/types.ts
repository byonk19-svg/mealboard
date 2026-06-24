import type { IngredientReviewRow } from "../ingredient-review";
import type { MealType } from "../types";

export type ImportConfidence = "high" | "medium" | "low" | "missing";
export type RecipeImportConfidenceValue = ImportConfidence | (string & {});

export type RawRecipeCandidate = {
  name: string | null;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: string[];
  instructions: string[];
  caloriesPerServing: number | null;
  proteinGramsPerServing: number | null;
  extractionWarnings: string[];
};

export type RecipeImportFieldConfidence = {
  name: RecipeImportConfidenceValue;
  description?: RecipeImportConfidenceValue;
  servings?: RecipeImportConfidenceValue;
  prepTime?: RecipeImportConfidenceValue;
  cookTime?: RecipeImportConfidenceValue;
  ingredients: RecipeImportConfidenceValue;
  instructions: RecipeImportConfidenceValue;
  nutrition: RecipeImportConfidenceValue;
};

export type RecipeImportDraft = {
  sourceUrl: string | null;
  sourceTitle: string | null;
  name: string;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  mealType: MealType;
  ingredientLines: string[];
  ingredientReviewRows: IngredientReviewRow[];
  instructions: string;
  estimatedCaloriesPerServing: number | null;
  estimatedProteinGramsPerServing: number | null;
  nutritionConfidence: ImportConfidence;
  mealTypeHints?: string[];
  tags?: string[];
  confidence: RecipeImportFieldConfidence;
  warnings: string[];
};
