import { describe, expect, it } from "vitest";
import { normalizeExtensionCapturePayload } from "./normalize-extension-capture";

describe("normalizeExtensionCapturePayload", () => {
  it("normalizes extension JSON-LD into a review draft", () => {
    const draft = normalizeExtensionCapturePayload(
      {
        jsonLd: [
          JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Recipe",
            name: "Captured Pasta",
            recipeIngredient: ["1 cup pasta"],
            recipeInstructions: ["Boil pasta."],
            recipeYield: "2 servings"
          })
        ],
        sourceTitle: "Captured Pasta - Example",
        sourceUrl: "https://example.test/pasta?utm_source=ext"
      },
      []
    );

    expect(draft).toMatchObject({
      name: "Captured Pasta",
      servings: 2,
      sourceTitle: "Captured Pasta",
      sourceUrl: "https://example.test/pasta",
      ingredientLines: ["1 cup pasta"],
      instructions: "Boil pasta."
    });
  });

  it("builds a low-confidence selected-text draft when copied text has recipe sections", () => {
    const draft = normalizeExtensionCapturePayload(
      {
        jsonLd: [],
        selectedText:
          "Ingredients: 1 cup beans. Instructions: Simmer until warm.",
        sourceTitle: "Recipe Page | Example",
        sourceUrl: "https://example.test/recipe?fbclid=abc#comments"
      },
      []
    );

    expect(draft).toMatchObject({
      name: "Recipe Page",
      sourceTitle: "Recipe Page",
      sourceUrl: "https://example.test/recipe",
      ingredientLines: ["1 cup beans"],
      instructions: "Simmer until warm.",
      confidence: {
        ingredients: "low",
        instructions: "low",
        name: "low",
        nutrition: "missing"
      },
      warnings: [
        "The extension did not find structured recipe data on this page.",
        "Selected page text was split into ingredients and instructions. Review imported fields before saving."
      ]
    });
    expect(draft?.ingredientReviewRows).toHaveLength(1);
    expect(draft?.ingredientReviewRows[0]).toMatchObject({
      display_name: "beans",
      quantity: 1,
      unit: "cup"
    });
  });

  it("keeps unstructured selected text in instructions when sections are unavailable", () => {
    const draft = normalizeExtensionCapturePayload(
      {
        jsonLd: [],
        selectedText: "Ingredients and instructions copied from the page.",
        sourceTitle: "Recipe Page | Example",
        sourceUrl: "https://example.test/recipe?fbclid=abc#comments"
      },
      []
    );

    expect(draft).toMatchObject({
      ingredientLines: [],
      instructions: "Ingredients and instructions copied from the page.",
      warnings: [
        "The extension did not find structured recipe data on this page.",
        "Selected page text was added to instructions. Review the title, ingredients, servings, and nutrition before saving."
      ]
    });
    expect(draft?.ingredientReviewRows).toEqual([]);
  });

  it("normalizes visible recipe DOM capture when JSON-LD is unavailable", () => {
    const draft = normalizeExtensionCapturePayload(
      {
        jsonLd: [],
        sourceTitle: "Visible Chicken Tacos - Example",
        sourceUrl: "https://example.test/tacos?utm_campaign=social#recipe",
        visibleRecipe: {
          cookTimeText: "20 minutes",
          ingredients: ["1 lb chicken thighs", "8 tortillas"],
          instructions: ["Season the chicken.", "Serve in tortillas."],
          nutritionText: "Calories: 420 kcal Protein: 31g",
          prepTimeText: "10 minutes",
          servingsText: "4 servings",
          title: "Visible Chicken Tacos"
        }
      },
      []
    );

    expect(draft).toMatchObject({
      cookMinutes: 20,
      estimatedCaloriesPerServing: 420,
      estimatedProteinGramsPerServing: 31,
      ingredientLines: ["1 lb chicken thighs", "8 tortillas"],
      instructions: "Season the chicken.\n\nServe in tortillas.",
      name: "Visible Chicken Tacos",
      nutritionConfidence: "medium",
      prepMinutes: 10,
      servings: 4,
      sourceTitle: "Visible Chicken Tacos",
      sourceUrl: "https://example.test/tacos",
      warnings: [
        "The extension captured visible recipe text instead of structured recipe data. Review imported fields before saving."
      ]
    });
  });

  it("carries a blocked-page warning when visible recipe text was captured after a block signal", () => {
    const draft = normalizeExtensionCapturePayload(
      {
        blockedPage: true,
        jsonLd: [],
        sourceTitle: "Blocked Recipe",
        visibleRecipe: {
          ingredients: ["1 cup beans"],
          instructions: ["Simmer beans."]
        }
      },
      []
    );

    expect(draft?.warnings).toContain(
      "The extension captured visible recipe text after a site block signal. Review every field before saving."
    );
  });

  it("returns null when there is no structured recipe and no selected text", () => {
    expect(
      normalizeExtensionCapturePayload(
        {
          jsonLd: [],
          selectedText: "",
          sourceTitle: "Just a moment..."
        },
        []
      )
    ).toBeNull();
  });
});
