import type { GeneratedGroceryItem } from "./generate-grocery-list";

export type ProtectedGroceryListItem = {
  displayName: string;
  foodId: string | null;
  id: string;
  manualItem: boolean;
  preferredQuantityText: string | null;
  quantity: number | null;
  unit: string | null;
};

export type PendingGroceryChangeItem = {
  displayName: string;
  foodId: string | null;
  preferredQuantityText: string | null;
  quantity: number | null;
  unit: string | null;
};

export type PendingGroceryChanges = {
  added: PendingGroceryChangeItem[];
  addedCount: number;
  hasChanges: boolean;
  kept: PendingGroceryChangeItem[];
  keptCount: number;
  manualItemCount: number;
  removed: PendingGroceryChangeItem[];
  removedCount: number;
};

export type PendingGroceryChangeApplyState = {
  canApply: boolean;
  label: string;
};

export type PendingGroceryApplication = {
  added: Array<{
    generatedIndex: number;
    item: GeneratedGroceryItem;
  }>;
  kept: Array<{
    currentItemId: string;
    generatedIndex: number;
    item: GeneratedGroceryItem;
  }>;
  manualItemIds: string[];
  removed: Array<{
    currentItemId: string;
    item: PendingGroceryChangeItem;
  }>;
};

export function buildPendingGroceryChanges({
  currentItems,
  generatedItems
}: {
  currentItems: ProtectedGroceryListItem[];
  generatedItems: GeneratedGroceryItem[];
}): PendingGroceryChanges {
  const automaticCurrentItems = currentItems.filter((item) => !item.manualItem);
  const currentByKey = groupItemsByDiffKey(automaticCurrentItems.map(toChangeItem));
  const generatedByKey = groupItemsByDiffKey(generatedItems.map(toChangeItem));
  const added: PendingGroceryChangeItem[] = [];
  const kept: PendingGroceryChangeItem[] = [];
  const removed: PendingGroceryChangeItem[] = [];
  const allKeys = Array.from(
    new Set([...currentByKey.keys(), ...generatedByKey.keys()])
  ).sort();

  for (const key of allKeys) {
    const currentCount = currentByKey.get(key)?.length ?? 0;
    const generatedCount = generatedByKey.get(key)?.length ?? 0;
    const keptCount = Math.min(currentCount, generatedCount);
    const currentItemsForKey = currentByKey.get(key) ?? [];
    const generatedItemsForKey = generatedByKey.get(key) ?? [];

    kept.push(...currentItemsForKey.slice(0, keptCount));
    removed.push(...currentItemsForKey.slice(keptCount));
    added.push(...generatedItemsForKey.slice(keptCount));
  }

  return {
    added,
    addedCount: added.length,
    hasChanges: added.length > 0 || removed.length > 0,
    kept,
    keptCount: kept.length,
    manualItemCount: currentItems.length - automaticCurrentItems.length,
    removed,
    removedCount: removed.length
  };
}

export function buildPendingGroceryChangeApplication({
  currentItems,
  generatedItems
}: {
  currentItems: ProtectedGroceryListItem[];
  generatedItems: GeneratedGroceryItem[];
}): PendingGroceryApplication {
  const automaticCurrentItems = currentItems.filter((item) => !item.manualItem);
  const currentByKey = groupApplicationCurrentItemsByDiffKey(
    automaticCurrentItems
  );
  const generatedByKey = groupApplicationGeneratedItemsByDiffKey(generatedItems);
  const added: PendingGroceryApplication["added"] = [];
  const kept: PendingGroceryApplication["kept"] = [];
  const removed: PendingGroceryApplication["removed"] = [];
  const allKeys = Array.from(
    new Set([...currentByKey.keys(), ...generatedByKey.keys()])
  ).sort();

  for (const key of allKeys) {
    const currentItemsForKey = currentByKey.get(key) ?? [];
    const generatedItemsForKey = generatedByKey.get(key) ?? [];
    const keptCount = Math.min(
      currentItemsForKey.length,
      generatedItemsForKey.length
    );

    kept.push(
      ...currentItemsForKey.slice(0, keptCount).map((currentItem, index) => ({
        currentItemId: currentItem.id,
        generatedIndex: generatedItemsForKey[index]?.generatedIndex ?? 0,
        item: generatedItemsForKey[index]?.item ?? generatedItems[0]
      }))
    );
    removed.push(
      ...currentItemsForKey.slice(keptCount).map((currentItem) => ({
        currentItemId: currentItem.id,
        item: toChangeItem(currentItem)
      }))
    );
    added.push(...generatedItemsForKey.slice(keptCount));
  }

  return {
    added,
    kept,
    manualItemIds: currentItems
      .filter((item) => item.manualItem)
      .map((item) => item.id),
    removed
  };
}

export function getPendingGroceryChangeApplyState(
  changes: PendingGroceryChanges
): PendingGroceryChangeApplyState {
  if (!changes.hasChanges) {
    return {
      canApply: false,
      label: "No grocery updates to apply"
    };
  }

  return {
    canApply: true,
    label: "Apply reviewed grocery updates"
  };
}

function groupApplicationCurrentItemsByDiffKey(
  items: ProtectedGroceryListItem[]
) {
  const grouped = new Map<string, ProtectedGroceryListItem[]>();

  for (const item of items) {
    const key = getDiffKey(toChangeItem(item));
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return grouped;
}

function groupApplicationGeneratedItemsByDiffKey(items: GeneratedGroceryItem[]) {
  const grouped = new Map<
    string,
    Array<{ generatedIndex: number; item: GeneratedGroceryItem }>
  >();

  items.forEach((item, generatedIndex) => {
    const key = getDiffKey(toChangeItem(item));
    grouped.set(key, [
      ...(grouped.get(key) ?? []),
      {
        generatedIndex,
        item
      }
    ]);
  });

  return grouped;
}

function groupItemsByDiffKey(items: PendingGroceryChangeItem[]) {
  const grouped = new Map<string, PendingGroceryChangeItem[]>();

  for (const item of items) {
    const key = getDiffKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return grouped;
}

function getDiffKey(item: PendingGroceryChangeItem) {
  const identity = item.foodId
    ? `food:${item.foodId}`
    : `name:${normalizeDisplayName(item.displayName)}`;

  return [
    identity,
    item.quantity === null ? "qty:null" : `qty:${item.quantity}`,
    `unit:${normalizeNullableText(item.unit)}`,
    `preferred:${normalizeNullableText(item.preferredQuantityText)}`
  ].join("|");
}

function toChangeItem(
  item: GeneratedGroceryItem | ProtectedGroceryListItem
): PendingGroceryChangeItem {
  return {
    displayName: item.displayName.trim(),
    foodId: item.foodId,
    preferredQuantityText: item.preferredQuantityText,
    quantity: item.quantity,
    unit: item.unit
  };
}

function normalizeDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeNullableText(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}
