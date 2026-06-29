export type PantryConsumptionConfirmResult =
  | {
      cookingSessionIngredientId: string;
      status: "confirmed";
    }
  | {
      cookingSessionIngredientId: string;
      status: "already_confirmed";
    };

export type PantryConsumptionSkipResult =
  | {
      cookingSessionIngredientId: string;
      status: "skipped";
    }
  | {
      cookingSessionIngredientId: string;
      status: "already_skipped";
    };

export function buildConfirmedPantryConsumptionDecisionInsert({
  cookingSessionIngredientId,
  householdId,
  note
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  note?: string | null;
}) {
  return {
    cooking_session_ingredient_id: cookingSessionIngredientId,
    household_id: householdId,
    note: normalizeDecisionNote(note),
    status: "confirmed" as const
  };
}

export function buildSkippedPantryConsumptionDecisionInsert({
  cookingSessionIngredientId,
  householdId,
  note
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  note?: string | null;
}) {
  return {
    cooking_session_ingredient_id: cookingSessionIngredientId,
    household_id: householdId,
    note: normalizeDecisionNote(note),
    status: "skipped" as const
  };
}

function normalizeDecisionNote(value: string | null | undefined) {
  const note = String(value ?? "").trim().replace(/\s+/g, " ");
  return note.length > 0 ? note : null;
}
