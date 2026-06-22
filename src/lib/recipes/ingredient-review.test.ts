import { describe, expect, it } from "vitest";
import {
  buildIngredientReviewRows,
  resolveFoodMatch,
  resolveFoodSelection,
  updateIngredientFoodSelection,
  updateIngredientDisplayName
} from "./ingredient-review";
import type { ParsedIngredientLine } from "./parse-ingredient-lines";
import type { Food } from "@/lib/settings/types";

const foods: Food[] = [
  {
    default_grocery_category_id: "cat-pantry",
    default_unit: "cup",
    household_id: "household-1",
    id: "food-rice",
    name: "Rice"
  },
  {
    default_grocery_category_id: "cat-produce",
    default_unit: null,
    household_id: "household-1",
    id: "food-spinach",
    name: "Baby spinach"
  }
];

function parsedIngredient(
  overrides: Partial<ParsedIngredientLine>
): ParsedIngredientLine {
  return {
    displayName: "rice",
    needsReview: false,
    notes: null,
    originalLine: "1 cup rice",
    preparation: null,
    quantity: 1,
    reviewReason: null,
    unit: "cup",
    ...overrides
  };
}

describe("ingredient review helpers", () => {
  it("fills matched food and category data for parsed rows", () => {
    const rows = buildIngredientReviewRows({
      foods,
      parsedIngredients: [parsedIngredient({ displayName: "rice" })]
    });

    expect(rows[0]).toMatchObject({
      display_name: "rice",
      food_id: "food-rice",
      grocery_category_id: "cat-pantry"
    });
  });

  it("matches contained food names for descriptive parsed rows", () => {
    expect(resolveFoodMatch(foods, "washed baby spinach")).toMatchObject({
      foodId: "food-spinach",
      groceryCategoryId: "cat-produce"
    });
  });

  it("fills category data when a known food is selected", () => {
    expect(resolveFoodSelection(foods, "food-rice")).toMatchObject({
      foodId: "food-rice",
      groceryCategoryId: "cat-pantry"
    });
  });

  it("leaves unknown foods uncategorized and still reviewable", () => {
    const rows = buildIngredientReviewRows({
      foods,
      parsedIngredients: [
        parsedIngredient({
          displayName: "mystery ingredient",
          needsReview: true,
          reviewReason: "Quantity or unit needs review."
        })
      ]
    });

    expect(rows[0]).toMatchObject({
      food_id: null,
      grocery_category_id: null,
      needsReview: true,
      reviewReason: "Quantity or unit needs review."
    });
  });

  it("replaces auto-matched food and category when the display name changes", () => {
    const row = buildIngredientReviewRows({
      foods,
      parsedIngredients: [parsedIngredient({ displayName: "rice" })]
    })[0];

    expect(updateIngredientDisplayName(row, "baby spinach", foods)).toMatchObject({
      display_name: "baby spinach",
      food_id: "food-spinach",
      grocery_category_id: "cat-produce"
    });
  });

  it("updates auto-filled category when selected food changes", () => {
    const row = buildIngredientReviewRows({
      foods,
      parsedIngredients: [parsedIngredient({ displayName: "rice" })]
    })[0];

    expect(updateIngredientFoodSelection(row, "food-spinach", foods)).toMatchObject({
      food_id: "food-spinach",
      grocery_category_id: "cat-produce"
    });
  });

  it("preserves a manually selected category when selected food changes", () => {
    const row = {
      ...buildIngredientReviewRows({
        foods,
        parsedIngredients: [parsedIngredient({ displayName: "rice" })]
      })[0],
      grocery_category_id: "cat-manual"
    };

    expect(updateIngredientFoodSelection(row, "food-spinach", foods)).toMatchObject({
      food_id: "food-spinach",
      grocery_category_id: "cat-manual"
    });
  });
});
