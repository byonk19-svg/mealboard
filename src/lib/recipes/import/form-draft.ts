import type { IngredientReviewRow } from "../ingredient-review";
import { mealTypes, type MealType } from "../types";
import type { ImportConfidence, RecipeImportDraft } from "./types";

export function buildRecipeImportDraftFromFormData(
  currentDraft: RecipeImportDraft,
  formData: FormData
): RecipeImportDraft {
  const rows = readIngredientRows(formData, currentDraft.ingredientReviewRows);
  const instructions = readText(formData, "instructions") ?? "";
  const nutritionConfidence =
    readImportConfidence(formData, "nutritionConfidence") ??
    currentDraft.nutritionConfidence;

  return {
    ...currentDraft,
    confidence: {
      ...currentDraft.confidence,
      ingredients: rows.length > 0
        ? promoteImportedConfidence(currentDraft.confidence.ingredients)
        : "missing",
      instructions: instructions.trim() ? "high" : "missing",
      name: readText(formData, "name")
        ? promoteImportedConfidence(currentDraft.confidence.name)
        : "missing",
      nutrition:
        nutritionConfidence === "missing" ? "missing" : nutritionConfidence
    },
    cookMinutes: readNumber(formData, "cookMinutes"),
    description: readText(formData, "description"),
    estimatedCaloriesPerServing: readNumber(
      formData,
      "estimatedCaloriesPerServing"
    ),
    estimatedProteinGramsPerServing: readNumber(
      formData,
      "estimatedProteinGramsPerServing"
    ),
    ingredientLines: rows.map((row) => row.display_name),
    ingredientReviewRows: rows,
    instructions,
    mealType: readMealType(formData, "mealType") ?? currentDraft.mealType,
    name: readText(formData, "name") ?? currentDraft.name,
    nutritionConfidence,
    prepMinutes: readNumber(formData, "prepMinutes"),
    servings: readNumber(formData, "servings"),
    sourceTitle: readText(formData, "sourceTitle"),
    sourceUrl: readText(formData, "sourceUrl")
  };
}

function readIngredientRows(
  formData: FormData,
  previousRows: IngredientReviewRow[]
): IngredientReviewRow[] {
  const displayNames = formData.getAll("ingredientDisplayName");
  const foodIds = formData.getAll("ingredientFoodId");
  const quantities = formData.getAll("ingredientQuantity");
  const units = formData.getAll("ingredientUnit");
  const categoryIds = formData.getAll("ingredientCategoryId");
  const newFoodNames = formData.getAll("ingredientNewFoodName");
  const preparations = formData.getAll("ingredientPreparation");
  const notes = formData.getAll("ingredientNotes");
  const needsReviewValues = formData.getAll("ingredientNeedsReview");
  const optionalRows = new Set(
    formData.getAll("ingredientOptional").map((value) => String(value))
  );

  return displayNames
    .map((displayName, index): IngredientReviewRow | null => {
      const name = textOrNull(displayName);

      if (!name) {
        return null;
      }

      const needsReview =
        String(needsReviewValues[index] ?? "false") === "true";

      return {
        display_name: name,
        food_id: textOrNull(foodIds[index] ?? null),
        grocery_category_id: textOrNull(categoryIds[index] ?? null),
        needsReview,
        new_food_name: textOrNull(newFoodNames[index] ?? null),
        notes: textOrNull(notes[index] ?? null),
        optional: optionalRows.has(String(index)),
        preparation: textOrNull(preparations[index] ?? null),
        quantity: numberOrNull(quantities[index] ?? null),
        reviewReason: needsReview
          ? previousRows[index]?.reviewReason ?? "Imported row still needs review."
          : null,
        unit: textOrNull(units[index] ?? null)
      };
    })
    .filter((row): row is IngredientReviewRow => row !== null);
}

function readText(formData: FormData, key: string) {
  return textOrNull(formData.get(key));
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function readNumber(formData: FormData, key: string) {
  return numberOrNull(formData.get(key));
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function readMealType(formData: FormData, key: string): MealType | null {
  const value = String(formData.get(key) ?? "");
  return mealTypes.includes(value as MealType) ? (value as MealType) : null;
}

function readImportConfidence(
  formData: FormData,
  key: string
): ImportConfidence | null {
  const value = String(formData.get(key) ?? "");

  return value === "high" || value === "medium" || value === "low"
    ? value
    : null;
}

function promoteImportedConfidence(
  value: ImportConfidence | (string & {})
): ImportConfidence {
  return value === "high" ? "high" : "medium";
}
