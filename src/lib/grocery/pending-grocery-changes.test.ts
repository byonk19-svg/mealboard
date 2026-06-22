import { describe, expect, it } from "vitest";
import type { GeneratedGroceryItem } from "./generate-grocery-list";
import {
  buildPendingGroceryChanges,
  type ProtectedGroceryListItem
} from "./pending-grocery-changes";

describe("buildPendingGroceryChanges", () => {
  it("classifies added, removed, and kept generated grocery items", () => {
    const result = buildPendingGroceryChanges({
      currentItems: [
        protectedItem({ displayName: "Chicken", foodId: "food-chicken", quantity: 2 }),
        protectedItem({ displayName: "Rice", foodId: "food-rice", quantity: 1 })
      ],
      generatedItems: [
        generatedItem({ displayName: "Chicken", foodId: "food-chicken", quantity: 2 }),
        generatedItem({ displayName: "Black Beans", foodId: "food-beans", quantity: 2 })
      ]
    });

    expect(result).toMatchObject({
      addedCount: 1,
      hasChanges: true,
      keptCount: 1,
      manualItemCount: 0,
      removedCount: 1
    });
    expect(result.added.map((item) => item.displayName)).toEqual(["Black Beans"]);
    expect(result.removed.map((item) => item.displayName)).toEqual(["Rice"]);
    expect(result.kept.map((item) => item.displayName)).toEqual(["Chicken"]);
  });

  it("treats quantity changes as one remove and one add", () => {
    const result = buildPendingGroceryChanges({
      currentItems: [
        protectedItem({ displayName: "Chicken", foodId: "food-chicken", quantity: 1 })
      ],
      generatedItems: [
        generatedItem({ displayName: "Chicken", foodId: "food-chicken", quantity: 2 })
      ]
    });

    expect(result.added.map((item) => item.quantity)).toEqual([2]);
    expect(result.removed.map((item) => item.quantity)).toEqual([1]);
    expect(result.kept).toEqual([]);
  });

  it("matches item names case-insensitively when no food id is available", () => {
    const result = buildPendingGroceryChanges({
      currentItems: [
        protectedItem({ displayName: "  Baby Yogurt ", foodId: null, unit: "cup" })
      ],
      generatedItems: [
        generatedItem({ displayName: "baby yogurt", foodId: null, unit: "cup" })
      ]
    });

    expect(result.hasChanges).toBe(false);
    expect(result.kept).toHaveLength(1);
  });

  it("keeps manual grocery items outside automatic add remove review", () => {
    const result = buildPendingGroceryChanges({
      currentItems: [
        protectedItem({ displayName: "Manual snack", foodId: null, manualItem: true })
      ],
      generatedItems: []
    });

    expect(result).toMatchObject({
      addedCount: 0,
      hasChanges: false,
      keptCount: 0,
      manualItemCount: 1,
      removedCount: 0
    });
  });
});

function generatedItem(
  overrides: Partial<GeneratedGroceryItem> = {}
): GeneratedGroceryItem {
  return {
    categoryId: null,
    displayName: "Chicken",
    foodId: "food-chicken",
    needsReview: false,
    preferredQuantityText: null,
    quantity: 1,
    reviewReason: null,
    unit: "lb",
    ...overrides
  };
}

function protectedItem(
  overrides: Partial<ProtectedGroceryListItem> = {}
): ProtectedGroceryListItem {
  return {
    displayName: "Chicken",
    foodId: "food-chicken",
    manualItem: false,
    preferredQuantityText: null,
    quantity: 1,
    unit: "lb",
    ...overrides
  };
}
