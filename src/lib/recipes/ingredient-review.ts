import type { ParsedIngredientLine } from "@/lib/recipes/parse-ingredient-lines";
import type { Food } from "@/lib/settings/types";

export type IngredientReviewRow = {
  display_name: string;
  food_id: string | null;
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
  const normalizedDisplayName = normalizeName(displayName);

  if (!normalizedDisplayName) {
    return { foodId: null, groceryCategoryId: null };
  }

  const exactMatch = foods.find(
    (food) => normalizeName(food.name) === normalizedDisplayName
  );
  const containedMatch =
    exactMatch ??
    foods.find((food) => normalizedDisplayName.includes(normalizeName(food.name)));
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

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
