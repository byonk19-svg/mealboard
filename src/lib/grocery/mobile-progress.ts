export type GroceryProgressField = "alreadyHave" | "checked";

export type GroceryProgressOperation = {
  field: GroceryProgressField;
  itemId: string;
  updatedAt: number;
  value: boolean;
};

const fieldOrder: Record<GroceryProgressField, number> = {
  alreadyHave: 0,
  checked: 1
};

export function getGroceryProgressStorageKey({
  generatedAt,
  groceryListId
}: {
  generatedAt: string | null;
  groceryListId: string;
}) {
  return `mealboard:grocery-progress:${groceryListId}:${generatedAt ?? "not-generated"}`;
}

export function mergeGroceryProgressOperations(
  operations: GroceryProgressOperation[]
) {
  const latestByItemField = new Map<string, GroceryProgressOperation>();

  for (const operation of operations) {
    const key = operationKey(operation);
    const current = latestByItemField.get(key);

    if (!current || operation.updatedAt >= current.updatedAt) {
      latestByItemField.set(key, operation);
    }
  }

  return Array.from(latestByItemField.values()).sort((a, b) => {
    const itemComparison = a.itemId.localeCompare(b.itemId);

    if (itemComparison !== 0) {
      return itemComparison;
    }

    return fieldOrder[a.field] - fieldOrder[b.field];
  });
}

export function applyGroceryProgressOperations<
  Item extends {
    alreadyHave: boolean;
    checked: boolean;
    id: string;
  }
>({
  items,
  operations
}: {
  items: Item[];
  operations: GroceryProgressOperation[];
}) {
  const operationsByItemId = new Map<string, GroceryProgressOperation[]>();

  for (const operation of mergeGroceryProgressOperations(operations)) {
    const current = operationsByItemId.get(operation.itemId) ?? [];
    current.push(operation);
    operationsByItemId.set(operation.itemId, current);
  }

  return items.map((item) => {
    const itemOperations = operationsByItemId.get(item.id);

    if (!itemOperations) {
      return item;
    }

    return itemOperations.reduce(
      (updatedItem, operation) => ({
        ...updatedItem,
        [operation.field]: operation.value
      }),
      item
    );
  });
}

export function serializeGroceryProgressOperations(
  operations: GroceryProgressOperation[]
) {
  return JSON.stringify(mergeGroceryProgressOperations(operations));
}

export function parseGroceryProgressOperations(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return mergeGroceryProgressOperations(
    parsed.filter(isGroceryProgressOperation)
  );
}

export function removeGroceryProgressOperation({
  field,
  itemId,
  operations
}: {
  field: GroceryProgressField;
  itemId: string;
  operations: GroceryProgressOperation[];
}) {
  return operations.filter(
    (operation) => operation.itemId !== itemId || operation.field !== field
  );
}

export function getGroceryProgressOperationKey(
  operation: Pick<GroceryProgressOperation, "field" | "itemId">
) {
  return `${operation.itemId}:${operation.field}`;
}

function operationKey(operation: Pick<GroceryProgressOperation, "field" | "itemId">) {
  return getGroceryProgressOperationKey(operation);
}

function isGroceryProgressOperation(
  value: unknown
): value is GroceryProgressOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<GroceryProgressOperation>;

  return (
    typeof candidate.itemId === "string" &&
    candidate.itemId.length > 0 &&
    (candidate.field === "alreadyHave" || candidate.field === "checked") &&
    typeof candidate.value === "boolean" &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt)
  );
}
