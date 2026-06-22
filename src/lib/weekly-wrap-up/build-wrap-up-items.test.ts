import { describe, expect, it } from "vitest";
import {
  buildWeeklyWrapUpCandidates,
  type WrapUpGroceryItem,
  type WrapUpPlanItem
} from "./build-wrap-up-items";

describe("buildWeeklyWrapUpCandidates", () => {
  it("creates recipe-review candidates for tried recipes without reviews", () => {
    const result = buildWeeklyWrapUpCandidates({
      existingReviewedPlanItemIds: new Set(),
      groceryItems: [],
      planItems: [
        planItem({
          recipeId: "recipe-1",
          recipeStatus: "tried",
          weeklyPlanItemId: "plan-item-1"
        })
      ]
    });

    expect(result.recipeReviewCandidates).toEqual([
      expect.objectContaining({
        promptType: "recipe_review",
        recipeId: "recipe-1",
        weeklyPlanItemId: "plan-item-1"
      })
    ]);
  });

  it("creates recipe-review candidates for Try This plan items", () => {
    const result = buildWeeklyWrapUpCandidates({
      existingReviewedPlanItemIds: new Set(),
      groceryItems: [],
      planItems: [
        planItem({
          isTryThis: true,
          recipeStatus: "approved",
          weeklyPlanItemId: "try-this-1"
        })
      ]
    });

    expect(result.recipeReviewCandidates.map((item) => item.weeklyPlanItemId)).toEqual([
      "try-this-1"
    ]);
  });

  it("creates meal outcome candidates for approved planned recipes", () => {
    const result = buildWeeklyWrapUpCandidates({
      existingReviewedPlanItemIds: new Set(),
      groceryItems: [],
      planItems: [
        planItem({
          isTryThis: false,
          recipeStatus: "approved",
          weeklyPlanItemId: "approved-recipe-1"
        })
      ]
    });

    expect(result.recipeReviewCandidates.map((item) => item.weeklyPlanItemId)).toEqual([
      "approved-recipe-1"
    ]);
  });

  it("does not create meal outcome candidates for non-recipe plan items", () => {
    const result = buildWeeklyWrapUpCandidates({
      existingReviewedPlanItemIds: new Set(),
      groceryItems: [],
      planItems: [
        planItem({
          recipeId: null,
          recipeName: null,
          weeklyPlanItemId: "food-only-1"
        })
      ]
    });

    expect(result.recipeReviewCandidates).toEqual([]);
  });

  it("skips plan items that already have recipe reviews", () => {
    const result = buildWeeklyWrapUpCandidates({
      existingReviewedPlanItemIds: new Set(["plan-item-1"]),
      groceryItems: [],
      planItems: [
        planItem({
          recipeStatus: "tried",
          weeklyPlanItemId: "plan-item-1"
        })
      ]
    });

    expect(result.recipeReviewCandidates).toEqual([]);
  });

  it("creates unused-grocery candidates for unchecked items not already at home", () => {
    const result = buildWeeklyWrapUpCandidates({
      existingReviewedPlanItemIds: new Set(),
      groceryItems: [
        groceryItem({ checked: false, groceryListItemId: "unused", alreadyHave: false }),
        groceryItem({ checked: true, groceryListItemId: "checked", alreadyHave: false }),
        groceryItem({ checked: false, groceryListItemId: "home", alreadyHave: true })
      ],
      planItems: []
    });

    expect(result.unusedGroceryCandidates.map((item) => item.groceryListItemId)).toEqual([
      "unused"
    ]);
  });

  it("classifies source-aware unused grocery candidates without losing mixed sources", () => {
    const result = buildWeeklyWrapUpCandidates({
      existingReviewedPlanItemIds: new Set(),
      groceryItems: [
        groceryItem({
          groceryListItemId: "staple",
          sources: [
            grocerySource({ sourceId: "staple-1", sourceType: "staple" })
          ]
        }),
        groceryItem({
          groceryListItemId: "mixed",
          sources: [
            grocerySource({
              sourceId: "plan-item-1",
              sourceType: "meal_generated"
            }),
            grocerySource({ sourceId: "staple-1", sourceType: "staple" })
          ]
        }),
        groceryItem({
          groceryListItemId: "manual",
          manualItem: true,
          sources: []
        }),
        groceryItem({
          groceryListItemId: "legacy-generated",
          manualItem: false,
          sources: []
        })
      ],
      planItems: []
    });

    expect(result.unusedGroceryCandidates).toEqual([
      expect.objectContaining({
        actionHref: "/settings/staples",
        actionLabel: "Review staples",
        classification: "staple",
        groceryListItemId: "staple",
        sourceKinds: ["staple"]
      }),
      expect.objectContaining({
        actionHref: null,
        actionLabel: null,
        classification: "mixed",
        groceryListItemId: "mixed",
        sourceKinds: ["meal", "staple"]
      }),
      expect.objectContaining({
        actionHref: "/grocery-list",
        actionLabel: "Review grocery list",
        classification: "manual",
        groceryListItemId: "manual",
        sourceKinds: ["manual"]
      }),
      expect.objectContaining({
        actionHref: null,
        actionLabel: null,
        classification: null,
        groceryListItemId: "legacy-generated",
        sourceKinds: []
      })
    ]);
  });
});

function planItem(overrides: Partial<WrapUpPlanItem> = {}): WrapUpPlanItem {
  return {
    displayName: "Turkey Wrap",
    isTryThis: false,
    mealProfileId: "profile-brianna",
    mealProfileName: "Brianna",
    mealType: "lunch",
    planDate: "2026-06-22",
    recipeId: "recipe-1",
    recipeName: "Turkey Wrap",
    recipeStatus: "tried",
    weeklyPlanItemId: "plan-item-1",
    ...overrides
  };
}

function groceryItem(
  overrides: Partial<WrapUpGroceryItem> = {}
): WrapUpGroceryItem {
  return {
    alreadyHave: false,
    checked: false,
    displayName: "Rice",
    groceryListItemId: "grocery-item-1",
    manualItem: false,
    sources: [],
    ...overrides
  };
}

function grocerySource(
  overrides: Partial<WrapUpGroceryItem["sources"][number]> = {}
): WrapUpGroceryItem["sources"][number] {
  return {
    label: "Rice source",
    mealProfileName: null,
    notes: null,
    quantity: 1,
    recipeName: null,
    sourceId: null,
    sourceType: "meal_generated",
    unit: "count",
    ...overrides
  };
}
