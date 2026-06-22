import { describe, expect, it } from "vitest";
import {
  buildDashboardAttentionItems,
  getDashboardNextAction
} from "./current-week-summary";

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
          approvedGroceryInputItemCount: 0,
          selectedStapleCount: 0,
          status: "draft",
          totalPlanItemCount: 2,
          unapprovedPlanItemCount: 2
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
          approvedGroceryInputItemCount: 1,
          selectedStapleCount: 0,
          status: "draft",
          totalPlanItemCount: 2,
          unapprovedPlanItemCount: 1
        }
      })
    ).toEqual({
      description: "Approved items are ready to become a draft grocery list.",
      href: "/plan-week",
      label: "Generate grocery list"
    });
  });

  it("treats approved food-backed baby items as grocery-ready inputs", () => {
    expect(
      getDashboardNextAction({
        groceryList: null,
        weeklyPlan: {
          approvedGroceryInputItemCount: 1,
          selectedStapleCount: 0,
          status: "draft",
          totalPlanItemCount: 1,
          unapprovedPlanItemCount: 0
        }
      })
    ).toEqual({
      description: "Approved items are ready to become a draft grocery list.",
      href: "/plan-week",
      label: "Generate grocery list"
    });

    const attentionItems = buildDashboardAttentionItems({
      groceryList: null,
      weeklyPlan: {
        approvedGroceryInputItemCount: 1,
        selectedStapleCount: 0,
        status: "draft",
        totalPlanItemCount: 1,
        unapprovedPlanItemCount: 0
      },
      weeklyWrapUp: null
    });

    expect(attentionItems.map((item) => item.id)).not.toContain(
      "no-grocery-inputs"
    );
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
          approvedGroceryInputItemCount: 1,
          selectedStapleCount: 1,
          status: "draft",
          totalPlanItemCount: 2,
          unapprovedPlanItemCount: 0
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
          approvedGroceryInputItemCount: 1,
          selectedStapleCount: 1,
          status: "draft",
          totalPlanItemCount: 2,
          unapprovedPlanItemCount: 0
        }
      })
    ).toEqual({
      description: "Keep checking off items while shopping.",
      href: "/grocery-list",
      label: "Continue shopping"
    });
  });

  it("returns to Plan Week when a completed list leaves planned meals unapproved", () => {
    expect(
      getDashboardNextAction({
        groceryList: {
          checkedItemCount: 3,
          itemCount: 3,
          status: "completed"
        },
        weeklyPlan: {
          approvedGroceryInputItemCount: 2,
          selectedStapleCount: 1,
          status: "draft",
          totalPlanItemCount: 3,
          unapprovedPlanItemCount: 1
        }
      })
    ).toEqual({
      description:
        "A planned meal still needs approval after the completed grocery list.",
      href: "/plan-week",
      label: "Review planned meals"
    });
  });
});

describe("buildDashboardAttentionItems", () => {
  it("starts the queue with planning when no current weekly plan exists", () => {
    expect(
      buildDashboardAttentionItems({
        groceryList: null,
        weeklyPlan: null,
        weeklyWrapUp: null
      })
    ).toEqual([
      expect.objectContaining({
        href: "/plan-week",
        id: "start-plan",
        label: "Start this week's plan"
      })
    ]);
  });

  it("surfaces unapproved meals and missing grocery inputs", () => {
    const items = buildDashboardAttentionItems({
      groceryList: null,
      weeklyPlan: {
        approvedGroceryInputItemCount: 0,
        selectedStapleCount: 0,
        status: "draft",
        totalPlanItemCount: 2,
        unapprovedPlanItemCount: 2
      },
      weeklyWrapUp: null
    });

    expect(items.map((item) => item.id)).toEqual([
      "unapproved-plan-items",
      "no-grocery-inputs"
    ]);
  });

  it("surfaces active grocery lifecycle work", () => {
    const items = buildDashboardAttentionItems({
      groceryList: {
        checkedItemCount: 2,
        itemCount: 6,
        status: "shopping_started"
      },
      weeklyPlan: {
        approvedGroceryInputItemCount: 1,
        selectedStapleCount: 1,
        status: "draft",
        totalPlanItemCount: 2,
        unapprovedPlanItemCount: 0
      },
      weeklyWrapUp: null
    });

    expect(items).toEqual([
      expect.objectContaining({
        href: "/grocery-list",
        id: "shopping-in-progress",
        label: "Continue shopping"
      })
    ]);
  });

  it("links completed shopping to weekly wrap-up when it is still open", () => {
    const items = buildDashboardAttentionItems({
      groceryList: {
        checkedItemCount: 6,
        itemCount: 6,
        status: "completed"
      },
      weeklyPlan: {
        approvedGroceryInputItemCount: 1,
        selectedStapleCount: 1,
        status: "draft",
        totalPlanItemCount: 2,
        unapprovedPlanItemCount: 0
      },
      weeklyWrapUp: {
        dismissed: false,
        status: "open"
      },
      weeklyWrapUpHref: "/weekly-wrap-up/week-1"
    });

    expect(items).toEqual([
      expect.objectContaining({
        href: "/weekly-wrap-up/week-1",
        id: "weekly-wrap-up"
      })
    ]);
  });

  it("suppresses dismissed weekly wrap-up attention", () => {
    const items = buildDashboardAttentionItems({
      groceryList: {
        checkedItemCount: 6,
        itemCount: 6,
        status: "completed"
      },
      weeklyPlan: {
        approvedGroceryInputItemCount: 1,
        selectedStapleCount: 1,
        status: "draft",
        totalPlanItemCount: 2,
        unapprovedPlanItemCount: 0
      },
      weeklyWrapUp: {
        dismissed: true,
        status: "open"
      },
      weeklyWrapUpHref: "/weekly-wrap-up/week-1"
    });

    expect(items).toEqual([]);
  });
});
