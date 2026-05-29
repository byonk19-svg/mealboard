export type GroceryItemSource = {
  groceryCategoryId?: string | null;
  ingredientId?: string;
  label: string;
  mealProfileId?: string | null;
  mealProfileName?: string | null;
  mealType?: string;
  notes?: string | null;
  planDate?: string;
  quantity?: number | null;
  recipeId?: string | null;
  recipeName?: string | null;
  sourceId: string;
  sourceType: string;
  unit?: string | null;
  weeklyPlanItemId?: string;
};

export type GroceryItemInput = {
  displayName: string;
  foodId?: string | null;
  preferredQuantityText?: string | null;
  quantity: number | null;
  sources: GroceryItemSource[];
  unit: string | null;
};

export type ConsolidatedGroceryItem = {
  displayName: string;
  foodId: string | null;
  preferredQuantityText: string | null;
  quantity: number | null;
  needsReview: boolean;
  reviewReason: string | null;
  sources: GroceryItemSource[];
  unit: string | null;
};

type ReviewReason =
  | "Incompatible units need review."
  | "Quantity or unit is missing.";

type UnitFamily = "volume" | "weight" | "count" | "other";

type PreparedItem = ConsolidatedGroceryItem & {
  groupKey: string;
  originalIndex: number;
  unitFamily: UnitFamily;
};

const unitAliases: Record<string, string> = {
  c: "cup",
  cups: "cup",
  cup: "cup",
  lb: "lb",
  lbs: "lb",
  ounce: "oz",
  ounces: "oz",
  oz: "oz",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbsp: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tsp: "tsp"
};

const volumeToTeaspoons: Record<string, number> = {
  cup: 48,
  tbsp: 3,
  tsp: 1
};

const weightToOunces: Record<string, number> = {
  lb: 16,
  oz: 1
};

export function consolidateGroceryItems(
  items: GroceryItemInput[]
): ConsolidatedGroceryItem[] {
  const preparedItems = items.map(prepareItem);
  const groups = groupItems(preparedItems);
  const consolidated: ConsolidatedGroceryItem[] = [];

  for (const group of groups.values()) {
    consolidated.push(...consolidateGroup(group));
  }

  return consolidated;
}

function prepareItem(
  item: GroceryItemInput,
  originalIndex: number
): PreparedItem {
  const unit = normalizeUnit(item.unit);
  const displayName = normalizeDisplayName(item.displayName);
  const foodId = item.foodId ?? null;
  const needsReview = item.quantity === null || unit === null;
  const reviewReason: ReviewReason | null = needsReview
    ? "Quantity or unit is missing."
    : null;

  return {
    displayName,
    foodId,
    groupKey: foodId ? `food:${foodId}` : `name:${normalizeKey(displayName)}`,
    needsReview,
    originalIndex,
    preferredQuantityText: item.preferredQuantityText ?? null,
    quantity: item.quantity,
    reviewReason,
    sources: [...item.sources],
    unit,
    unitFamily: getUnitFamily(unit)
  };
}

function groupItems(items: PreparedItem[]) {
  const groups = new Map<string, PreparedItem[]>();

  for (const item of items) {
    const group = groups.get(item.groupKey) ?? [];
    group.push(item);
    groups.set(item.groupKey, group);
  }

  return groups;
}

function consolidateGroup(group: PreparedItem[]): ConsolidatedGroceryItem[] {
  if (group.length === 1) {
    return [stripPreparedFields(group[0])];
  }

  if (group.some((item) => item.needsReview)) {
    return group.map((item) =>
      stripPreparedFields({
        ...item,
        needsReview: true,
        reviewReason: item.reviewReason ?? "Quantity or unit is missing."
      })
    );
  }

  const unitFamilies = new Set(group.map((item) => item.unitFamily));
  const units = new Set(group.map((item) => item.unit));

  if (units.size === 1) {
    return [
      {
        displayName: firstDisplayName(group),
        foodId: group[0]?.foodId ?? null,
        needsReview: false,
        preferredQuantityText: getPreferredQuantityText(group),
        quantity: roundQuantity(
          group.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
        ),
        reviewReason: null,
        sources: group.flatMap((item) => item.sources),
        unit: group[0]?.unit ?? null
      }
    ];
  }

  if (unitFamilies.size !== 1 || unitFamilies.has("other")) {
    return flagGroupForReview(group, "Incompatible units need review.");
  }

  const [firstItem] = group;

  if (!firstItem) {
    return [];
  }

  const targetUnit = chooseTargetUnit(group);
  const quantity = sumConvertedQuantity(group, targetUnit);

  if (quantity === null) {
    return flagGroupForReview(group, "Incompatible units need review.");
  }

  return [
    {
      displayName: firstItem.displayName,
      foodId: firstItem.foodId,
      needsReview: false,
      preferredQuantityText: getPreferredQuantityText(group),
      quantity,
      reviewReason: null,
      sources: group.flatMap((item) => item.sources),
      unit: targetUnit
    }
  ];
}

function flagGroupForReview(
  group: PreparedItem[],
  reviewReason: ReviewReason
) {
  return group.map((item) =>
    stripPreparedFields({
      ...item,
      needsReview: true,
      reviewReason
    })
  );
}

function chooseTargetUnit(group: PreparedItem[]) {
  const units = group.map((item) => item.unit).filter((unit) => unit !== null);

  if (units.includes("lb")) {
    return "lb";
  }

  if (units.includes("cup")) {
    return "cup";
  }

  if (units.includes("tbsp")) {
    return "tbsp";
  }

  return units[0] ?? null;
}

function sumConvertedQuantity(group: PreparedItem[], targetUnit: string | null) {
  if (!targetUnit) {
    return null;
  }

  let total = 0;

  for (const item of group) {
    if (item.quantity === null || item.unit === null) {
      return null;
    }

    const converted = convertQuantity(item.quantity, item.unit, targetUnit);

    if (converted === null) {
      return null;
    }

    total += converted;
  }

  return roundQuantity(total);
}

function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string
) {
  if (fromUnit === toUnit) {
    return quantity;
  }

  if (fromUnit in volumeToTeaspoons && toUnit in volumeToTeaspoons) {
    return (quantity * volumeToTeaspoons[fromUnit]) / volumeToTeaspoons[toUnit];
  }

  if (fromUnit in weightToOunces && toUnit in weightToOunces) {
    return (quantity * weightToOunces[fromUnit]) / weightToOunces[toUnit];
  }

  return null;
}

function getPreferredQuantityText(group: PreparedItem[]) {
  return (
    group.find((item) => item.preferredQuantityText)?.preferredQuantityText ??
    null
  );
}

function normalizeUnit(unit: string | null) {
  const normalized = unit?.trim().toLowerCase().replace(/[.]/g, "") ?? "";

  if (!normalized) {
    return null;
  }

  return unitAliases[normalized] ?? normalized;
}

function getUnitFamily(unit: string | null): UnitFamily {
  if (!unit) {
    return "other";
  }

  if (unit in volumeToTeaspoons) {
    return "volume";
  }

  if (unit in weightToOunces) {
    return "weight";
  }

  if (unit === "count") {
    return "count";
  }

  return "other";
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripPreparedFields(item: PreparedItem): ConsolidatedGroceryItem {
  return {
    displayName: item.displayName,
    foodId: item.foodId,
    needsReview: item.needsReview,
    preferredQuantityText: item.preferredQuantityText,
    quantity: item.quantity,
    reviewReason: item.reviewReason,
    sources: item.sources,
    unit: item.unit
  };
}

function firstDisplayName(group: PreparedItem[]) {
  return group[0]?.displayName ?? "";
}

function roundQuantity(quantity: number) {
  return Number(quantity.toFixed(4));
}
