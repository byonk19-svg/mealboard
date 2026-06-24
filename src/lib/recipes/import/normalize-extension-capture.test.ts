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

  it("builds a low-confidence selected-text draft when JSON-LD is unavailable", () => {
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
      name: "Recipe Page",
      sourceTitle: "Recipe Page",
      sourceUrl: "https://example.test/recipe",
      instructions: "Ingredients and instructions copied from the page.",
      confidence: {
        ingredients: "missing",
        instructions: "low",
        name: "low",
        nutrition: "missing"
      },
      warnings: [
        "The extension did not find structured recipe data on this page.",
        "Selected page text was added to instructions. Review the title, ingredients, servings, and nutrition before saving."
      ]
    });
    expect(draft?.ingredientReviewRows).toEqual([]);
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
