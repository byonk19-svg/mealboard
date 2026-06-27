export type CookingSessionStatus =
  | "active"
  | "paused"
  | "completed"
  | "abandoned";

export type CookingSessionLifecycleAction =
  | "pause"
  | "resume"
  | "complete"
  | "abandon";

export type CookingSessionLifecyclePatch = {
  abandoned_at?: string;
  completed_at?: string;
  paused_at?: string | null;
  status: CookingSessionStatus;
};

export type SnapshotRecipeIngredient = {
  displayName: string;
  foodId: string | null;
  id: string;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | null;
  sortOrder: number;
  unit: string | null;
};

export type SnapshotRecipeStep = {
  id: string;
  instruction: string;
  sectionLabel: string | null;
  sortOrder: number;
};

export type SnapshotRecipe = {
  id: string;
  ingredients: SnapshotRecipeIngredient[];
  name: string;
  servings: number | null;
  steps: SnapshotRecipeStep[];
  updatedAt: string;
};

export type SnapshotPlannedMeal = {
  id: string;
  scaleFactor: number | null;
};

export type CookingSessionSnapshot = {
  ingredients: Array<{
    displayName: string;
    foodId: string | null;
    notes: string | null;
    optional: boolean;
    preparation: string | null;
    quantity: number | null;
    recipeIngredientId: string | null;
    sortOrder: number;
    unit: string | null;
  }>;
  session: {
    currentStepSortOrder: number | null;
    recipeId: string;
    recipeNameSnapshot: string;
    recipeUpdatedAtSnapshot: string;
    scaleFactorSnapshot: number;
    servingsSnapshot: number | null;
    weeklyPlanItemId: string | null;
  };
  steps: Array<{
    instruction: string;
    recipeStepId: string | null;
    sectionLabel: string | null;
    sortOrder: number;
  }>;
};

export function buildCookingSessionSnapshot({
  plannedMeal = null,
  recipe
}: {
  plannedMeal?: SnapshotPlannedMeal | null;
  recipe: SnapshotRecipe;
}): CookingSessionSnapshot {
  if (recipe.steps.length === 0) {
    throw new Error("Review cooking steps before starting Cooking Mode.");
  }

  const scaleFactor = resolveScaleFactor(plannedMeal?.scaleFactor ?? null);
  const orderedIngredients = [...recipe.ingredients].sort(compareSortOrder);
  const orderedSteps = [...recipe.steps].sort(compareSortOrder);

  return {
    ingredients: orderedIngredients.map((ingredient, index) => ({
      displayName: ingredient.displayName,
      foodId: ingredient.foodId,
      notes: ingredient.notes,
      optional: ingredient.optional,
      preparation: ingredient.preparation,
      quantity: scaleNullableNumber(ingredient.quantity, scaleFactor),
      recipeIngredientId: ingredient.id,
      sortOrder: index,
      unit: ingredient.unit
    })),
    session: {
      currentStepSortOrder: orderedSteps.length > 0 ? 0 : null,
      recipeId: recipe.id,
      recipeNameSnapshot: recipe.name,
      recipeUpdatedAtSnapshot: recipe.updatedAt,
      scaleFactorSnapshot: scaleFactor,
      servingsSnapshot: scaleNullableNumber(recipe.servings, scaleFactor),
      weeklyPlanItemId: plannedMeal?.id ?? null
    },
    steps: orderedSteps.map((step, index) => ({
      instruction: step.instruction,
      recipeStepId: step.id,
      sectionLabel: step.sectionLabel,
      sortOrder: index
    }))
  };
}

export function validateCurrentStepSortOrder(
  steps: Array<{ sortOrder: number }>,
  sortOrder: number
) {
  if (!steps.some((step) => step.sortOrder === sortOrder)) {
    throw new Error("That cooking step is no longer available.");
  }

  return sortOrder;
}

export function buildCookingSessionLifecyclePatch(
  currentStatus: CookingSessionStatus,
  action: CookingSessionLifecycleAction,
  timestamp: string
): CookingSessionLifecyclePatch {
  if (currentStatus === "completed") {
    throw new Error("Completed cooking sessions cannot be changed.");
  }

  if (currentStatus === "abandoned") {
    throw new Error("Abandoned cooking sessions cannot be changed.");
  }

  if (action === "pause") {
    if (currentStatus !== "active") {
      throw new Error("Only active cooking sessions can be paused.");
    }

    return {
      paused_at: timestamp,
      status: "paused"
    };
  }

  if (action === "resume") {
    if (currentStatus !== "paused") {
      throw new Error("Only paused cooking sessions can be resumed.");
    }

    return {
      paused_at: null,
      status: "active"
    };
  }

  if (action === "complete") {
    return {
      completed_at: timestamp,
      status: "completed"
    };
  }

  return {
    abandoned_at: timestamp,
    status: "abandoned"
  };
}

export function assertCookingSessionCanBeEdited(
  status: CookingSessionStatus
) {
  if (status === "completed") {
    throw new Error("Completed cooking sessions cannot be changed.");
  }

  if (status === "abandoned") {
    throw new Error("Abandoned cooking sessions cannot be changed.");
  }
}

export function getCookingSessionCompletionWarnings({
  ingredients,
  steps
}: {
  ingredients: Array<{ displayName: string; isReady: boolean }>;
  steps: Array<{ instruction: string; isCompleted: boolean }>;
}) {
  return {
    uncheckedIngredientNames: ingredients
      .filter((ingredient) => !ingredient.isReady)
      .map((ingredient) => ingredient.displayName),
    uncheckedStepInstructions: steps
      .filter((step) => !step.isCompleted)
      .map((step) => step.instruction)
  };
}

function compareSortOrder(left: { sortOrder: number }, right: { sortOrder: number }) {
  return left.sortOrder - right.sortOrder;
}

function resolveScaleFactor(scaleFactor: number | null) {
  if (scaleFactor === null) {
    return 1;
  }

  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) {
    throw new Error("Cooking session scale must be greater than zero.");
  }

  return scaleFactor;
}

function scaleNullableNumber(value: number | null, scaleFactor: number) {
  return value === null ? null : value * scaleFactor;
}
