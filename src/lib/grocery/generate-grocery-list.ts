import {
  consolidateGroceryItems,
  type ConsolidatedGroceryItem,
  type GroceryItemInput,
  type GroceryItemSource
} from "./consolidate-grocery-items";

export type GroceryGenerationPlanItem = {
  displayName: string;
  id: string;
  isApproved: boolean;
  babyPlanSlot?: string | null;
  componentType?: string | null;
  foodId?: string | null;
  foodName?: string | null;
  groceryCategoryId?: string | null;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: string;
  planDate: string;
  recipeId: string | null;
  recipeName: string | null;
  scaleFactor: number | null;
};

export type GroceryGenerationRecipeIngredient = {
  displayName: string;
  foodId: string | null;
  groceryCategoryId: string | null;
  id: string;
  preferredQuantityText?: string | null;
  quantity: number | null;
  recipeId: string;
  unit: string | null;
};

export type GroceryGenerationSelectedStaple = {
  defaultQuantity: number | null;
  defaultUnit: string | null;
  displayName: string;
  foodId: string | null;
  groceryCategoryId: string | null;
  id: string;
  mealProfileId: string | null;
  mealProfileName: string | null;
  notes: string | null;
  preferredQuantityText: string | null;
};

export type GeneratedGroceryItem = {
  categoryId: string | null;
  displayName: string;
  foodId: string | null;
  needsReview: boolean;
  preferredQuantityText: string | null;
  quantity: number | null;
  reviewReason: string | null;
  unit: string | null;
};

export type GeneratedGroceryItemSource = {
  groceryItemIndex: number;
  ingredientId: string | null;
  label: string;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: string | null;
  notes: string | null;
  planDate: string | null;
  quantity: number | null;
  recipeId: string | null;
  recipeName: string | null;
  sourceId: string;
  sourceType: "baby_item" | "meal_generated" | "staple";
  unit: string | null;
  weeklyPlanItemId: string | null;
};

export type GeneratedGroceryList = {
  items: GeneratedGroceryItem[];
  sources: GeneratedGroceryItemSource[];
};

type GroceryGenerationSource = GroceryItemSource & {
  ingredientId?: string;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: string | null;
  notes: string | null;
  planDate: string | null;
  quantity: number | null;
  recipeId: string | null;
  recipeName: string | null;
  sourceType: "baby_item" | "meal_generated" | "staple";
  unit: string | null;
  weeklyPlanItemId: string | null;
};

export function generateGroceryList({
  recipeIngredients,
  selectedStaples = [],
  weeklyPlanItems
}: {
  recipeIngredients: GroceryGenerationRecipeIngredient[];
  selectedStaples?: GroceryGenerationSelectedStaple[];
  weeklyPlanItems: GroceryGenerationPlanItem[];
}): GeneratedGroceryList {
  const ingredientsByRecipeId = groupIngredientsByRecipeId(recipeIngredients);
  const recipeInputs = weeklyPlanItems
    .filter((item) => item.isApproved && item.recipeId)
    .flatMap((item) =>
      (ingredientsByRecipeId.get(item.recipeId ?? "") ?? []).map((ingredient) =>
        toRecipeGroceryInput(item, ingredient)
      )
    );
  const babyInputs = weeklyPlanItems
    .filter(
      (item) =>
        item.isApproved &&
        item.componentType === "baby_food" &&
        item.foodId &&
        item.babyPlanSlot
    )
    .map(toBabyFoodGroceryInput);
  const stapleInputs = selectedStaples.map(toStapleGroceryInput);
  const groceryInputs = [...recipeInputs, ...babyInputs, ...stapleInputs];
  const categoryConflictsByItemKey = getCategoryConflictsByItemKey(
    groceryInputs
  );
  const consolidatedItems = consolidateGroceryItems(groceryInputs);
  const items: GeneratedGroceryItem[] = [];
  const sources: GeneratedGroceryItemSource[] = [];

  consolidatedItems.forEach((item, groceryItemIndex) => {
    const categoryResult = resolveCategory(
      item,
      categoryConflictsByItemKey.has(getConsolidatedItemKey(item))
    );
    items.push({
      categoryId: categoryResult.categoryId,
      displayName: item.displayName,
      foodId: item.foodId,
      needsReview: item.needsReview || categoryResult.needsReview,
      preferredQuantityText: item.preferredQuantityText,
      quantity: item.quantity,
      reviewReason: mergeReviewReasons(
        item.reviewReason,
        categoryResult.reviewReason
      ),
      unit: item.unit
    });

    sources.push(
      ...item.sources.map((source) =>
        toGeneratedSource(source as GroceryGenerationSource, groceryItemIndex)
      )
    );
  });

  return { items, sources };
}

function toBabyFoodGroceryInput(item: GroceryGenerationPlanItem): GroceryItemInput {
  return {
    displayName: item.foodName ?? item.displayName,
    foodId: item.foodId ?? null,
    preferredQuantityText: null,
    quantity: null,
    sources: [
      {
        groceryCategoryId: item.groceryCategoryId ?? null,
        ingredientId: undefined,
        label: formatSourceLabel(item),
        mealProfileId: item.mealProfileId,
        mealProfileName: item.mealProfileName,
        mealType: item.mealType,
        notes: item.babyPlanSlot ?? null,
        planDate: item.planDate,
        quantity: null,
        recipeId: null,
        recipeName: null,
        sourceId: item.id,
        sourceType: "baby_item",
        unit: null,
        weeklyPlanItemId: item.id
      }
    ],
    unit: null
  };
}

function groupIngredientsByRecipeId(
  ingredients: GroceryGenerationRecipeIngredient[]
) {
  const grouped = new Map<string, GroceryGenerationRecipeIngredient[]>();

  for (const ingredient of ingredients) {
    const recipeIngredients = grouped.get(ingredient.recipeId) ?? [];
    grouped.set(ingredient.recipeId, [...recipeIngredients, ingredient]);
  }

  return grouped;
}

function toRecipeGroceryInput(
  item: GroceryGenerationPlanItem,
  ingredient: GroceryGenerationRecipeIngredient
): GroceryItemInput {
  const scaleFactor = item.scaleFactor ?? 1;
  const quantity =
    ingredient.quantity === null
      ? null
      : roundQuantity(ingredient.quantity * scaleFactor);

  return {
    displayName: ingredient.displayName,
    foodId: ingredient.foodId,
    preferredQuantityText: ingredient.preferredQuantityText,
    quantity,
    sources: [
      {
        groceryCategoryId: ingredient.groceryCategoryId,
        ingredientId: ingredient.id,
        label: formatSourceLabel(item),
        mealProfileId: item.mealProfileId,
        mealProfileName: item.mealProfileName,
        mealType: item.mealType,
        notes: null,
        planDate: item.planDate,
        quantity,
        recipeId: item.recipeId,
        recipeName: item.recipeName ?? item.displayName,
        sourceId: item.id,
        sourceType: "meal_generated",
        unit: ingredient.unit,
        weeklyPlanItemId: item.id
      }
    ],
    unit: ingredient.unit
  };
}

function toStapleGroceryInput(
  staple: GroceryGenerationSelectedStaple
): GroceryItemInput {
  return {
    displayName: staple.displayName,
    foodId: staple.foodId,
    preferredQuantityText: staple.preferredQuantityText,
    quantity: staple.defaultQuantity,
    sources: [
      {
        groceryCategoryId: staple.groceryCategoryId,
        ingredientId: undefined,
        label: formatStapleSourceLabel(staple),
        mealProfileId: staple.mealProfileId,
        mealProfileName: staple.mealProfileName,
        mealType: undefined,
        notes: staple.notes,
        planDate: undefined,
        quantity: staple.defaultQuantity,
        recipeId: null,
        recipeName: null,
        sourceId: staple.id,
        sourceType: "staple",
        unit: staple.defaultUnit,
        weeklyPlanItemId: undefined
      }
    ],
    unit: staple.defaultUnit
  };
}

function resolveCategory(
  item: ConsolidatedGroceryItem,
  hasRelatedCategoryConflict: boolean
) {
  const categoryIds = Array.from(
    new Set(
      item.sources
        .map((source) => source.groceryCategoryId)
        .filter((categoryId): categoryId is string => Boolean(categoryId))
    )
  );

  if (categoryIds.length === 0) {
    return {
      categoryId: null,
      needsReview: false,
      reviewReason: null
    };
  }

  if (categoryIds.length === 1 && !hasRelatedCategoryConflict) {
    return {
      categoryId: categoryIds[0] ?? null,
      needsReview: false,
      reviewReason: null
    };
  }

  return {
    categoryId: null,
    needsReview: true,
    reviewReason: "Multiple categories need review."
  };
}

function getCategoryConflictsByItemKey(inputs: GroceryItemInput[]) {
  const categoriesByItemKey = new Map<string, Set<string>>();

  for (const input of inputs) {
    const categoryIds = input.sources
      .map((source) => source.groceryCategoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId));

    if (categoryIds.length === 0) {
      continue;
    }

    const itemKey = getGroceryInputItemKey(input);
    const existingCategories = categoriesByItemKey.get(itemKey) ?? new Set();
    categoryIds.forEach((categoryId) => existingCategories.add(categoryId));
    categoriesByItemKey.set(itemKey, existingCategories);
  }

  return new Set(
    Array.from(categoriesByItemKey.entries())
      .filter(([, categoryIds]) => categoryIds.size > 1)
      .map(([itemKey]) => itemKey)
  );
}

function getGroceryInputItemKey(input: GroceryItemInput) {
  return input.foodId
    ? `food:${input.foodId}`
    : `name:${normalizeDisplayName(input.displayName)}`;
}

function getConsolidatedItemKey(item: ConsolidatedGroceryItem) {
  return item.foodId
    ? `food:${item.foodId}`
    : `name:${normalizeDisplayName(item.displayName)}`;
}

function normalizeDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ").toLowerCase();
}

function toGeneratedSource(
  source: GroceryGenerationSource,
  groceryItemIndex: number
): GeneratedGroceryItemSource {
  return {
    groceryItemIndex,
    ingredientId: source.ingredientId ?? null,
    label: source.label,
    mealProfileId: source.mealProfileId,
    mealProfileName: source.mealProfileName,
    mealType: source.mealType ?? null,
    notes: source.notes ?? null,
    planDate: source.planDate ?? null,
    quantity: source.quantity,
    recipeId: source.recipeId,
    recipeName: source.recipeName,
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    unit: source.unit,
    weeklyPlanItemId: source.weeklyPlanItemId ?? null
  };
}

function formatSourceLabel(item: GroceryGenerationPlanItem) {
  const recipeName = item.recipeName ?? item.displayName;
  const profile = item.mealProfileName ?? "Unassigned";

  return `${recipeName} for ${profile} ${item.mealType} on ${item.planDate}`;
}

function formatStapleSourceLabel(staple: GroceryGenerationSelectedStaple) {
  return `Selected staple for ${staple.mealProfileName ?? "Household"}`;
}

function mergeReviewReasons(
  existingReason: string | null,
  additionalReason: string | null
) {
  return [existingReason, additionalReason].filter(Boolean).join(" ") || null;
}

function roundQuantity(quantity: number) {
  return Number(quantity.toFixed(4));
}
