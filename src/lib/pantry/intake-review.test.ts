import { describe, expect, it } from "vitest";
import { buildPantryItemInputFromIntakeCandidate } from "./intake-review";
import type { PantryIntakeCandidate } from "./intake-candidates";

describe("buildPantryItemInputFromIntakeCandidate", () => {
  it("forces food identity from the candidate and defaults stock status", () => {
    expect(
      buildPantryItemInputFromIntakeCandidate({
        candidate: pantryIntakeCandidate(),
        input: {
          displayName: "Reviewed beans",
          expirationDate: null,
          foodId: "caller-food",
          groceryCategoryId: null,
          lowStockThresholdQuantity: null,
          lowStockThresholdUnit: null,
          mealProfileId: null,
          notes: null,
          openedAt: null,
          packageDetail: null,
          quantity: "3",
          quantityNote: null,
          stockStatus: null,
          storageLocation: "Pantry shelf",
          unit: "cans"
        }
      } as never)
    ).toEqual(
      expect.objectContaining({
        displayName: "Reviewed beans",
        foodId: "food-beans",
        groceryCategoryId: "category-canned",
        quantity: "3",
        quantityNote: null,
        stockStatus: "in_stock",
        storageLocation: "Pantry shelf",
        unit: "cans"
      })
    );
  });
});

function pantryIntakeCandidate(): PantryIntakeCandidate {
  return {
    completedAt: "2026-06-21T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
    displayName: "Black beans",
    foodId: "food-beans",
    foodName: "Black beans",
    groceryCategoryId: "category-canned",
    groceryCategoryName: "Canned goods",
    groceryListId: "list-1",
    groceryListItemId: "item-1",
    groceryListName: "Completed groceries",
    preferredQuantityText: "two cans",
    quantity: 2,
    sortOrder: 0,
    sources: [],
    unit: "cans",
    weekStartDate: "2026-06-15"
  };
}
