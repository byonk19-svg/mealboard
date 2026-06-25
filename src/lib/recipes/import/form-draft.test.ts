import { describe, expect, it } from "vitest";
import { buildRecipeImportDraftFromFormData } from "./form-draft";
import type { RecipeImportDraft } from "./types";

describe("buildRecipeImportDraftFromFormData", () => {
  it("preserves edited recipe fields and attribution after a failed save", () => {
    const formData = new FormData();
    formData.set("name", "Edited Pasta");
    formData.set("description", "Weeknight version");
    formData.set("servings", "4");
    formData.set("prepMinutes", "12");
    formData.set("cookMinutes", "25");
    formData.set("mealType", "dinner");
    formData.set("instructions", "Boil pasta.\nToss with sauce.");
    formData.set("sourceTitle", "Edited source");
    formData.set("sourceUrl", "not-a-url-yet");
    formData.set("estimatedCaloriesPerServing", "520");
    formData.set("estimatedProteinGramsPerServing", "22");
    formData.set("nutritionConfidence", "medium");

    const draft = buildRecipeImportDraftFromFormData(baseDraft, formData);

    expect(draft).toMatchObject({
      name: "Edited Pasta",
      description: "Weeknight version",
      servings: 4,
      prepMinutes: 12,
      cookMinutes: 25,
      mealType: "dinner",
      instructions: "Boil pasta.\nToss with sauce.",
      sourceTitle: "Edited source",
      sourceUrl: "not-a-url-yet",
      estimatedCaloriesPerServing: 520,
      estimatedProteinGramsPerServing: 22,
      nutritionConfidence: "medium"
    });
    expect(draft.confidence.instructions).toBe("high");
    expect(draft.warnings).toEqual(baseDraft.warnings);
  });

  it("preserves edited ingredient rows including optional and new-food entries", () => {
    const formData = new FormData();
    formData.set("name", "Edited Pasta");
    formData.set("mealType", "dinner");
    formData.append("ingredientDisplayName", "Tomato sauce");
    formData.append("ingredientFoodId", "food-1");
    formData.append("ingredientQuantity", "2");
    formData.append("ingredientUnit", "cups");
    formData.append("ingredientCategoryId", "category-1");
    formData.append("ingredientNewFoodName", "Sunday sauce");
    formData.append("ingredientPreparation", "warm");
    formData.append("ingredientNotes", "low salt");
    formData.append("ingredientNeedsReview", "true");
    formData.append("ingredientOptional", "0");
    formData.append("ingredientDisplayName", "");
    formData.append("ingredientFoodId", "");
    formData.append("ingredientQuantity", "");
    formData.append("ingredientUnit", "");
    formData.append("ingredientCategoryId", "");
    formData.append("ingredientNewFoodName", "");
    formData.append("ingredientPreparation", "");
    formData.append("ingredientNotes", "");
    formData.append("ingredientNeedsReview", "false");

    const draft = buildRecipeImportDraftFromFormData(baseDraft, formData);

    expect(draft.ingredientReviewRows).toEqual([
      {
        display_name: "Tomato sauce",
        food_id: "food-1",
        grocery_category_id: "category-1",
        needsReview: true,
        new_food_name: "Sunday sauce",
        notes: "low salt",
        optional: true,
        preparation: "warm",
        quantity: 2,
        reviewReason: "Could not match food.",
        unit: "cups"
      }
    ]);
    expect(draft.ingredientLines).toEqual(["Tomato sauce"]);
    expect(draft.confidence.ingredients).toBe("medium");
  });

  it("falls back to the previous draft for invalid select values and blank numbers", () => {
    const formData = new FormData();
    formData.set("name", "Edited Pasta");
    formData.set("mealType", "not-real");
    formData.set("servings", "");
    formData.set("prepMinutes", "abc");
    formData.set("cookMinutes", "-1");
    formData.set("nutritionConfidence", "not-real");

    const draft = buildRecipeImportDraftFromFormData(baseDraft, formData);

    expect(draft.mealType).toBe(baseDraft.mealType);
    expect(draft.servings).toBeNull();
    expect(draft.prepMinutes).toBeNull();
    expect(draft.cookMinutes).toBeNull();
    expect(draft.nutritionConfidence).toBe(baseDraft.nutritionConfidence);
  });
});

const baseDraft: RecipeImportDraft = {
  confidence: {
    ingredients: "low",
    instructions: "missing",
    name: "high",
    nutrition: "missing"
  },
  cookMinutes: null,
  description: null,
  estimatedCaloriesPerServing: null,
  estimatedProteinGramsPerServing: null,
  ingredientLines: ["1 cup sauce"],
  ingredientReviewRows: [
    {
      display_name: "sauce",
      food_id: null,
      grocery_category_id: null,
      needsReview: true,
      notes: null,
      optional: false,
      preparation: null,
      quantity: 1,
      reviewReason: "Could not match food.",
      unit: "cup"
    }
  ],
  instructions: "",
  mealType: "dinner",
  name: "Imported Pasta",
  nutritionConfidence: "missing",
  prepMinutes: null,
  servings: null,
  sourceTitle: "Original source",
  sourceUrl: "https://example.test/original",
  warnings: ["Original warning"]
};
