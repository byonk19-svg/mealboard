export type PantryIntakeDecisionStatus = "confirmed" | "skipped";

export type PantryIntakeDecision = {
  groceryListItemId: string;
  status: PantryIntakeDecisionStatus;
};

export type PantryIntakeCandidateSource = {
  mealProfileName: string | null;
  notes: string | null;
  quantity: number | null;
  sourceLabel: string | null;
  sourceType: string;
  unit: string | null;
};

export type PantryIntakeGroceryListItem = {
  alreadyHave: boolean;
  checked: boolean;
  displayName: string;
  foodId: string | null;
  foodName: string | null;
  groceryCategoryId: string | null;
  groceryCategoryName: string | null;
  groceryListId: string;
  id: string;
  preferredQuantityText: string | null;
  quantity: number | null;
  sortOrder: number;
  sources: PantryIntakeCandidateSource[];
  unit: string | null;
};

export type PantryIntakeGroceryList = {
  completedAt: string | null;
  createdAt: string;
  id: string;
  items: PantryIntakeGroceryListItem[];
  name: string | null;
  status: "draft" | "finalized" | "shopping_started" | "completed";
  weekStartDate: string | null;
};

export type PantryIntakeCandidate = {
  completedAt: string | null;
  createdAt: string;
  displayName: string;
  foodId: string;
  foodName: string | null;
  groceryCategoryId: string | null;
  groceryCategoryName: string | null;
  groceryListId: string;
  groceryListItemId: string;
  groceryListName: string | null;
  preferredQuantityText: string | null;
  quantity: number | null;
  sortOrder: number;
  sources: PantryIntakeCandidateSource[];
  unit: string | null;
  weekStartDate: string | null;
};

export function buildPantryIntakeCandidates({
  decisions,
  groceryLists
}: {
  decisions: PantryIntakeDecision[];
  groceryLists: PantryIntakeGroceryList[];
}): PantryIntakeCandidate[] {
  const reviewedItemIds = new Set(
    decisions.map((decision) => decision.groceryListItemId)
  );

  return groceryLists
    .filter((list) => list.status === "completed")
    .flatMap((list) =>
      list.items
        .filter(
          (item) =>
            item.checked &&
            !item.alreadyHave &&
            item.foodId !== null &&
            !reviewedItemIds.has(item.id)
        )
        .map((item) => ({
          completedAt: list.completedAt,
          createdAt: list.createdAt,
          displayName: item.displayName,
          foodId: item.foodId as string,
          foodName: item.foodName,
          groceryCategoryId: item.groceryCategoryId,
          groceryCategoryName: item.groceryCategoryName,
          groceryListId: list.id,
          groceryListItemId: item.id,
          groceryListName: list.name,
          preferredQuantityText: item.preferredQuantityText,
          quantity: item.quantity,
          sortOrder: item.sortOrder,
          sources: item.sources,
          unit: item.unit,
          weekStartDate: list.weekStartDate
        }))
    )
    .sort(comparePantryIntakeCandidates);
}

function comparePantryIntakeCandidates(
  left: PantryIntakeCandidate,
  right: PantryIntakeCandidate
) {
  const leftCompletedAt = left.completedAt ?? "";
  const rightCompletedAt = right.completedAt ?? "";

  if (leftCompletedAt !== rightCompletedAt) {
    return rightCompletedAt.localeCompare(leftCompletedAt);
  }

  if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.groceryListItemId.localeCompare(right.groceryListItemId);
}
