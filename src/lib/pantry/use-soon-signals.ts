import {
  classifyExpirationDate,
  defaultExpiringSoonDays,
  getEffectiveStockStatus
} from "./domain";
import type { PantryItem } from "./types";

export type PantryUseSoonUrgency = "expired" | "today" | "soon";

export type PantryUseSoonSignal = {
  daysUntilExpiration: number;
  expirationStatus: "expired" | "today" | "expiring_soon";
  foodId: string;
  foodName: string;
  groceryCategoryId: string | null;
  groceryCategoryName: string | null;
  itemDisplayNames: string[];
  lotCount: number;
  mealProfileContexts: Array<{
    mealProfileId: string | null;
    mealProfileName: string | null;
  }>;
  pantryItemIds: string[];
  reasonLabels: string[];
  urgency: PantryUseSoonUrgency;
  useByDate: string;
};

export function derivePantryUseSoonSignals({
  expiringSoonDays = defaultExpiringSoonDays,
  pantryItems,
  today
}: {
  expiringSoonDays?: number;
  pantryItems: PantryItem[];
  today: string;
}): PantryUseSoonSignal[] {
  const groupedSignals = new Map<string, PantryUseSoonSignal>();

  for (const item of pantryItems) {
    const signal = derivePantryUseSoonSignalForItem({
      expiringSoonDays,
      item,
      today
    });

    if (!signal) {
      continue;
    }

    const existing = groupedSignals.get(signal.foodId);

    if (!existing) {
      groupedSignals.set(signal.foodId, signal);
      continue;
    }

    groupedSignals.set(signal.foodId, mergeSignals(existing, signal));
  }

  return Array.from(groupedSignals.values()).sort(comparePantryUseSoonSignals);
}

function derivePantryUseSoonSignalForItem({
  expiringSoonDays,
  item,
  today
}: {
  expiringSoonDays: number;
  item: PantryItem;
  today: string;
}): PantryUseSoonSignal | null {
  if (item.discardedAt !== null || !item.expirationDate) {
    return null;
  }

  if (item.quantity !== null && item.quantity <= 0) {
    return null;
  }

  const stockStatus = getEffectiveStockStatus(item);

  if (stockStatus === "out" || stockStatus === "unknown") {
    return null;
  }

  const expirationStatus = classifyExpirationDate({
    expirationDate: item.expirationDate,
    expiringSoonDays,
    today
  });

  if (expirationStatus === "missing" || expirationStatus === "not_expiring") {
    return null;
  }

  const urgency = mapUrgency(expirationStatus);

  return {
    daysUntilExpiration: getDaysUntilExpiration(item.expirationDate, today),
    expirationStatus,
    foodId: item.foodId,
    foodName: item.foodName,
    groceryCategoryId: item.groceryCategoryId,
    groceryCategoryName: item.groceryCategoryName,
    itemDisplayNames: [item.displayName],
    lotCount: 1,
    mealProfileContexts: [
      {
        mealProfileId: item.mealProfileId,
        mealProfileName: item.mealProfileName
      }
    ],
    pantryItemIds: [item.id],
    reasonLabels: [formatUrgencyReason(urgency)],
    urgency,
    useByDate: item.expirationDate
  };
}

function mergeSignals(
  existing: PantryUseSoonSignal,
  incoming: PantryUseSoonSignal
): PantryUseSoonSignal {
  const earliest =
    comparePantryUseSoonSignals(existing, incoming) <= 0 ? existing : incoming;

  return {
    daysUntilExpiration: earliest.daysUntilExpiration,
    expirationStatus: earliest.expirationStatus,
    foodId: earliest.foodId,
    foodName: earliest.foodName,
    groceryCategoryId: earliest.groceryCategoryId,
    groceryCategoryName: earliest.groceryCategoryName,
    itemDisplayNames: uniqueSorted([
      ...existing.itemDisplayNames,
      ...incoming.itemDisplayNames
    ]),
    lotCount: existing.lotCount + incoming.lotCount,
    mealProfileContexts: mergeMealProfileContexts(
      existing.mealProfileContexts,
      incoming.mealProfileContexts
    ),
    pantryItemIds: uniqueSorted([
      ...existing.pantryItemIds,
      ...incoming.pantryItemIds
    ]),
    reasonLabels: uniqueReasonLabels([
      ...existing.reasonLabels,
      ...incoming.reasonLabels
    ]),
    urgency: earliest.urgency,
    useByDate: earliest.useByDate
  };
}

function comparePantryUseSoonSignals(
  first: PantryUseSoonSignal,
  second: PantryUseSoonSignal
) {
  return (
    urgencyRank[first.urgency] - urgencyRank[second.urgency] ||
    first.daysUntilExpiration - second.daysUntilExpiration ||
    first.foodName.localeCompare(second.foodName) ||
    first.foodId.localeCompare(second.foodId)
  );
}

function mapUrgency(
  expirationStatus: "expired" | "today" | "expiring_soon"
): PantryUseSoonUrgency {
  if (expirationStatus === "expiring_soon") {
    return "soon";
  }

  return expirationStatus;
}

function formatUrgencyReason(urgency: PantryUseSoonUrgency) {
  if (urgency === "expired") {
    return "Past use-by date";
  }

  if (urgency === "today") {
    return "Use today";
  }

  return "Use soon";
}

function getDaysUntilExpiration(expirationDate: string, today: string) {
  return dateToUtcDay(expirationDate) - dateToUtcDay(today);
}

function dateToUtcDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((first, second) =>
    first.localeCompare(second)
  );
}

function uniqueReasonLabels(values: string[]) {
  return Array.from(new Set(values)).sort(
    (first, second) =>
      (reasonLabelRank[first] ?? Number.MAX_SAFE_INTEGER) -
        (reasonLabelRank[second] ?? Number.MAX_SAFE_INTEGER) ||
      first.localeCompare(second)
  );
}

function mergeMealProfileContexts(
  first: PantryUseSoonSignal["mealProfileContexts"],
  second: PantryUseSoonSignal["mealProfileContexts"]
) {
  const contexts = new Map<
    string,
    PantryUseSoonSignal["mealProfileContexts"][number]
  >();

  for (const context of [...first, ...second]) {
    contexts.set(context.mealProfileId ?? "household", context);
  }

  return Array.from(contexts.values()).sort((a, b) =>
    (a.mealProfileName ?? "Household").localeCompare(
      b.mealProfileName ?? "Household"
    )
  );
}

const urgencyRank: Record<PantryUseSoonUrgency, number> = {
  expired: 0,
  today: 1,
  soon: 2
};

const reasonLabelRank: Record<string, number> = {
  "Past use-by date": 0,
  "Use today": 1,
  "Use soon": 2
};
