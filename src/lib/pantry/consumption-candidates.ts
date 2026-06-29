export type PantryConsumptionDecisionStatus = "confirmed" | "skipped";

export type PantryConsumptionDecision = {
  cookingSessionIngredientId: string;
  status: PantryConsumptionDecisionStatus;
};

export type PantryConsumptionSessionIngredient = {
  displayName: string;
  foodId: string | null;
  foodName: string | null;
  id: string;
  isReady: boolean;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | null;
  readyAt: string | null;
  sortOrder: number;
  unit: string | null;
};

export type PantryConsumptionCookingSession = {
  completedAt: string | null;
  createdAt: string;
  id: string;
  ingredients: PantryConsumptionSessionIngredient[];
  recipeId: string;
  recipeNameSnapshot: string;
  scaleFactorSnapshot: number;
  servingsSnapshot: number | null;
  startedAt: string;
  status: "active" | "paused" | "completed" | "abandoned";
};

export type PantryConsumptionCandidate = {
  completedAt: string | null;
  cookingSessionId: string;
  cookingSessionIngredientId: string;
  displayName: string;
  foodId: string;
  foodName: string | null;
  isReady: boolean;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | null;
  readyAt: string | null;
  recipeId: string;
  recipeNameSnapshot: string;
  scaleFactorSnapshot: number;
  servingsSnapshot: number | null;
  sortOrder: number;
  startedAt: string;
  unit: string | null;
};

export function buildPantryConsumptionCandidates({
  decisions,
  cookingSessions
}: {
  decisions: PantryConsumptionDecision[];
  cookingSessions: PantryConsumptionCookingSession[];
}): PantryConsumptionCandidate[] {
  const reviewedIngredientIds = new Set(
    decisions.map((decision) => decision.cookingSessionIngredientId)
  );

  return cookingSessions
    .filter((session) => session.status === "completed")
    .flatMap((session) =>
      session.ingredients
        .filter(
          (ingredient) =>
            ingredient.foodId !== null &&
            !reviewedIngredientIds.has(ingredient.id)
        )
        .map((ingredient) => ({
          completedAt: session.completedAt,
          cookingSessionId: session.id,
          cookingSessionIngredientId: ingredient.id,
          displayName: ingredient.displayName,
          foodId: ingredient.foodId as string,
          foodName: ingredient.foodName,
          isReady: ingredient.isReady,
          notes: ingredient.notes,
          optional: ingredient.optional,
          preparation: ingredient.preparation,
          quantity: ingredient.quantity,
          readyAt: ingredient.readyAt,
          recipeId: session.recipeId,
          recipeNameSnapshot: session.recipeNameSnapshot,
          scaleFactorSnapshot: session.scaleFactorSnapshot,
          servingsSnapshot: session.servingsSnapshot,
          sortOrder: ingredient.sortOrder,
          startedAt: session.startedAt,
          unit: ingredient.unit
        }))
    )
    .sort(comparePantryConsumptionCandidates);
}

function comparePantryConsumptionCandidates(
  left: PantryConsumptionCandidate,
  right: PantryConsumptionCandidate
) {
  const leftCompletedAt = left.completedAt ?? "";
  const rightCompletedAt = right.completedAt ?? "";

  if (leftCompletedAt !== rightCompletedAt) {
    return rightCompletedAt.localeCompare(leftCompletedAt);
  }

  if (left.startedAt !== right.startedAt) {
    return right.startedAt.localeCompare(left.startedAt);
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.cookingSessionIngredientId.localeCompare(
    right.cookingSessionIngredientId
  );
}
