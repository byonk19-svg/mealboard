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

  it("parses compact unicode fractions", () => {
    expect(parseIngredientText("\u00bd cup milk\n1\u00bd cups rice")).toEqual([
      {
        originalLine: "\u00bd cup milk",
        displayName: "milk",
        quantity: 0.5,
        unit: "cup",
        preparation: null,
        notes: null,
        needsReview: false,
        reviewReason: null
      },
      {
        originalLine: "1\u00bd cups rice",
        displayName: "rice",
        quantity: 1.5,
        unit: "cups",
        preparation: null,
        notes: null,
        needsReview: false,
        reviewReason: null
      }
    ]);
  });

  it("parses package sizes written between quantity and unit", () => {
    expect(
      parseIngredientText(
        "2 10-oz bags frozen strawberries\n3 8 oz cans tomato sauce"
      )
    ).toEqual([
      {
        originalLine: "2 10-oz bags frozen strawberries",
        displayName: "strawberries",
        quantity: 2,
        unit: "bags",
        preparation: "frozen",
        notes: "10 oz",
        needsReview: false,
        reviewReason: null
      },
      {
        originalLine: "3 8 oz cans tomato sauce",
        displayName: "tomato sauce",
        quantity: 3,
        unit: "cans",
        preparation: null,
        notes: "8 oz",
        needsReview: false,
        reviewReason: null
      }
    ]);
  });

  it("flags vague or unparsed rows for review", () => {
    expect(parseIngredientText("- salt to taste\n\u2022 pepper")).toEqual([
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

  it("keeps unbulleted vague pantry rows reviewable", () => {
    expect(parseIngredientText("pepper")).toEqual([
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
