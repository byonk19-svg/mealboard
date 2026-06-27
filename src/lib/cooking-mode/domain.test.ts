import { describe, expect, it } from "vitest";
import {
  assertCookingSessionCanBeEdited,
  buildCookingSessionLifecyclePatch,
  buildCookingSessionSnapshot,
  getCookingSessionCompletionWarnings,
  validateCurrentStepSortOrder
} from "./domain";

const recipe = {
  id: "recipe-1",
  name: "Turkey Chili",
  servings: 4,
  updatedAt: "2026-06-26T12:00:00.000Z",
  ingredients: [
    {
      id: "ingredient-1",
      displayName: "Ground turkey",
      foodId: "food-turkey",
      notes: "Lean",
      optional: false,
      preparation: "browned",
      quantity: 1,
      sortOrder: 20,
      unit: "lb"
    },
    {
      id: "ingredient-2",
      displayName: "Beans",
      foodId: null,
      notes: null,
      optional: true,
      preparation: null,
      quantity: null,
      sortOrder: 30,
      unit: null
    }
  ],
  steps: [
    {
      id: "step-1",
      instruction: "Brown the turkey.",
      sectionLabel: "Prep",
      sortOrder: 10
    },
    {
      id: "step-2",
      instruction: "Simmer everything.",
      sectionLabel: null,
      sortOrder: 30
    }
  ]
};

describe("buildCookingSessionSnapshot", () => {
  it("creates a direct recipe snapshot without mutating canonical sort orders", () => {
    const snapshot = buildCookingSessionSnapshot({ recipe });

    expect(snapshot.session).toEqual({
      currentStepSortOrder: 0,
      recipeId: "recipe-1",
      recipeNameSnapshot: "Turkey Chili",
      recipeUpdatedAtSnapshot: "2026-06-26T12:00:00.000Z",
      scaleFactorSnapshot: 1,
      servingsSnapshot: 4,
      weeklyPlanItemId: null
    });
    expect(snapshot.ingredients.map((ingredient) => ingredient.sortOrder)).toEqual([
      0,
      1
    ]);
    expect(snapshot.ingredients[0]).toEqual(
      expect.objectContaining({
        displayName: "Ground turkey",
        quantity: 1,
        recipeIngredientId: "ingredient-1"
      })
    );
    expect(snapshot.steps).toEqual([
      {
        instruction: "Brown the turkey.",
        recipeStepId: "step-1",
        sectionLabel: "Prep",
        sortOrder: 0
      },
      {
        instruction: "Simmer everything.",
        recipeStepId: "step-2",
        sectionLabel: null,
        sortOrder: 1
      }
    ]);
  });

  it("applies planned meal scale to servings and ingredient quantities", () => {
    const snapshot = buildCookingSessionSnapshot({
      plannedMeal: {
        id: "plan-item-1",
        scaleFactor: 1.5
      },
      recipe
    });

    expect(snapshot.session).toEqual(
      expect.objectContaining({
        scaleFactorSnapshot: 1.5,
        servingsSnapshot: 6,
        weeklyPlanItemId: "plan-item-1"
      })
    );
    expect(snapshot.ingredients.map((ingredient) => ingredient.quantity)).toEqual([
      1.5,
      null
    ]);
  });

  it("requires at least one reviewed recipe step", () => {
    expect(() =>
      buildCookingSessionSnapshot({
        recipe: {
          ...recipe,
          steps: []
        }
      })
    ).toThrow("Review cooking steps before starting Cooking Mode.");
  });
});

describe("current step validation", () => {
  it("accepts only current step sort orders that exist in the session snapshot", () => {
    const steps = [
      { sortOrder: 0 },
      { sortOrder: 1 }
    ];

    expect(validateCurrentStepSortOrder(steps, 1)).toBe(1);
    expect(() => validateCurrentStepSortOrder(steps, 2)).toThrow(
      "That cooking step is no longer available."
    );
  });
});

describe("cooking session lifecycle helpers", () => {
  it("builds valid lifecycle patches for pause, resume, complete, and abandon", () => {
    const now = "2026-06-27T12:00:00.000Z";

    expect(buildCookingSessionLifecyclePatch("active", "pause", now)).toEqual({
      paused_at: now,
      status: "paused"
    });
    expect(buildCookingSessionLifecyclePatch("paused", "resume", now)).toEqual({
      paused_at: null,
      status: "active"
    });
    expect(buildCookingSessionLifecyclePatch("paused", "complete", now)).toEqual({
      completed_at: now,
      status: "completed"
    });
    expect(buildCookingSessionLifecyclePatch("active", "abandon", now)).toEqual({
      abandoned_at: now,
      status: "abandoned"
    });
  });

  it("rejects transitions out of terminal sessions", () => {
    expect(() =>
      buildCookingSessionLifecyclePatch("completed", "resume", "now")
    ).toThrow("Completed cooking sessions cannot be changed.");
    expect(() =>
      buildCookingSessionLifecyclePatch("abandoned", "pause", "now")
    ).toThrow("Abandoned cooking sessions cannot be changed.");
  });

  it("treats completed and abandoned sessions as not editable", () => {
    expect(() => assertCookingSessionCanBeEdited("active")).not.toThrow();
    expect(() => assertCookingSessionCanBeEdited("paused")).not.toThrow();
    expect(() => assertCookingSessionCanBeEdited("completed")).toThrow(
      "Completed cooking sessions cannot be changed."
    );
    expect(() => assertCookingSessionCanBeEdited("abandoned")).toThrow(
      "Abandoned cooking sessions cannot be changed."
    );
  });
});

describe("getCookingSessionCompletionWarnings", () => {
  it("reports unchecked ingredients and steps without blocking completion", () => {
    expect(
      getCookingSessionCompletionWarnings({
        ingredients: [
          { displayName: "Turkey", isReady: true },
          { displayName: "Beans", isReady: false }
        ],
        steps: [
          { instruction: "Brown turkey", isCompleted: false },
          { instruction: "Simmer", isCompleted: true }
        ]
      })
    ).toEqual({
      uncheckedIngredientNames: ["Beans"],
      uncheckedStepInstructions: ["Brown turkey"]
    });
  });
});
