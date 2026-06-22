import type { GeneratedGroceryItem } from "./generate-grocery-list";

export type ProtectedGroceryListItem = {
  displayName: string;
  foodId: string | null;
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
