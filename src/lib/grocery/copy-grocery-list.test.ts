import { describe, expect, it } from "vitest";
import type { GroceryListItem } from "./data";
import { buildGroceryListCopyText } from "./copy-grocery-list";

describe("buildGroceryListCopyText", () => {
  it("builds a category-grouped plain text list for manual shopping apps", () => {
    expect(
      buildGroceryListCopyText({
        items: [
          groceryItem({
            categoryName: "Produce",
            displayName: "Bananas",
            preferredQuantityText: "1 bunch"
          }),
          groceryItem({
            alreadyHave: true,
            categoryName: "Pantry",
            displayName: "Tortillas",
            quantity: 2,
            unit: "packs"
          }),
          groceryItem({
            categoryName: null,
            displayName: "Mystery sauce",
            needsReview: true,
            quantity: null,
            reviewReason: "Missing quantity",
            unit: null
          })
        ],
        title: "MealBoard grocery list",
        weekStartDate: "2026-06-21"
      })
    ).toBe(
      [
        "MealBoard grocery list",
        "Week of Jun 21, 2026",
        "",
        "Pantry",
        "- 2 packs Tortillas (already have)",
        "",
        "Produce",
        "- 1 bunch Bananas",
        "",
        "Needs category",
        "- Mystery sauce (needs review: Missing quantity)"
      ].join("\n")
    );
  });

  it("returns an empty-state line for empty lists", () => {
    expect(
      buildGroceryListCopyText({
        items: [],
        title: "MealBoard grocery list",
        weekStartDate: null
      })
    ).toBe("MealBoard grocery list\n\nNo grocery items.");
  });
});

function groceryItem(overrides: Partial<GroceryListItem>): GroceryListItem {
  return {
    alreadyHave: false,
    categoryName: "Pantry",
    categorySortOrder: 1,
    checked: false,
    displayName: "Item",
    foodId: null,
    id: "item-1",
    manualItem: false,
    needsReview: false,
    preferredQuantityText: null,
    quantity: 1,
    reviewReason: null,
    sortOrder: 1,
    sources: [],
    unit: "count",
    ...overrides
  };
}
