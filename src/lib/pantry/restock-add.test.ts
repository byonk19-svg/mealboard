import { describe, expect, it } from "vitest";
import {
  buildPantryRestockGroceryAddOperation,
  isEditablePantryRestockGroceryListStatus
} from "./restock-add";
import type { PantryRestockCandidate } from "./restock-candidates";

describe("isEditablePantryRestockGroceryListStatus", () => {
  it("allows draft, finalized, and shopping-started lists but not completed lists", () => {
    expect(isEditablePantryRestockGroceryListStatus("draft")).toBe(true);
    expect(isEditablePantryRestockGroceryListStatus("finalized")).toBe(true);
    expect(isEditablePantryRestockGroceryListStatus("shopping_started")).toBe(true);
    expect(isEditablePantryRestockGroceryListStatus("completed")).toBe(false);
  });
});

describe("buildPantryRestockGroceryAddOperation", () => {
  it("builds one grocery item and pantry-restock source with null quantity and unit", () => {
    expect(
      buildPantryRestockGroceryAddOperation({
        candidate: candidate(),
        householdId: "household-1",
        sortOrder: 4
      })
    ).toEqual({
      item: {
        display_name: "Black beans",
        food_id: "food-beans",
        grocery_category_id: "pantry",
        grocery_list_id: "list-1",
        household_id: "household-1",
        manual_item: true,
        preferred_quantity_text: null,
        quantity: null,
        sort_order: 4,
        unit: null
      },
      source: {
        household_id: "household-1",
        meal_profile_id: "profile-shared",
        notes: "Pantry status: low",
        quantity: null,
        source_id: "pantry-item-1",
        source_label: "Restock: Black beans",
        source_type: "pantry_restock",
        unit: null
      }
    });
  });

  it("uses null category and profile when the candidate has no category or profile context", () => {
    const operation = buildPantryRestockGroceryAddOperation({
      candidate: candidate({
        groceryCategoryId: null,
        mealProfileId: null,
        mealProfileName: null
      }),
      householdId: "household-1",
      sortOrder: 0
    });

    expect(operation.item.grocery_category_id).toBeNull();
    expect(operation.source.meal_profile_id).toBeNull();
  });

  it("rejects read-only and already-added candidates", () => {
    expect(() =>
      buildPantryRestockGroceryAddOperation({
        candidate: candidate({
          groceryListId: null,
          groceryListStatus: null,
          status: "no_editable_grocery_list"
        }),
        householdId: "household-1",
        sortOrder: 0
      })
    ).toThrow("No editable grocery list is available.");

    expect(() =>
      buildPantryRestockGroceryAddOperation({
        candidate: candidate({
          existingGroceryListItemId: "existing-item",
          status: "already_on_grocery_list"
        }),
        householdId: "household-1",
        sortOrder: 0
      })
    ).toThrow("That pantry item is already on the grocery list.");
  });

  it("rejects a candidate whose selected list is no longer editable", () => {
    expect(() =>
      buildPantryRestockGroceryAddOperation({
        candidate: candidate({
          groceryListStatus: "completed",
          status: "actionable"
        }),
        householdId: "household-1",
        sortOrder: 0
      })
    ).toThrow("That grocery list is no longer editable.");
  });
});

function candidate(
  overrides: Partial<PantryRestockCandidate> = {}
): PantryRestockCandidate {
  return {
    displayName: "Black beans",
    displayNameMatchGroceryListItemId: null,
    existingGroceryListItemId: null,
    foodId: "food-beans",
    foodName: "Black beans",
    groceryCategoryId: "pantry",
    groceryListId: "list-1",
    groceryListStatus: "draft",
    mealProfileId: "profile-shared",
    mealProfileName: "Shared",
    pantryItemId: "pantry-item-1",
    quantity: null,
    sourceLabel: "Restock: Black beans",
    sourceNotes: "Pantry status: low",
    sourceType: "pantry_restock",
    status: "actionable",
    stockReason: "low",
    unit: null,
    warnings: [],
    ...overrides
  };
}
