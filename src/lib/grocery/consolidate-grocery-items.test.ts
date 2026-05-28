import { describe, expect, it } from "vitest";
import { consolidateGroceryItems } from "./consolidate-grocery-items";

const chickenSource = {
  label: "Chicken Wrap",
  sourceId: "recipe-1",
  sourceType: "recipe" as const
};

const tacoSource = {
  label: "Taco Bowl",
  sourceId: "recipe-2",
  sourceType: "recipe" as const
};

describe("consolidateGroceryItems", () => {
  it("combines items with the same food id and unit while preserving sources", () => {
    expect(
      consolidateGroceryItems([
        {
          displayName: "Chicken",
          foodId: "food-chicken",
          quantity: 1,
          unit: "lb",
          sources: [chickenSource]
        },
        {
          displayName: "Chicken breast",
          foodId: "food-chicken",
          quantity: 2,
          unit: "lb",
          sources: [tacoSource]
        }
      ])
    ).toEqual([
      {
        displayName: "Chicken",
        foodId: "food-chicken",
        quantity: 3,
        unit: "lb",
        preferredQuantityText: null,
        needsReview: false,
        reviewReason: null,
        sources: [chickenSource, tacoSource]
      }
    ]);
  });

  it("combines normalized display names when no food id exists", () => {
    expect(
      consolidateGroceryItems([
        {
          displayName: " Shredded   Cheese ",
          quantity: 1,
          unit: "bag",
          sources: [chickenSource]
        },
        {
          displayName: "shredded cheese",
          quantity: 2,
          unit: "bag",
          sources: [tacoSource]
        }
      ])
    ).toEqual([
      {
        displayName: "Shredded Cheese",
        foodId: null,
        quantity: 3,
        unit: "bag",
        preferredQuantityText: null,
        needsReview: false,
        reviewReason: null,
        sources: [chickenSource, tacoSource]
      }
    ]);
  });

  it("converts safe volume and weight units conservatively", () => {
    expect(
      consolidateGroceryItems([
        {
          displayName: "Salsa",
          foodId: "food-salsa",
          quantity: 3,
          unit: "tsp",
          sources: [chickenSource]
        },
        {
          displayName: "Salsa",
          foodId: "food-salsa",
          quantity: 1,
          unit: "tbsp",
          sources: [tacoSource]
        },
        {
          displayName: "Ground turkey",
          foodId: "food-turkey",
          quantity: 8,
          unit: "oz",
          sources: [chickenSource]
        },
        {
          displayName: "Ground turkey",
          foodId: "food-turkey",
          quantity: 1,
          unit: "lb",
          sources: [tacoSource]
        }
      ])
    ).toEqual([
      {
        displayName: "Salsa",
        foodId: "food-salsa",
        quantity: 2,
        unit: "tbsp",
        preferredQuantityText: null,
        needsReview: false,
        reviewReason: null,
        sources: [chickenSource, tacoSource]
      },
      {
        displayName: "Ground turkey",
        foodId: "food-turkey",
        quantity: 1.5,
        unit: "lb",
        preferredQuantityText: null,
        needsReview: false,
        reviewReason: null,
        sources: [chickenSource, tacoSource]
      }
    ]);
  });

  it("keeps incompatible or unclear units separate and flags them for review", () => {
    expect(
      consolidateGroceryItems([
        {
          displayName: "Cheese",
          foodId: "food-cheese",
          quantity: 1,
          unit: "cup",
          sources: [chickenSource]
        },
        {
          displayName: "Cheese",
          foodId: "food-cheese",
          quantity: 8,
          unit: "oz",
          sources: [tacoSource]
        },
        {
          displayName: "Salt",
          quantity: null,
          unit: null,
          sources: [chickenSource]
        }
      ])
    ).toEqual([
      {
        displayName: "Cheese",
        foodId: "food-cheese",
        quantity: 1,
        unit: "cup",
        preferredQuantityText: null,
        needsReview: true,
        reviewReason: "Incompatible units need review.",
        sources: [chickenSource]
      },
      {
        displayName: "Cheese",
        foodId: "food-cheese",
        quantity: 8,
        unit: "oz",
        preferredQuantityText: null,
        needsReview: true,
        reviewReason: "Incompatible units need review.",
        sources: [tacoSource]
      },
      {
        displayName: "Salt",
        foodId: null,
        quantity: null,
        unit: null,
        preferredQuantityText: null,
        needsReview: true,
        reviewReason: "Quantity or unit is missing.",
        sources: [chickenSource]
      }
    ]);
  });

  it("preserves preferred quantity text on consolidated items", () => {
    expect(
      consolidateGroceryItems([
        {
          displayName: "Tortillas",
          foodId: "food-tortillas",
          preferredQuantityText: "1 pack",
          quantity: 4,
          unit: "count",
          sources: [chickenSource]
        },
        {
          displayName: "Tortillas",
          foodId: "food-tortillas",
          quantity: 6,
          unit: "count",
          sources: [tacoSource]
        }
      ])
    ).toEqual([
      {
        displayName: "Tortillas",
        foodId: "food-tortillas",
        quantity: 10,
        unit: "count",
        preferredQuantityText: "1 pack",
        needsReview: false,
        reviewReason: null,
        sources: [chickenSource, tacoSource]
      }
    ]);
  });
});
