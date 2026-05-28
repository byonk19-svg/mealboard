import { describe, expect, it } from "vitest";
import { parseIngredientText } from "./parse-ingredient-lines";

describe("parseIngredientText", () => {
  it("parses common quantity, unit, ingredient, and preparation patterns", () => {
    expect(
      parseIngredientText("1 lb chicken breast, diced\n2 cups cooked rice")
    ).toEqual([
      {
        originalLine: "1 lb chicken breast, diced",
        displayName: "chicken breast",
        quantity: 1,
        unit: "lb",
        preparation: "diced",
        notes: null,
        needsReview: false,
        reviewReason: null
      },
      {
        originalLine: "2 cups cooked rice",
        displayName: "rice",
        quantity: 2,
        unit: "cups",
        preparation: "cooked",
        notes: null,
        needsReview: false,
        reviewReason: null
      }
    ]);
  });

  it("parses fractions, mixed fractions, and package notes", () => {
    expect(
      parseIngredientText("1/2 tsp salt\n1 1/2 cups shredded cheese\n1 (15 oz) can black beans, drained")
    ).toEqual([
      {
        originalLine: "1/2 tsp salt",
        displayName: "salt",
        quantity: 0.5,
        unit: "tsp",
        preparation: null,
        notes: null,
        needsReview: false,
        reviewReason: null
      },
      {
        originalLine: "1 1/2 cups shredded cheese",
        displayName: "cheese",
        quantity: 1.5,
        unit: "cups",
        preparation: "shredded",
        notes: null,
        needsReview: false,
        reviewReason: null
      },
      {
        originalLine: "1 (15 oz) can black beans, drained",
        displayName: "black beans",
        quantity: 1,
        unit: "can",
        preparation: "drained",
        notes: "15 oz",
        needsReview: false,
        reviewReason: null
      }
    ]);
  });

  it("flags vague or unparsed rows for review", () => {
    expect(parseIngredientText("- salt to taste\n\npepper")).toEqual([
      {
        originalLine: "salt to taste",
        displayName: "salt",
        quantity: null,
        unit: null,
        preparation: null,
        notes: "to taste",
        needsReview: true,
        reviewReason: "Quantity or unit needs review."
      },
      {
        originalLine: "pepper",
        displayName: "pepper",
        quantity: null,
        unit: null,
        preparation: null,
        notes: null,
        needsReview: true,
        reviewReason: "Quantity or unit needs review."
      }
    ]);
  });
});
