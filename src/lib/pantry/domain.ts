import type {
  NormalizedPantryItemInput,
  PantryCategoryGroup,
  PantryEventType,
  PantryExpirationStatus,
  PantryItem,
  PantryItemInput,
  PantryItemRollup,
  PantryItemView,
  PantryStockStatus
} from "./types";

export const pantryStockStatuses = [
  "in_stock",
  "low",
  "out",
  "unknown"
] as const satisfies readonly PantryStockStatus[];

export const defaultExpiringSoonDays = 7;
export const defaultHouseholdTimeZone = "America/Chicago";

export function normalizePantryItemInput(
  input: PantryItemInput
): NormalizedPantryItemInput {
  const foodId = normalizeText(input.foodId);

  if (!foodId) {
    throw new Error("Choose a household item.");
  }

  const displayName = normalizeText(input.displayName);

  if (!displayName) {
    throw new Error("Enter a pantry item name.");
  }

  if (!isPantryStockStatus(input.stockStatus)) {
    throw new Error("Choose a pantry stock status.");
  }

  const quantity = normalizeQuantity(input.quantity, "Quantity");
  const unit = normalizeText(input.unit);
  const thresholdQuantity = normalizeQuantity(
    input.lowStockThresholdQuantity,
    "Low-stock threshold"
  );
  const thresholdUnit = normalizeText(input.lowStockThresholdUnit);
  const isOpen = Boolean(input.isOpen);
  const openedAt = normalizeDateTime(input.openedAt, "Opened date");

  if ((thresholdQuantity === null) !== (thresholdUnit === null)) {
    throw new Error("Enter both low-stock threshold quantity and unit.");
  }

  if (!isOpen && openedAt) {
    throw new Error("Only open pantry items can have an opened date.");
  }

  return {
    displayName,
    expirationDate: normalizeDate(input.expirationDate, "Expiration date"),
    foodId,
    groceryCategoryId: normalizeText(input.groceryCategoryId),
    isOpen,
    lowStockThresholdQuantity: thresholdQuantity,
    lowStockThresholdUnit: thresholdUnit,
    mealProfileId: normalizeText(input.mealProfileId),
    notes: normalizeText(input.notes),
    openedAt,
    packageDetail: normalizeText(input.packageDetail),
    quantity,
    quantityNote: normalizeText(input.quantityNote),
    stockStatus: input.stockStatus,
    storageLocation: normalizeText(input.storageLocation),
    unit
  };
}

export function getEffectiveStockStatus(
  item: Pick<
    PantryItem,
    | "lowStockThresholdQuantity"
    | "lowStockThresholdUnit"
    | "quantity"
    | "stockStatus"
    | "unit"
  >
): PantryStockStatus {
  if (item.stockStatus !== "in_stock") {
    return item.stockStatus;
  }

  if (
    item.quantity === null ||
    item.lowStockThresholdQuantity === null ||
    !unitsMatch(item.unit, item.lowStockThresholdUnit)
  ) {
    return item.stockStatus;
  }

  return item.quantity <= item.lowStockThresholdQuantity ? "low" : "in_stock";
}

export function classifyExpirationDate({
  expirationDate,
  expiringSoonDays = defaultExpiringSoonDays,
  today
}: {
  expirationDate: string | null;
  expiringSoonDays?: number;
  today: string;
}): PantryExpirationStatus {
  if (!expirationDate) {
    return "missing";
  }

  const daysUntilExpiration =
    dateToUtcDay(expirationDate) - dateToUtcDay(today);

  if (daysUntilExpiration < 0) {
    return "expired";
  }

  if (daysUntilExpiration === 0) {
    return "today";
  }

  return daysUntilExpiration <= expiringSoonDays
    ? "expiring_soon"
    : "not_expiring";
}

export function getHouseholdDateString({
  date = new Date(),
  timeZone = defaultHouseholdTimeZone
}: {
  date?: Date;
  timeZone?: string;
} = {}) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Household date could not be resolved.");
  }

  return `${year}-${month}-${day}`;
}

export function searchPantryItems(items: PantryItem[], query: string) {
  const normalizedQuery = normalizeText(query)?.toLocaleLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [
      item.displayName,
      item.foodName,
      item.packageDetail,
      item.notes,
      item.groceryCategoryName,
      item.storageLocation
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
  );
}

export function buildPantryCategoryGroups({
  items,
  today
}: {
  items: PantryItem[];
  today: string;
}): PantryCategoryGroup[] {
  const activeItems = items
    .filter((item) => item.discardedAt === null)
    .map<PantryItemView>((item) => ({
      ...item,
      effectiveExpirationStatus: classifyExpirationDate({
        expirationDate: item.expirationDate,
        today
      }),
      effectiveStockStatus: getEffectiveStockStatus(item)
    }));
  const groups = new Map<string, PantryItemView[]>();

  for (const item of activeItems) {
    groups.set(item.groceryCategoryId ?? "uncategorized", [
      ...(groups.get(item.groceryCategoryId ?? "uncategorized") ?? []),
      item
    ]);
  }

  return Array.from(groups.entries())
    .map(([categoryId, groupItems]) => {
      const firstItem = groupItems[0];
      const normalizedCategoryId =
        categoryId === "uncategorized" ? null : categoryId;

      return {
        categoryId: normalizedCategoryId,
        categoryName: firstItem?.groceryCategoryName ?? "Uncategorized",
        rollups: buildPantryRollups(groupItems),
        sortOrder: firstItem?.groceryCategorySortOrder ?? Number.MAX_SAFE_INTEGER
      };
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.categoryName.localeCompare(b.categoryName);
    });
}

export function buildPantryEventTypes({
  after,
  before
}: {
  after: PantryItem;
  before: PantryItem | null;
}): PantryEventType[] {
  if (!before) {
    return ["created"];
  }

  const eventTypes: PantryEventType[] = [];

  if (!before.discardedAt && after.discardedAt) {
    eventTypes.push("discarded");
  }

  if (before.stockStatus !== after.stockStatus) {
    eventTypes.push("status_changed");
  }

  if (before.expirationDate !== after.expirationDate) {
    eventTypes.push("expiration_changed");
  }

  if (before.groceryCategoryId !== after.groceryCategoryId) {
    eventTypes.push("category_changed");
  }

  if (before.storageLocation !== after.storageLocation) {
    eventTypes.push("storage_changed");
  }

  if (before.notes !== after.notes) {
    eventTypes.push("notes_changed");
  }

  if (hasAdjustmentChange(before, after)) {
    eventTypes.push("adjusted");
  }

  return Array.from(new Set(eventTypes));
}

function buildPantryRollups(items: PantryItemView[]): PantryItemRollup[] {
  const rollups = new Map<string, PantryItemView[]>();

  for (const item of items) {
    rollups.set(item.foodId, [...(rollups.get(item.foodId) ?? []), item]);
  }

  return Array.from(rollups.entries())
    .map(([, rollupItems]) => {
      const firstItem = rollupItems[0];

      return {
        categoryName: firstItem?.groceryCategoryName ?? null,
        effectiveStockStatus: getRollupStockStatus(rollupItems),
        foodId: firstItem?.foodId ?? "",
        foodName: firstItem?.foodName ?? "Unknown",
        items: rollupItems.sort(comparePantryItems),
        nearestExpirationDate: getNearestExpirationDate(rollupItems)
      };
    })
    .sort((a, b) => a.foodName.localeCompare(b.foodName));
}

function getRollupStockStatus(items: PantryItemView[]): PantryStockStatus {
  const statuses = items.map((item) => item.effectiveStockStatus);

  if (statuses.includes("out")) {
    return "out";
  }

  if (statuses.includes("low")) {
    return "low";
  }

  if (statuses.some((status) => status === "in_stock")) {
    return "in_stock";
  }

  return "unknown";
}

function getNearestExpirationDate(items: PantryItemView[]) {
  return (
    items
      .map((item) => item.expirationDate)
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => dateToUtcDay(a) - dateToUtcDay(b))[0] ?? null
  );
}

function comparePantryItems(a: PantryItemView, b: PantryItemView) {
  if (a.expirationDate && b.expirationDate) {
    return dateToUtcDay(a.expirationDate) - dateToUtcDay(b.expirationDate);
  }

  if (a.expirationDate && !b.expirationDate) {
    return -1;
  }

  if (!a.expirationDate && b.expirationDate) {
    return 1;
  }

  return a.displayName.localeCompare(b.displayName);
}

function hasAdjustmentChange(before: PantryItem, after: PantryItem) {
  return (
    before.displayName !== after.displayName ||
    before.packageDetail !== after.packageDetail ||
    before.quantity !== after.quantity ||
    before.unit !== after.unit ||
    before.quantityNote !== after.quantityNote ||
    before.lowStockThresholdQuantity !== after.lowStockThresholdQuantity ||
    before.lowStockThresholdUnit !== after.lowStockThresholdUnit ||
    before.isOpen !== after.isOpen ||
    before.openedAt !== after.openedAt ||
    before.mealProfileId !== after.mealProfileId
  );
}

function isPantryStockStatus(value: string | null): value is PantryStockStatus {
  return pantryStockStatuses.includes(value as PantryStockStatus);
}

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.length > 0 ? text : null;
}

function normalizeQuantity(value: string | null, label: string) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const quantity = Number(text);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return quantity;
}

function normalizeDate(value: string | null, label: string) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (!isValidDateString(text)) {
    throw new Error(`${label} must be a valid date.`);
  }

  return text;
}

function normalizeDateTime(value: string | null, label: string) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (Number.isNaN(Date.parse(text))) {
    throw new Error(`${label} must be a valid date.`);
  }

  return text;
}

function unitsMatch(first: string | null, second: string | null) {
  if (!first || !second) {
    return false;
  }

  return first.trim().toLocaleLowerCase() === second.trim().toLocaleLowerCase();
}

function dateToUtcDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / 86_400_000;
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 1) - 1 &&
    date.getUTCDate() === day
  );
}
