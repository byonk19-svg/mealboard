import type { GroceryListStatus } from "@/lib/grocery/data";
import type { PantryRestockCandidate } from "./restock-candidates";

export type PantryRestockGroceryItemInsert = {
  display_name: string;
  food_id: string;
  grocery_category_id: string | null;
  grocery_list_id: string;
  household_id: string;
  manual_item: true;
  preferred_quantity_text: null;
  quantity: null;
  sort_order: number;
  unit: null;
};

export type PantryRestockGrocerySourceInsert = {
  grocery_list_item_id?: string;
  household_id: string;
  meal_profile_id: string | null;
  notes: string;
  quantity: null;
  source_id: string;
  source_label: string;
  source_type: "pantry_restock";
  unit: null;
};

export type PantryRestockGroceryAddOperation = {
  item: PantryRestockGroceryItemInsert;
  source: PantryRestockGrocerySourceInsert;
};

export function isEditablePantryRestockGroceryListStatus(
  status: GroceryListStatus
) {
  return (
    status === "draft" ||
    status === "finalized" ||
    status === "shopping_started"
  );
}

export function buildPantryRestockGroceryAddOperation({
  candidate,
  householdId,
  sortOrder
}: {
  candidate: PantryRestockCandidate;
  householdId: string;
  sortOrder: number;
}): PantryRestockGroceryAddOperation {
  if (candidate.status === "no_editable_grocery_list" || !candidate.groceryListId) {
    throw new Error("No editable grocery list is available.");
  }

  if (candidate.status === "already_on_grocery_list") {
    throw new Error("That pantry item is already on the grocery list.");
  }

  if (
    !candidate.groceryListStatus ||
    !isEditablePantryRestockGroceryListStatus(candidate.groceryListStatus)
  ) {
    throw new Error("That grocery list is no longer editable.");
  }

  return {
    item: {
      display_name: candidate.displayName,
      food_id: candidate.foodId,
      grocery_category_id: candidate.groceryCategoryId,
      grocery_list_id: candidate.groceryListId,
      household_id: householdId,
      manual_item: true,
      preferred_quantity_text: null,
      quantity: null,
      sort_order: sortOrder,
      unit: null
    },
    source: {
      household_id: householdId,
      meal_profile_id: candidate.mealProfileId,
      notes: candidate.sourceNotes,
      quantity: null,
      source_id: candidate.pantryItemId,
      source_label: candidate.sourceLabel,
      source_type: candidate.sourceType,
      unit: null
    }
  };
}
