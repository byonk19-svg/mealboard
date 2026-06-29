import type { PantryIntakeCandidate } from "./intake-candidates";
import type { PantryItem, PantryItemInput } from "./types";

export type PantryIntakeConfirmInput = Omit<PantryItemInput, "foodId">;

export type PantryIntakeConfirmResult =
  | {
      groceryListItemId: string;
      pantryItem: PantryItem;
      status: "confirmed";
    }
  | {
      groceryListItemId: string;
      pantryItemId: string | null;
      status: "already_confirmed";
    };

export type PantryIntakeSkipResult =
  | {
      groceryListItemId: string;
      status: "skipped";
    }
  | {
      groceryListItemId: string;
      status: "already_skipped";
    };

export function buildPantryItemInputFromIntakeCandidate({
  candidate,
  input
}: {
  candidate: PantryIntakeCandidate;
  input: PantryIntakeConfirmInput;
}): PantryItemInput {
  return {
    ...input,
    displayName: input.displayName ?? candidate.displayName,
    foodId: candidate.foodId,
    groceryCategoryId:
      input.groceryCategoryId ?? candidate.groceryCategoryId ?? null,
    stockStatus: input.stockStatus ?? "in_stock"
  };
}

export function buildConfirmedPantryIntakeDecisionInsert({
  groceryListItemId,
  householdId,
  note,
  pantryItemId
}: {
  groceryListItemId: string;
  householdId: string;
  note?: string | null;
  pantryItemId: string;
}) {
  return {
    created_pantry_item_id: pantryItemId,
    grocery_list_item_id: groceryListItemId,
    household_id: householdId,
    note: normalizeDecisionNote(note),
    status: "confirmed" as const
  };
}

export function buildSkippedPantryIntakeDecisionInsert({
  groceryListItemId,
  householdId,
  note
}: {
  groceryListItemId: string;
  householdId: string;
  note?: string | null;
}) {
  return {
    created_pantry_item_id: null,
    grocery_list_item_id: groceryListItemId,
    household_id: householdId,
    note: normalizeDecisionNote(note),
    status: "skipped" as const
  };
}

function normalizeDecisionNote(value: string | null | undefined) {
  const note = String(value ?? "").trim().replace(/\s+/g, " ");
  return note.length > 0 ? note : null;
}
