import { describe, expect, it } from "vitest";
import {
  buildPantryConsumptionCandidates,
  type PantryConsumptionCookingSession,
  type PantryConsumptionDecision,
  type PantryConsumptionSessionIngredient
} from "./consumption-candidates";

describe("buildPantryConsumptionCandidates", () => {
  it("derives candidates from food-backed completed cooking session ingredients", () => {
    const candidates = buildPantryConsumptionCandidates({
      cookingSessions: [
        cookingSession({
          ingredients: [
            cookingIngredient({
              id: "ingredient-1",
              isReady: true,
              quantity: 2,
              unit: "count"
            })
          ]
        })
      ],
      decisions: []
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        cookingSessionId: "session-1",
        cookingSessionIngredientId: "ingredient-1",
        displayName: "Tortillas",
        foodId: "food-tortillas",
        foodName: "Tortillas",
        isReady: true,
        quantity: 2,
        recipeNameSnapshot: "Wraps",
        unit: "count"
      })
    ]);
  });

  it("excludes active, abandoned, unlinked, confirmed, and skipped ingredients", () => {
    const decisions: PantryConsumptionDecision[] = [
      { cookingSessionIngredientId: "confirmed-ingredient", status: "confirmed" },
      { cookingSessionIngredientId: "skipped-ingredient", status: "skipped" }
    ];

    const candidates = buildPantryConsumptionCandidates({
      cookingSessions: [
        cookingSession({
          ingredients: [
            cookingIngredient({ id: "unlinked-ingredient", foodId: null }),
            cookingIngredient({ id: "confirmed-ingredient" }),
            cookingIngredient({ id: "skipped-ingredient" }),
            cookingIngredient({ id: "eligible-ingredient" })
          ]
        }),
        cookingSession({
          id: "active-session",
          ingredients: [cookingIngredient({ id: "active-ingredient" })],
          status: "active"
        }),
        cookingSession({
          id: "abandoned-session",
          ingredients: [cookingIngredient({ id: "abandoned-ingredient" })],
          status: "abandoned"
        })
      ],
      decisions
    });

    expect(
      candidates.map((candidate) => candidate.cookingSessionIngredientId)
    ).toEqual(["eligible-ingredient"]);
  });

  it("orders by completed session recency, start recency, ingredient sort order, and id", () => {
    const candidates = buildPantryConsumptionCandidates({
      cookingSessions: [
        cookingSession({
          completedAt: "2026-06-20T00:00:00.000Z",
          id: "older-session",
          ingredients: [cookingIngredient({ id: "older-ingredient" })],
          startedAt: "2026-06-19T00:00:00.000Z"
        }),
        cookingSession({
          completedAt: "2026-06-21T00:00:00.000Z",
          id: "newer-session",
          ingredients: [
            cookingIngredient({ id: "newer-b", sortOrder: 2 }),
            cookingIngredient({ id: "newer-a", sortOrder: 2 }),
            cookingIngredient({ id: "newer-first", sortOrder: 1 })
          ],
          startedAt: "2026-06-20T00:00:00.000Z"
        })
      ],
      decisions: []
    });

    expect(
      candidates.map((candidate) => candidate.cookingSessionIngredientId)
    ).toEqual(["newer-first", "newer-a", "newer-b", "older-ingredient"]);
  });
});

function cookingSession(
  overrides: Partial<PantryConsumptionCookingSession> = {}
): PantryConsumptionCookingSession {
  return {
    completedAt: "2026-06-21T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
    id: "session-1",
    ingredients: [],
    recipeId: "recipe-1",
    recipeNameSnapshot: "Wraps",
    scaleFactorSnapshot: 1,
    servingsSnapshot: 2,
    startedAt: "2026-06-20T00:00:00.000Z",
    status: "completed",
    ...overrides
  };
}

function cookingIngredient(
  overrides: Partial<PantryConsumptionSessionIngredient> = {}
): PantryConsumptionSessionIngredient {
  return {
    displayName: "Tortillas",
    foodId: "food-tortillas",
    foodName: "Tortillas",
    id: "ingredient-1",
    isReady: false,
    notes: null,
    optional: false,
    preparation: null,
    quantity: null,
    readyAt: null,
    sortOrder: 0,
    unit: null,
    ...overrides
  };
}
