import { describe, expect, it } from "vitest";
import { getDashboardNextAction } from "./current-week-summary";

describe("getDashboardNextAction", () => {
  it("starts with weekly planning when no current weekly plan exists", () => {
    expect(
      getDashboardNextAction({
        groceryList: null,
        weeklyPlan: null
      })
    ).toEqual({
      description: "Create or select the current week before planning meals.",
      href: "/plan-week",
      label: "Start this week's plan"
    });
  });

  it("keeps the user in Plan Week when meals or staples are not ready for groceries", () => {
    expect(
      getDashboardNextAction({
        groceryList: null,
        weeklyPlan: {
          approvedRecipeItemCount: 0,
          selectedStapleCount: 0,
          status: "draft",
          totalPlanItemCount: 2
        }
      })
    ).toEqual({
      description: "Approve a recipe item or select a staple before groceries.",
      href: "/plan-week",
      label: "Review weekly plan"
    });
  });

  it("points to grocery generation when approved meals or selected staples are ready", () => {
    expect(
      getDashboardNextAction({
        groceryList: null,
        weeklyPlan: {
          approvedRecipeItemCount: 1,
          selectedStapleCount: 0,
          status: "draft",
          totalPlanItemCount: 2
        }
      })
    ).toEqual({
      description: "Approved items are ready to become a draft grocery list.",
      href: "/plan-week",
      label: "Generate grocery list"
    });
  });

  it("uses the grocery lifecycle status once a current week grocery list exists", () => {
    expect(
      getDashboardNextAction({
        groceryList: {
          checkedItemCount: 0,
          itemCount: 8,
          status: "draft"
        },
        weeklyPlan: {
          approvedRecipeItemCount: 1,
          selectedStapleCount: 1,
          status: "draft",
          totalPlanItemCount: 2
        }
      })
    ).toEqual({
      description: "Review the generated list and finalize it before shopping.",
      href: "/grocery-list",
      label: "Review draft grocery list"
    });

    expect(
      getDashboardNextAction({
        groceryList: {
          checkedItemCount: 3,
          itemCount: 8,
          status: "shopping_started"
        },
        weeklyPlan: {
          approvedRecipeItemCount: 1,
          selectedStapleCount: 1,
          status: "draft",
          totalPlanItemCount: 2
        }
      })
    ).toEqual({
      description: "Keep checking off items while shopping.",
      href: "/grocery-list",
      label: "Continue shopping"
    });
  });
});
