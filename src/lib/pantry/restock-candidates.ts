import { getEffectiveStockStatus } from "./domain";
import type { GroceryListStatus } from "@/lib/grocery/data";
import type { PantryItem, PantryStockStatus } from "./types";

export type PantryRestockCandidateStatus =
  | "actionable"
  | "already_on_grocery_list"
  | "no_editable_grocery_list";

export type PantryRestockCandidateWarning =
  "display_name_match_on_grocery_list";

export type PantryRestockGroceryListItem = {
  displayName: string;
  foodId: string | null;
  id: string;
};

export type PantryRestockGroceryList = {
  createdAt: string;
  id: string;
  items: PantryRestockGroceryListItem[];
  status: GroceryListStatus;
};

export type PantryRestockCandidate = {
  displayName: string;
  displayNameMatchGroceryListItemId: string | null;
  existingGroceryListItemId: string | null;
  foodId: string;
  foodName: string;
  groceryCategoryId: string | null;
  groceryListId: string | null;
  groceryListStatus: GroceryListStatus | null;
  mealProfileId: string | null;
  mealProfileName: string | null;
  pantryItemId: string;
  quantity: null;
  sourceLabel: string;
  sourceNotes: string;
  sourceType: "pantry_restock";
  status: PantryRestockCandidateStatus;
  stockReason: Extract<PantryStockStatus, "low" | "out">;
  unit: null;
  warnings: PantryRestockCandidateWarning[];
};

const editableStatusPriority: Record<GroceryListStatus, number> = {
  completed: 0,
  draft: 1,
  finalized: 2,
  shopping_started: 3
};

export function selectCurrentEditableGroceryList(
  groceryLists: PantryRestockGroceryList[]
) {
  return (
    groceryLists
      .filter((list) => editableStatusPriority[list.status] > 0)
      .sort(compareEditableGroceryLists)[0] ?? null
  );
}

export function buildPantryRestockCandidates({
  groceryLists,
  pantryItems
}: {
  groceryLists: PantryRestockGroceryList[];
  pantryItems: PantryItem[];
}): PantryRestockCandidate[] {
  const currentList = selectCurrentEditableGroceryList(groceryLists);
  const currentItems = currentList?.items ?? [];
  const itemByFoodId = new Map(
    currentItems
      .filter((item) => item.foodId)
      .map((item) => [item.foodId as string, item])
  );
  const itemByDisplayName = new Map(
    currentItems.map((item) => [normalizeDisplayName(item.displayName), item])
  );
  const groups = groupEligiblePantryItemsByFoodId(pantryItems);

  return Array.from(groups.values()).map((group) => {
    const representative = [...group].sort(compareRepresentativeItems)[0];

    if (!representative) {
      throw new Error("Restock candidate group has no pantry items.");
    }

    const stockReason = getRestockStockReason(representative);
    const exactMatch = currentList
      ? itemByFoodId.get(representative.foodId) ?? null
      : null;
    const displayNameMatch =
      currentList && !exactMatch
        ? itemByDisplayName.get(normalizeDisplayName(representative.displayName)) ??
          null
        : null;
    const status: PantryRestockCandidateStatus = !currentList
      ? "no_editable_grocery_list"
      : exactMatch
        ? "already_on_grocery_list"
        : "actionable";
    const warnings: PantryRestockCandidateWarning[] = displayNameMatch
      ? ["display_name_match_on_grocery_list"]
      : [];

    return {
      displayName: representative.displayName,
      displayNameMatchGroceryListItemId: displayNameMatch?.id ?? null,
      existingGroceryListItemId: exactMatch?.id ?? null,
      foodId: representative.foodId,
      foodName: representative.foodName,
      groceryCategoryId:
        representative.groceryCategoryId ??
        representative.foodDefaultGroceryCategoryId,
      groceryListId: currentList?.id ?? null,
      groceryListStatus: currentList?.status ?? null,
      mealProfileId: representative.mealProfileId,
      mealProfileName: representative.mealProfileName,
      pantryItemId: representative.id,
      quantity: null,
      sourceLabel: `Restock: ${representative.displayName}`,
      sourceNotes: `Pantry status: ${stockReason}`,
      sourceType: "pantry_restock",
      status,
      stockReason,
      unit: null,
      warnings
    };
  });
}

function groupEligiblePantryItemsByFoodId(pantryItems: PantryItem[]) {
  const groups = new Map<string, PantryItem[]>();

  for (const item of pantryItems) {
    if (item.discardedAt !== null || !isRestockStatus(getEffectiveStockStatus(item))) {
      continue;
    }

    groups.set(item.foodId, [...(groups.get(item.foodId) ?? []), item]);
  }

  return groups;
}

function compareEditableGroceryLists(
  first: PantryRestockGroceryList,
  second: PantryRestockGroceryList
) {
  const priorityDifference =
    editableStatusPriority[second.status] - editableStatusPriority[first.status];

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const createdDifference =
    Date.parse(second.createdAt) - Date.parse(first.createdAt);

  if (createdDifference !== 0) {
    return createdDifference;
  }

  return first.id.localeCompare(second.id);
}

function compareRepresentativeItems(first: PantryItem, second: PantryItem) {
  const firstStatus = getRestockStockReason(first);
  const secondStatus = getRestockStockReason(second);

  if (firstStatus !== secondStatus) {
    return firstStatus === "out" ? -1 : 1;
  }

  const expirationComparison = compareOptionalDates(
    first.expirationDate,
    second.expirationDate
  );

  if (expirationComparison !== 0) {
    return expirationComparison;
  }

  const updatedDifference =
    Date.parse(second.updatedAt) - Date.parse(first.updatedAt);

  if (updatedDifference !== 0) {
    return updatedDifference;
  }

  return first.id.localeCompare(second.id);
}

function compareOptionalDates(first: string | null, second: string | null) {
  if (first && second) {
    return Date.parse(`${first}T00:00:00Z`) - Date.parse(`${second}T00:00:00Z`);
  }

  if (first) {
    return -1;
  }

  if (second) {
    return 1;
  }

  return 0;
}

function getRestockStockReason(
  item: PantryItem
): Extract<PantryStockStatus, "low" | "out"> {
  const effectiveStatus = getEffectiveStockStatus(item);

  if (!isRestockStatus(effectiveStatus)) {
    throw new Error("Pantry item is not eligible for restock.");
  }

  return effectiveStatus;
}

function isRestockStatus(
  status: PantryStockStatus
): status is Extract<PantryStockStatus, "low" | "out"> {
  return status === "low" || status === "out";
}

function normalizeDisplayName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
