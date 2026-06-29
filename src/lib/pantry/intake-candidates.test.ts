import { describe, expect, it } from "vitest";
import {
  buildPantryIntakeCandidates,
  type PantryIntakeDecision,
  type PantryIntakeGroceryList,
  type PantryIntakeGroceryListItem
} from "./intake-candidates";

describe("buildPantryIntakeCandidates", () => {
  it("derives candidates from checked completed grocery items with linked foods", () => {
    const candidates = buildPantryIntakeCandidates({
      decisions: [],
      groceryLists: [
        groceryList({
          items: [
            groceryItem({
              id: "item-1",
              preferredQuantityText: "about two cans",
              quantity: 2,
              sources: [
                {
                  mealProfileName: "Family",
                  notes: "For chili",
                  quantity: 2,
                  sourceLabel: "Chili",
                  sourceType: "recipe",
                  unit: "cans"
                }
              ],
              unit: "cans"
            })
          ]
        })
      ]
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        displayName: "Black beans",
        foodId: "food-beans",
        groceryListId: "list-1",
        groceryListItemId: "item-1",
        preferredQuantityText: "about two cans",
        quantity: 2,
        sources: [
          {
            mealProfileName: "Family",
            notes: "For chili",
            quantity: 2,
            sourceLabel: "Chili",
            sourceType: "recipe",
            unit: "cans"
          }
        ],
        unit: "cans"
      })
    ]);
  });

  it("excludes unchecked, already-have, unlinked, non-completed, and reviewed items", () => {
    const decisions: PantryIntakeDecision[] = [
      { groceryListItemId: "confirmed-item", status: "confirmed" },
      { groceryListItemId: "skipped-item", status: "skipped" }
    ];

    const candidates = buildPantryIntakeCandidates({
      decisions,
      groceryLists: [
        groceryList({
          items: [
            groceryItem({ id: "unchecked-item", checked: false }),
            groceryItem({ id: "already-have-item", alreadyHave: true }),
            groceryItem({ id: "unlinked-item", foodId: null }),
            groceryItem({ id: "confirmed-item" }),
            groceryItem({ id: "skipped-item" }),
            groceryItem({ id: "eligible-item" })
          ]
        }),
        groceryList({
          id: "active-list",
          items: [groceryItem({ groceryListId: "active-list", id: "active-item" })],
          status: "shopping_started"
        })
      ]
    });

    expect(candidates.map((candidate) => candidate.groceryListItemId)).toEqual([
      "eligible-item"
    ]);
  });

  it("orders by completed recency, list recency, item sort order, and item id", () => {
    const candidates = buildPantryIntakeCandidates({
      decisions: [],
      groceryLists: [
        groceryList({
          completedAt: "2026-06-20T00:00:00.000Z",
          createdAt: "2026-06-19T00:00:00.000Z",
          id: "older-list",
          items: [groceryItem({ groceryListId: "older-list", id: "older-item" })]
        }),
        groceryList({
          completedAt: "2026-06-21T00:00:00.000Z",
          createdAt: "2026-06-20T00:00:00.000Z",
          id: "newer-list",
          items: [
            groceryItem({
              groceryListId: "newer-list",
              id: "newer-b",
              sortOrder: 2
            }),
            groceryItem({
              groceryListId: "newer-list",
              id: "newer-a",
              sortOrder: 2
            }),
            groceryItem({
              groceryListId: "newer-list",
              id: "newer-first",
              sortOrder: 1
            })
          ]
        })
      ]
    });

    expect(candidates.map((candidate) => candidate.groceryListItemId)).toEqual([
      "newer-first",
      "newer-a",
      "newer-b",
      "older-item"
    ]);
  });
});

function groceryList(
  overrides: Partial<PantryIntakeGroceryList> = {}
): PantryIntakeGroceryList {
  return {
    completedAt: "2026-06-21T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
    id: "list-1",
    items: [],
    name: "Completed groceries",
    status: "completed",
    weekStartDate: "2026-06-15",
    ...overrides
  };
}

function groceryItem(
  overrides: Partial<PantryIntakeGroceryListItem> = {}
): PantryIntakeGroceryListItem {
  return {
    alreadyHave: false,
    checked: true,
    displayName: "Black beans",
    foodId: "food-beans",
    foodName: "Black beans",
    groceryCategoryId: "category-canned",
    groceryCategoryName: "Canned goods",
    groceryListId: "list-1",
    id: "item-1",
    preferredQuantityText: null,
    quantity: null,
    sortOrder: 0,
    sources: [],
    unit: null,
    ...overrides
  };
}
