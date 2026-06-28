import { describe, expect, it } from "vitest";
import {
  buildPantryRestockCandidates,
  selectCurrentEditableGroceryList
} from "./restock-candidates";
import type { PantryItem } from "./types";

describe("selectCurrentEditableGroceryList", () => {
  it("uses shopping started, then finalized, then draft, and ignores completed lists", () => {
    expect(
      selectCurrentEditableGroceryList([
        groceryList({ id: "completed", status: "completed" }),
        groceryList({
          createdAt: "2026-06-27T10:00:00Z",
          id: "draft-new",
          status: "draft"
        }),
        groceryList({
          createdAt: "2026-06-27T09:00:00Z",
          id: "finalized",
          status: "finalized"
        }),
        groceryList({
          createdAt: "2026-06-27T08:00:00Z",
          id: "shopping",
          status: "shopping_started"
        })
      ])?.id
    ).toBe("shopping");

    expect(
      selectCurrentEditableGroceryList([
        groceryList({ id: "completed", status: "completed" }),
        groceryList({ id: "draft", status: "draft" }),
        groceryList({ id: "finalized", status: "finalized" })
      ])?.id
    ).toBe("finalized");
  });
});

describe("buildPantryRestockCandidates", () => {
  it("returns manual low, manual out, and threshold-derived low candidates only", () => {
    const candidates = buildPantryRestockCandidates({
      groceryLists: [groceryList()],
      pantryItems: [
        pantryItem({ foodId: "manual-low", id: "manual-low", stockStatus: "low" }),
        pantryItem({ foodId: "manual-out", id: "manual-out", stockStatus: "out" }),
        pantryItem({
          foodId: "threshold-low",
          id: "threshold-low",
          lowStockThresholdQuantity: 3,
          lowStockThresholdUnit: "count",
          quantity: 2,
          stockStatus: "in_stock",
          unit: "count"
        }),
        pantryItem({ foodId: "unknown", id: "unknown", stockStatus: "unknown" }),
        pantryItem({ foodId: "in-stock", id: "in-stock", stockStatus: "in_stock" }),
        pantryItem({
          foodId: "mismatched-threshold",
          id: "mismatched-threshold",
          lowStockThresholdQuantity: 1,
          lowStockThresholdUnit: "lb",
          quantity: 8,
          stockStatus: "in_stock",
          unit: "oz"
        }),
        pantryItem({
          discardedAt: "2026-06-27T12:00:00Z",
          foodId: "discarded",
          id: "discarded",
          stockStatus: "out"
        })
      ]
    });

    expect(candidates.map((candidate) => candidate.foodId)).toEqual([
      "manual-low",
      "manual-out",
      "threshold-low"
    ]);
    expect(candidates.map((candidate) => candidate.status)).toEqual([
      "actionable",
      "actionable",
      "actionable"
    ]);
  });

  it("rolls up by food id and picks a deterministic representative pantry item", () => {
    const candidates = buildPantryRestockCandidates({
      groceryLists: [groceryList()],
      pantryItems: [
        pantryItem({
          displayName: "Beans low",
          expirationDate: "2026-07-01",
          foodId: "beans",
          id: "lot-low",
          stockStatus: "low",
          updatedAt: "2026-06-27T12:00:00Z"
        }),
        pantryItem({
          displayName: "Beans out later",
          expirationDate: "2026-07-05",
          foodId: "beans",
          id: "lot-out-later",
          stockStatus: "out",
          updatedAt: "2026-06-27T13:00:00Z"
        }),
        pantryItem({
          displayName: "Beans out soon",
          expirationDate: "2026-06-30",
          foodId: "beans",
          id: "lot-out-soon",
          stockStatus: "out",
          updatedAt: "2026-06-27T11:00:00Z"
        })
      ]
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      displayName: "Beans out soon",
      foodId: "beans",
      pantryItemId: "lot-out-soon",
      quantity: null,
      sourceType: "pantry_restock",
      stockReason: "out"
    });
  });

  it("marks strict same-food grocery matches as already on the selected editable list", () => {
    const candidates = buildPantryRestockCandidates({
      groceryLists: [
        groceryList({
          items: [groceryItem({ foodId: "beans", id: "completed-beans" })],
          status: "completed"
        }),
        groceryList({
          id: "current-list",
          items: [groceryItem({ foodId: "rice", id: "current-rice" })],
          status: "finalized"
        })
      ],
      pantryItems: [
        pantryItem({ foodId: "beans", id: "beans", stockStatus: "out" }),
        pantryItem({ foodId: "rice", id: "rice", stockStatus: "low" })
      ]
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        foodId: "beans",
        groceryListId: "current-list",
        status: "actionable"
      }),
      expect.objectContaining({
        existingGroceryListItemId: "current-rice",
        foodId: "rice",
        groceryListId: "current-list",
        status: "already_on_grocery_list"
      })
    ]);
  });

  it("warns on display-name matches without silently deduping", () => {
    const candidates = buildPantryRestockCandidates({
      groceryLists: [
        groceryList({
          items: [
            groceryItem({
              displayName: "BLACK   BEANS",
              foodId: null,
              id: "name-match"
            })
          ]
        })
      ],
      pantryItems: [
        pantryItem({
          displayName: "Black beans",
          foodId: "beans",
          id: "beans",
          stockStatus: "out"
        })
      ]
    });

    expect(candidates[0]).toMatchObject({
      displayNameMatchGroceryListItemId: "name-match",
      status: "actionable",
      warnings: ["display_name_match_on_grocery_list"]
    });
  });

  it("returns read-only candidates when there is no editable grocery list", () => {
    const candidates = buildPantryRestockCandidates({
      groceryLists: [groceryList({ status: "completed" })],
      pantryItems: [pantryItem({ foodId: "beans", id: "beans", stockStatus: "out" })]
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        foodId: "beans",
        groceryListId: null,
        status: "no_editable_grocery_list"
      })
    ]);
  });

  it("uses pantry category before household item default category for later add behavior", () => {
    const candidates = buildPantryRestockCandidates({
      groceryLists: [groceryList()],
      pantryItems: [
        pantryItem({
          foodDefaultGroceryCategoryId: "default-pantry",
          foodId: "beans",
          groceryCategoryId: "lot-pantry",
          id: "beans",
          stockStatus: "out"
        }),
        pantryItem({
          foodDefaultGroceryCategoryId: "default-household",
          foodId: "paper-towels",
          groceryCategoryId: null,
          id: "paper-towels",
          stockStatus: "low"
        })
      ]
    });

    expect(candidates.map((candidate) => candidate.groceryCategoryId)).toEqual([
      "lot-pantry",
      "default-household"
    ]);
  });
});

function groceryList(
  overrides: Partial<
    Parameters<typeof selectCurrentEditableGroceryList>[0][number]
  > = {}
): Parameters<typeof selectCurrentEditableGroceryList>[0][number] {
  return {
    createdAt: "2026-06-27T12:00:00Z",
    id: "grocery-list",
    items: [],
    status: "draft",
    ...overrides
  };
}

function groceryItem(
  overrides: Partial<
    Parameters<typeof selectCurrentEditableGroceryList>[0][number]["items"][number]
  > = {}
): Parameters<typeof selectCurrentEditableGroceryList>[0][number]["items"][number] {
  return {
    displayName: "Rice",
    foodId: "food-1",
    id: "grocery-item-1",
    ...overrides
  };
}

function pantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    discardedAt: null,
    displayName: "Rice",
    expirationDate: null,
    foodDefaultGroceryCategoryId: null,
    foodId: "food-1",
    foodName: "Rice",
    groceryCategoryId: "pantry",
    groceryCategoryName: "Pantry",
    groceryCategorySortOrder: 10,
    householdId: "household-1",
    id: "item-1",
    isOpen: false,
    lowStockThresholdQuantity: null,
    lowStockThresholdUnit: null,
    mealProfileId: null,
    mealProfileName: null,
    notes: null,
    openedAt: null,
    packageDetail: null,
    quantity: null,
    quantityNote: null,
    stockStatus: "in_stock",
    storageLocation: null,
    unit: null,
    updatedAt: "2026-06-27T12:00:00Z",
    ...overrides
  };
}
