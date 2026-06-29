import { describe, expect, it } from "vitest";
import {
  buildConfirmedPantryConsumptionDecisionInsert,
  buildSkippedPantryConsumptionDecisionInsert
} from "./consumption-review";

describe("pantry consumption review inserts", () => {
  it("normalizes confirmed decision notes", () => {
    expect(
      buildConfirmedPantryConsumptionDecisionInsert({
        cookingSessionIngredientId: "ingredient-1",
        householdId: "household-1",
        note: "  used   in dinner  "
      })
    ).toEqual({
      cooking_session_ingredient_id: "ingredient-1",
      household_id: "household-1",
      note: "used in dinner",
      status: "confirmed"
    });
  });

  it("allows skipped decisions without notes", () => {
    expect(
      buildSkippedPantryConsumptionDecisionInsert({
        cookingSessionIngredientId: "ingredient-1",
        householdId: "household-1",
        note: "   "
      })
    ).toEqual({
      cooking_session_ingredient_id: "ingredient-1",
      household_id: "household-1",
      note: null,
      status: "skipped"
    });
  });
});
