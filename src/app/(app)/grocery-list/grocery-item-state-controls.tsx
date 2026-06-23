"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import {
  getGroceryProgressOperationKey,
  mergeGroceryProgressOperations,
  parseGroceryProgressOperations,
  removeGroceryProgressOperation,
  serializeGroceryProgressOperations,
  type GroceryProgressField,
  type GroceryProgressOperation
} from "@/lib/grocery/mobile-progress";

type GroceryItemStateControlsProps = {
  canEdit: boolean;
  initialAlreadyHave: boolean;
  initialChecked: boolean;
  itemId: string;
  storageKey: string;
};

type GroceryItemState = {
  alreadyHave: boolean;
  checked: boolean;
};

export function GroceryItemStateControls({
  canEdit,
  initialAlreadyHave,
  initialChecked,
  itemId,
  storageKey
}: GroceryItemStateControlsProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inFlightOperationKeysRef = useRef<Set<string>>(new Set());
  const rawOperations = useSyncExternalStore(
    subscribeToGroceryProgress,
    () => readRawOperations(storageKey),
    () => ""
  );
  const operations = useMemo(
    () => parseGroceryProgressOperations(rawOperations),
    [rawOperations]
  );
  const itemOperations = useMemo(
    () =>
      operations.filter(
        (operation) => operation.itemId === itemId
      ),
    [itemId, operations]
  );
  const state = useMemo<GroceryItemState>(
    () =>
      itemOperations.reduce(
        (updatedState, operation) => ({
          ...updatedState,
          [operation.field]: operation.value
        }),
        {
          alreadyHave: initialAlreadyHave,
          checked: initialChecked
        }
      ),
    [initialAlreadyHave, initialChecked, itemOperations]
  );
  const pendingFields = useMemo(
    () =>
      itemOperations.map(
        (operation) => operation.field
      ),
    [itemOperations]
  );

  const pendingText = useMemo(() => {
    if (pendingFields.length === 0) {
      return null;
    }

    return "Saved locally. Retry when service returns.";
  }, [pendingFields.length]);

  const sendOperation = useCallback(
    async (operation: GroceryProgressOperation) => {
      const operationKey = getGroceryProgressOperationKey(operation);

      if (inFlightOperationKeysRef.current.has(operationKey)) {
        return;
      }

      inFlightOperationKeysRef.current.add(operationKey);

      try {
        const response = await fetch(
          `/api/grocery-list/items/${encodeURIComponent(operation.itemId)}/state`,
          {
            body: JSON.stringify({
              [operation.field]: operation.value
            }),
            headers: {
              "Content-Type": "application/json"
            },
            method: "PATCH"
          }
        );

        if (!response.ok) {
          throw new Error("Grocery item update failed.");
        }

        const remainingOperations = removeGroceryProgressOperation({
          field: operation.field,
          itemId: operation.itemId,
          operations: readOperations(storageKey)
        });
        writeOperations(storageKey, remainingOperations);
        setStatusMessage("Grocery item updated.");
      } catch {
        setStatusMessage("Saved locally. Retry when service returns.");
      } finally {
        inFlightOperationKeysRef.current.delete(operationKey);
      }
    },
    [storageKey]
  );

  const retryPendingOperations = useCallback(async () => {
    if (!canEdit) {
      return;
    }

    const operations = readOperations(storageKey).filter(
      (operation) => operation.itemId === itemId
    );

    for (const operation of operations) {
      await sendOperation(operation);
    }
  }, [canEdit, itemId, sendOperation, storageKey]);

  useEffect(() => {
    const retryTimer = window.setTimeout(() => {
      void retryPendingOperations();
    }, 0);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [retryPendingOperations]);

  useEffect(() => {
    function retryWhenReady() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }

      void retryPendingOperations();
    }

    window.addEventListener("online", retryWhenReady);
    window.addEventListener("focus", retryWhenReady);
    document.addEventListener("visibilitychange", retryWhenReady);

    return () => {
      window.removeEventListener("online", retryWhenReady);
      window.removeEventListener("focus", retryWhenReady);
      document.removeEventListener("visibilitychange", retryWhenReady);
    };
  }, [retryPendingOperations]);

  async function updateField(field: GroceryProgressField, value: boolean) {
    if (!canEdit) {
      return;
    }

    const operation: GroceryProgressOperation = {
      field,
      itemId,
      updatedAt: getCurrentTimestamp(),
      value
    };

    setStatusMessage(null);
    writeOperations(storageKey, mergeGroceryProgressOperations([
      ...readOperations(storageKey),
      operation
    ]));

    await sendOperation(operation);
  }

  const checkedPending = pendingFields.includes("checked");
  const alreadyHavePending = pendingFields.includes("alreadyHave");

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`min-h-12 w-full rounded-md border px-4 py-3 text-left text-sm font-medium transition ${
            state.checked
              ? "border-border bg-muted text-muted-foreground"
              : "border-primary bg-primary text-primary-foreground"
          }`}
          disabled={!canEdit}
          onClick={() => updateField("checked", !state.checked)}
          type="button"
        >
          {state.checked ? "Uncheck" : "Check off"}
          {checkedPending ? (
            <span className="block text-xs font-normal">Pending</span>
          ) : null}
        </button>
        <button
          className={`min-h-12 w-full rounded-md border px-4 py-3 text-left text-sm font-medium transition hover:bg-muted ${
            state.alreadyHave
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-border bg-card"
          }`}
          disabled={!canEdit}
          onClick={() => updateField("alreadyHave", !state.alreadyHave)}
          type="button"
        >
          {state.alreadyHave ? "Need to buy" : "Already have"}
          {alreadyHavePending ? (
            <span className="block text-xs font-normal">Pending</span>
          ) : null}
        </button>
      </div>

      {statusMessage ? (
        <p className="text-xs text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
      {pendingText ? (
        <button
          className="min-h-10 rounded-md border border-border px-3 py-2 text-xs font-medium transition hover:bg-muted"
          onClick={retryPendingOperations}
          type="button"
        >
          Retry pending changes
        </button>
      ) : null}
    </div>
  );
}

function readOperations(storageKey: string) {
  return parseGroceryProgressOperations(readRawOperations(storageKey));
}

function writeOperations(
  storageKey: string,
  operations: GroceryProgressOperation[]
) {
  if (typeof window === "undefined") {
    return;
  }

  const mergedOperations = mergeGroceryProgressOperations(operations);

  if (mergedOperations.length === 0) {
    window.localStorage.removeItem(storageKey);
    window.dispatchEvent(new Event("mealboard:grocery-progress"));
    return;
  }

  window.localStorage.setItem(
    storageKey,
    serializeGroceryProgressOperations(mergedOperations)
  );
  window.dispatchEvent(new Event("mealboard:grocery-progress"));
}

function readRawOperations(storageKey: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(storageKey) ?? "";
}

function subscribeToGroceryProgress(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("mealboard:grocery-progress", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("mealboard:grocery-progress", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getCurrentTimestamp() {
  return Date.now();
}
