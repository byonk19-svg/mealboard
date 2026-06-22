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
    ...overrides
  };
}
