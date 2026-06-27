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

export type RecipeStepDraft = {
  instruction: string;
  sectionLabel: string | null;
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

export type CookingTimerStatus =
  | "ready"
  | "running"
  | "paused"
  | "expired"
  | "dismissed"
  | "canceled";

export type CookingTimerShape = {
  durationSeconds: number;
  expiresAt: string | null;
  remainingSeconds: number | null;
  status: CookingTimerStatus;
};

export type CookingTimerPatch = {
  canceled_at?: string | null;
  dismissed_at?: string | null;
  expired_at?: string | null;
  expires_at?: string | null;
  paused_at?: string | null;
  remaining_seconds?: number | null;
  started_at?: string | null;
  status: CookingTimerStatus;
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

export function buildRecipeStepDraftsFromInstructions(
  instructions: string | null
): RecipeStepDraft[] {
  if (!instructions) {
    return [];
  }

  return instructions
    .split(/\r?\n+/)
    .flatMap((line) => splitNumberedInstructionLine(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+[\).\-\s]+/, "").trim())
    .filter(Boolean)
    .map((instruction) => ({
      instruction,
      sectionLabel: null
    }));
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

export function resolveCookingTimerStatus(
  timer: CookingTimerShape,
  now: Date
): {
  effectiveRemainingSeconds: number;
  effectiveStatus: CookingTimerStatus;
} {
  if (timer.status !== "running" || !timer.expiresAt) {
    return {
      effectiveRemainingSeconds:
        timer.remainingSeconds ?? timer.durationSeconds,
      effectiveStatus: timer.status
    };
  }

  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(timer.expiresAt).getTime() - now.getTime()) / 1000)
  );

  return {
    effectiveRemainingSeconds: remainingSeconds,
    effectiveStatus: remainingSeconds === 0 ? "expired" : "running"
  };
}

export function buildCookingTimerStartPatch({
  now,
  timer
}: {
  now: Date;
  timer: CookingTimerShape;
}): CookingTimerPatch {
  const resolved = resolveCookingTimerStatus(timer, now);

  if (
    timer.status !== "ready" &&
    timer.status !== "paused" &&
    resolved.effectiveStatus !== "expired"
  ) {
    throw new Error("Only ready or paused cooking timers can be started.");
  }

  if (resolved.effectiveStatus === "expired") {
    throw new Error("Expired cooking timers cannot be restarted.");
  }

  const remainingSeconds = timer.remainingSeconds ?? timer.durationSeconds;
  const expiresAt = new Date(now.getTime() + remainingSeconds * 1000);

  return {
    expires_at: expiresAt.toISOString(),
    paused_at: null,
    remaining_seconds: null,
    started_at: timer.status === "ready" ? now.toISOString() : undefined,
    status: "running"
  };
}

export function buildCookingTimerPausePatch({
  now,
  timer
}: {
  now: Date;
  timer: CookingTimerShape;
}): CookingTimerPatch {
  const resolved = resolveCookingTimerStatus(timer, now);

  if (resolved.effectiveStatus !== "running") {
    throw new Error("Only running cooking timers can be paused.");
  }

  return {
    expires_at: null,
    paused_at: now.toISOString(),
    remaining_seconds: resolved.effectiveRemainingSeconds,
    status: "paused"
  };
}

export function buildCookingTimerExpirePatch(now: Date): CookingTimerPatch {
  return {
    expired_at: now.toISOString(),
    status: "expired"
  };
}

export function buildCookingTimerDismissPatch({
  now,
  timer
}: {
  now: Date;
  timer: CookingTimerShape;
}): CookingTimerPatch {
  const resolved = resolveCookingTimerStatus(timer, now);

  if (resolved.effectiveStatus !== "expired") {
    throw new Error("Only expired cooking timers can be dismissed.");
  }

  return {
    dismissed_at: now.toISOString(),
    expired_at: now.toISOString(),
    status: "dismissed"
  };
}

export function buildCookingTimerCancelPatch(now: Date): CookingTimerPatch {
  return {
    canceled_at: now.toISOString(),
    status: "canceled"
  };
}

function compareSortOrder(left: { sortOrder: number }, right: { sortOrder: number }) {
  return left.sortOrder - right.sortOrder;
}

function splitNumberedInstructionLine(line: string) {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return [];
  }

  const numberedSegments = trimmedLine
    .split(/(?=\s*\d+[\).\-\s]+[A-Z])/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return numberedSegments.length > 1 ? numberedSegments : [trimmedLine];
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
