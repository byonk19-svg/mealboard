import type { ParsedIngredientLine } from "@/lib/recipes/parse-ingredient-lines";
import type { Food } from "@/lib/settings/types";

export type IngredientReviewRow = {
  display_name: string;
  food_id: string | null;
  new_food_name?: string | null;
  quantity: number | null;
  unit: string | null;
  grocery_category_id: string | null;
  preparation: string | null;
  notes: string | null;
  optional: boolean;
  needsReview?: boolean;
  reviewReason?: string | null;
};

export type FoodMatch = {
  foodId: string | null;
  groceryCategoryId: string | null;
};

export function createBlankIngredientReviewRow(): IngredientReviewRow {
  return {
    display_name: "",
    food_id: null,
    quantity: null,
    unit: null,
    grocery_category_id: null,
    preparation: null,
    notes: null,
    optional: false,
    needsReview: false,
    reviewReason: null
  };
}

export function buildIngredientReviewRows({
  foods,
  parsedIngredients
}: {
  foods: Food[];
  parsedIngredients: ParsedIngredientLine[];
}): IngredientReviewRow[] {
  return parsedIngredients.map((ingredient) => {
    const foodMatch = resolveFoodMatch(foods, ingredient.displayName);

    return {
      display_name: ingredient.displayName,
      food_id: foodMatch.foodId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      grocery_category_id: foodMatch.groceryCategoryId,
      preparation: ingredient.preparation,
      notes: ingredient.notes,
      optional: false,
      needsReview: ingredient.needsReview,
      reviewReason: ingredient.reviewReason
    };
  });
}

export function resolveFoodMatch(
  foods: Food[],
  displayName: string
): FoodMatch {
  const strictDisplayName = normalizeNameStrict(displayName);
  const fallbackDisplayName = normalizeNameForFallback(displayName);
  const fallbackCompactDisplayName = compactName(fallbackDisplayName);

  if (!strictDisplayName) {
    return { foodId: null, groceryCategoryId: null };
  }

  const exactMatch = foods.find(
    (food) => normalizeNameStrict(food.name) === strictDisplayName
  );
  const strictContainedMatch =
    exactMatch ??
    foods.find((food) =>
      containsNameTokens(strictDisplayName, normalizeNameStrict(food.name))
    );
  const compactMatch =
    strictContainedMatch ??
    foods.find(
      (food) =>
        compactName(normalizeNameForFallback(food.name)) ===
        fallbackCompactDisplayName
    );
  const containedMatch =
    compactMatch ??
    foods.find((food) => {
      const normalizedFoodName = normalizeNameForFallback(food.name);

      return containsNameTokens(fallbackDisplayName, normalizedFoodName);
    });
  const match = containedMatch ?? null;

  return {
    foodId: match?.id ?? null,
    groceryCategoryId: match?.default_grocery_category_id ?? null
  };
}

export function resolveFoodSelection(
  foods: Food[],
  foodId: string | null
): FoodMatch {
  if (!foodId) {
    return { foodId: null, groceryCategoryId: null };
  }

  const match = foods.find((food) => food.id === foodId) ?? null;

  return {
    foodId: match?.id ?? null,
    groceryCategoryId: match?.default_grocery_category_id ?? null
  };
}

export function updateIngredientDisplayName(
  row: IngredientReviewRow,
  displayName: string,
  foods: Food[]
): IngredientReviewRow {
  const previousAutoMatch = resolveFoodMatch(foods, row.display_name);
  const nextAutoMatch = resolveFoodMatch(foods, displayName);
  const canReplaceFood =
    row.food_id === null || row.food_id === previousAutoMatch.foodId;
  const canReplaceCategory =
    row.grocery_category_id === null ||
    row.grocery_category_id === previousAutoMatch.groceryCategoryId;

  return {
    ...row,
    display_name: displayName,
    food_id: canReplaceFood ? nextAutoMatch.foodId : row.food_id,
    grocery_category_id: canReplaceCategory
      ? nextAutoMatch.groceryCategoryId
      : row.grocery_category_id
  };
}

export function updateIngredientFoodSelection(
  row: IngredientReviewRow,
  foodId: string | null,
  foods: Food[]
): IngredientReviewRow {
  const previousSelection = resolveFoodSelection(foods, row.food_id);
  const nextSelection = resolveFoodSelection(foods, foodId);
  const canReplaceCategory =
    row.grocery_category_id === null ||
    row.grocery_category_id === previousSelection.groceryCategoryId;

  return {
    ...row,
    food_id: nextSelection.foodId,
    grocery_category_id: canReplaceCategory
      ? nextSelection.groceryCategoryId
      : row.grocery_category_id
  };
}

export function splitIngredientReviewRow(row: IngredientReviewRow) {
  return [
    row,
    {
      ...createBlankIngredientReviewRow(),
      needsReview: true,
      reviewReason: "Split row; fill in the new ingredient."
    }
  ];
}

export function mergeIngredientReviewRows(
  first: IngredientReviewRow,
  second: IngredientReviewRow
): IngredientReviewRow {
  return {
    display_name:
      joinText([first.display_name, second.display_name], " + ") ?? "",
    food_id: first.food_id === second.food_id ? first.food_id : null,
    quantity:
      first.quantity === second.quantity && first.unit === second.unit
        ? first.quantity
        : null,
    unit: first.unit === second.unit ? first.unit : null,
    grocery_category_id:
      first.grocery_category_id === second.grocery_category_id
        ? first.grocery_category_id
        : null,
    preparation: joinText([first.preparation, second.preparation], "; "),
    notes: joinText([first.notes, second.notes], "; "),
    optional: first.optional || second.optional,
    needsReview: true,
    reviewReason: "Merged row; review quantity, unit, and food match."
  };
}

function joinText(values: Array<string | null>, separator: string) {
  const joined = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(separator);

  return joined.length > 0 ? joined : null;
}

const ingredientMatchStopWords = new Set([
  "fresh",
  "organic",
  "raw",
  "washed"
]);

function normalizeNameStrict(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeNameForFallback(value: string) {
  return normalizeNameStrict(value)
    .split(" ")
    .filter((token) => token && !ingredientMatchStopWords.has(token))
    .join(" ");
}

function compactName(value: string) {
  return value.replace(/\s+/g, "");
}

function containsNameTokens(displayName: string, foodName: string) {
  const displayTokens = displayName.split(" ").filter(Boolean);
  const foodTokens = foodName.split(" ").filter(Boolean);

  if (foodTokens.length === 0 || foodTokens.length > displayTokens.length) {
    return false;
  }

  return displayTokens.some((_, index) =>
    foodTokens.every(
      (foodToken, foodIndex) => displayTokens[index + foodIndex] === foodToken
    )
  );
}
