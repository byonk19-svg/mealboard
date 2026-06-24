import { buildIngredientReviewRows } from "../ingredient-review";
import { parseIngredientText } from "../parse-ingredient-lines";
import type { Food } from "@/lib/settings/types";
import { cleanRecipeSourceAttribution } from "./source-attribution";
import type {
  ImportConfidence,
  RawRecipeCandidate,
  RecipeImportDraft
} from "./types";

export function normalizeRecipeImportDraft({
  candidate,
  foods,
  sourceTitle = null,
  sourceUrl = null
}: {
  candidate: RawRecipeCandidate;
  foods: Food[];
  sourceTitle?: string | null;
  sourceUrl?: string | null;
}): RecipeImportDraft {
  const ingredientLines = candidate.ingredients
    .map((line) => line.trim())
    .filter(Boolean);
  const parsedIngredients = parseIngredientText(ingredientLines.join("\n"));
  const ingredientReviewRows = buildIngredientReviewRows({
    foods,
    parsedIngredients
  });
  const hasExplicitNutrition =
    candidate.caloriesPerServing !== null ||
    candidate.proteinGramsPerServing !== null;
  const warnings = [
    ...missingFieldWarnings(candidate),
    ...candidate.extractionWarnings
  ];
  const source = cleanRecipeSourceAttribution({
    recipeName: candidate.name,
    sourceTitle,
    sourceUrl
  });

  return {
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    name: candidate.name ?? "",
    description: candidate.description,
    servings: candidate.servings,
    prepMinutes: candidate.prepMinutes,
    cookMinutes: candidate.cookMinutes,
    mealType: "dinner",
    ingredientLines,
    ingredientReviewRows,
    instructions: candidate.instructions.join("\n\n"),
    estimatedCaloriesPerServing: candidate.caloriesPerServing,
    estimatedProteinGramsPerServing: candidate.proteinGramsPerServing,
    nutritionConfidence: hasExplicitNutrition ? "medium" : "missing",
    mealTypeHints: [],
    tags: [],
    confidence: {
      name: fieldConfidence(candidate.name),
      description: fieldConfidence(candidate.description),
      servings: numberFieldConfidence(candidate.servings),
      prepTime: numberFieldConfidence(candidate.prepMinutes),
      cookTime: numberFieldConfidence(candidate.cookMinutes),
      ingredients: ingredientLines.length > 0 ? "high" : "missing",
      instructions: candidate.instructions.length > 0 ? "high" : "missing",
      nutrition: hasExplicitNutrition ? "medium" : "missing"
    },
    warnings
  };
}

function missingFieldWarnings(candidate: RawRecipeCandidate) {
  const warnings: string[] = [];

  if (!candidate.name) {
    warnings.push("Recipe name was not found.");
  }

  if (candidate.ingredients.length === 0) {
    warnings.push("Recipe ingredients were not found.");
  }

  if (candidate.instructions.length === 0) {
    warnings.push("Recipe instructions were not found.");
  }

  return warnings;
}

function fieldConfidence(value: string | null): ImportConfidence {
  return value ? "high" : "missing";
}

function numberFieldConfidence(value: number | null): ImportConfidence {
  return value === null ? "missing" : "high";
}
