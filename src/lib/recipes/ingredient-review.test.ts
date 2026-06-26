import { describe, expect, it } from "vitest";
import {
  buildIngredientReviewRows,
  createBlankIngredientReviewRow,
  mergeIngredientReviewRows,
  resolveFoodMatch,
  resolveFoodSelection,
  splitIngredientReviewRow,
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
  },
  {
    default_grocery_category_id: "cat-pantry",
    default_unit: "tbsp",
    household_id: "household-1",
    id: "food-coconut-oil",
    name: "Coconut oil"
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

  it("matches punctuation and spacing variants for imported ingredient names", () => {
    expect(resolveFoodMatch(foods, "washed baby-spinach")).toMatchObject({
      foodId: "food-spinach",
      groceryCategoryId: "cat-produce"
    });
    expect(resolveFoodMatch(foods, "Organic CoconutOil, raw")).toMatchObject({
      foodId: "food-coconut-oil",
      groceryCategoryId: "cat-pantry"
    });
  });

  it("does not match food names inside unrelated ingredient tokens", () => {
    const collisionFoods: Food[] = [
      {
        default_grocery_category_id: "cat-meat",
        default_unit: "oz",
        household_id: "household-1",
        id: "food-ham",
        name: "Ham"
      },
      {
        default_grocery_category_id: "cat-snacks",
        default_unit: "count",
        household_id: "household-1",
        id: "food-graham-cracker",
        name: "Graham cracker"
      }
    ];

    expect(
      resolveFoodMatch(collisionFoods, "graham cracker crumbs")
    ).toMatchObject({
      foodId: "food-graham-cracker",
      groceryCategoryId: "cat-snacks"
    });
    expect(
      resolveFoodMatch(collisionFoods.slice(0, 1), "graham cracker crumbs")
    ).toMatchObject({
      foodId: null,
      groceryCategoryId: null
    });
  });

  it("preserves semantic words before descriptor fallback matching", () => {
    const honeyFoods: Food[] = [
      {
        default_grocery_category_id: "cat-pantry",
        default_unit: "tbsp",
        household_id: "household-1",
        id: "food-honey",
        name: "Honey"
      },
      {
        default_grocery_category_id: "cat-pantry",
        default_unit: "tbsp",
        household_id: "household-1",
        id: "food-raw-honey",
        name: "Raw honey"
      }
    ];

    expect(resolveFoodMatch(honeyFoods, "raw honey")).toMatchObject({
      foodId: "food-raw-honey",
      groceryCategoryId: "cat-pantry"
    });
    expect(
      resolveFoodMatch([...honeyFoods].reverse(), "raw honey")
    ).toMatchObject({
      foodId: "food-raw-honey",
      groceryCategoryId: "cat-pantry"
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

  it("creates a blank row after the current row when splitting", () => {
    const row = buildIngredientReviewRows({
      foods,
      parsedIngredients: [parsedIngredient({ displayName: "rice" })]
    })[0];

    expect(splitIngredientReviewRow(row)).toEqual([
      row,
      {
        ...createBlankIngredientReviewRow(),
        needsReview: true,
        reviewReason: "Split row; fill in the new ingredient."
      }
    ]);
  });

  it("merges adjacent rows and marks the result for review", () => {
    const [first, secondRow] = buildIngredientReviewRows({
      foods,
      parsedIngredients: [
        parsedIngredient({
          displayName: "rice",
          notes: "rinsed",
          preparation: "cooked"
        }),
        parsedIngredient({
          displayName: "baby spinach",
          notes: "packed",
          preparation: "chopped",
          quantity: 2
        })
      ]
    });
    const second = { ...secondRow, optional: true };

    expect(mergeIngredientReviewRows(first, second)).toMatchObject({
      display_name: "rice + baby spinach",
      food_id: null,
      grocery_category_id: null,
      needsReview: true,
      notes: "rinsed; packed",
      optional: true,
      preparation: "cooked; chopped",
      quantity: null,
      reviewReason: "Merged row; review quantity, unit, and food match."
    });
  });
});
