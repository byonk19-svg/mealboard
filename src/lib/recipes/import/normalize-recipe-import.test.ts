import { describe, expect, it } from "vitest";
import { normalizeRecipeImportDraft } from "./normalize-recipe-import";
import type { RawRecipeCandidate } from "./types";

const completeCandidate: RawRecipeCandidate = {
  name: "Skillet Rice Bowls",
  description: "Weeknight rice bowls.",
  servings: 4,
  prepMinutes: 15,
  cookMinutes: 25,
  ingredients: ["1 cup rice", "1 lb chicken breast, diced", "salt to taste"],
  instructions: ["Cook the rice.", "Top with chicken."],
  caloriesPerServing: 520,
  proteinGramsPerServing: 38,
  extractionWarnings: []
};

describe("normalizeRecipeImportDraft", () => {
  it("builds a review draft from a complete extracted recipe", () => {
    const draft = normalizeRecipeImportDraft({
      candidate: completeCandidate,
      foods: [
        {
          default_grocery_category_id: "cat-pantry",
          default_unit: "cup",
          household_id: "household-1",
          id: "food-rice",
          name: "Rice"
        }
      ],
      sourceTitle: "Source Page",
      sourceUrl: "https://example.test/rice-bowls"
    });

    expect(draft).toMatchObject({
      sourceUrl: "https://example.test/rice-bowls",
      sourceTitle: "Source Page",
      name: "Skillet Rice Bowls",
      description: "Weeknight rice bowls.",
      servings: 4,
      prepMinutes: 15,
      cookMinutes: 25,
      instructions: "Cook the rice.\n\nTop with chicken.",
      estimatedCaloriesPerServing: 520,
      estimatedProteinGramsPerServing: 38,
      nutritionConfidence: "medium",
      confidence: {
        name: "high",
        ingredients: "high",
        instructions: "high",
        nutrition: "medium"
      },
      warnings: []
    });
    expect(draft.ingredientLines).toEqual(completeCandidate.ingredients);
    expect(draft.ingredientReviewRows[0]).toMatchObject({
      display_name: "rice",
      food_id: "food-rice",
      grocery_category_id: "cat-pantry",
      needsReview: false
    });
    expect(draft.ingredientReviewRows[2]).toMatchObject({
      display_name: "salt",
      needsReview: true,
      reviewReason: "Quantity or unit needs review."
    });
  });

  it("does not infer missing nutrition", () => {
    const draft = normalizeRecipeImportDraft({
      candidate: {
        ...completeCandidate,
        caloriesPerServing: null,
        proteinGramsPerServing: null
      },
      foods: []
    });

    expect(draft.estimatedCaloriesPerServing).toBeNull();
    expect(draft.estimatedProteinGramsPerServing).toBeNull();
    expect(draft.nutritionConfidence).toBe("missing");
    expect(draft.confidence.nutrition).toBe("missing");
  });

  it("keeps missing name and ingredients reviewable with warnings", () => {
    const draft = normalizeRecipeImportDraft({
      candidate: {
        ...completeCandidate,
        name: null,
        ingredients: []
      },
      foods: []
    });

    expect(draft.name).toBe("");
    expect(draft.confidence.name).toBe("missing");
    expect(draft.confidence.ingredients).toBe("missing");
    expect(draft.warnings).toEqual([
      "Recipe name was not found.",
      "Recipe ingredients were not found."
    ]);
    expect(draft.ingredientReviewRows).toEqual([]);
  });

  it("carries extractor warnings into the review draft", () => {
    const draft = normalizeRecipeImportDraft({
      candidate: {
        ...completeCandidate,
        extractionWarnings: ["Recipe yield could not be parsed."]
      },
      foods: []
    });

    expect(draft.warnings).toContain("Recipe yield could not be parsed.");
  });

  it("cleans source attribution before building a draft", () => {
    const draft = normalizeRecipeImportDraft({
      candidate: completeCandidate,
      foods: [],
      sourceTitle: "Skillet Rice Bowls - Example Food",
      sourceUrl:
        "https://example.test/rice-bowls?utm_source=email&gclid=abc&print=1#recipe"
    });

    expect(draft.sourceTitle).toBe("Skillet Rice Bowls");
    expect(draft.sourceUrl).toBe("https://example.test/rice-bowls?print=1");
  });
});
