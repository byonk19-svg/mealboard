export type GroceryProgressField = "alreadyHave" | "checked";

export type GroceryProgressOperation = {
  attemptCount?: number;
  field: GroceryProgressField;
  itemId: string;
  lastError?: string | null;
  nextRetryAt?: number | null;
  terminal?: boolean;
  updatedAt: number;
  value: boolean;
};

export type NormalizedGroceryProgressOperation = Required<
  Pick<
    GroceryProgressOperation,
    "attemptCount" | "field" | "itemId" | "lastError" | "nextRetryAt" | "terminal" | "updatedAt" | "value"
  >
>;

const RETRY_BACKOFF_MS = [5_000, 15_000, 30_000, 60_000] as const;

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
  const latestByItemField = new Map<string, NormalizedGroceryProgressOperation>();

  for (const operation of operations) {
    const normalizedOperation = normalizeGroceryProgressOperation(operation);
    const key = operationKey(normalizedOperation);
    const current = latestByItemField.get(key);

    if (!current || normalizedOperation.updatedAt >= current.updatedAt) {
      latestByItemField.set(key, normalizedOperation);
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

export function markGroceryProgressOperationAttempted({
  now,
  operation,
  status = 0
}: {
  now: number;
  operation: GroceryProgressOperation;
  status?: number;
}): NormalizedGroceryProgressOperation {
  const normalizedOperation = normalizeGroceryProgressOperation(operation);
  const attemptCount = normalizedOperation.attemptCount + 1;

  if (!isGroceryProgressRetryableStatus(status)) {
    return markGroceryProgressOperationTerminal({
      error: normalizedOperation.lastError ?? "This update cannot be retried.",
      operation: {
        ...normalizedOperation,
        attemptCount
      }
    });
  }

  return {
    ...normalizedOperation,
    attemptCount,
    lastError: normalizedOperation.lastError,
    nextRetryAt: buildGroceryProgressNextRetryAt({ attemptCount, now }),
    terminal: false
  };
}

export function markGroceryProgressOperationTerminal({
  error,
  operation
}: {
  error: string | null;
  operation: GroceryProgressOperation;
}): NormalizedGroceryProgressOperation {
  const normalizedOperation = normalizeGroceryProgressOperation(operation);

  return {
    ...normalizedOperation,
    lastError: error,
    nextRetryAt: null,
    terminal: true
  };
}

export function buildGroceryProgressNextRetryAt({
  attemptCount,
  now
}: {
  attemptCount: number;
  now: number;
}) {
  const delay =
    RETRY_BACKOFF_MS[
      Math.min(Math.max(attemptCount - 1, 0), RETRY_BACKOFF_MS.length - 1)
    ];

  return now + delay;
}

export function isGroceryProgressRetryableStatus(status: number) {
  return (
    status === 0 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
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

function normalizeGroceryProgressOperation(
  operation: GroceryProgressOperation
): NormalizedGroceryProgressOperation {
  return {
    attemptCount: operation.attemptCount ?? 0,
    field: operation.field,
    itemId: operation.itemId,
    lastError: operation.lastError ?? null,
    nextRetryAt: operation.nextRetryAt ?? null,
    terminal: operation.terminal ?? false,
    updatedAt: operation.updatedAt,
    value: operation.value
  };
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
