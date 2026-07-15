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
      description: "Create this week first, then add one meal or staple.",
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
          checkedItemCount: 0,
          itemCount: 8,
          status: "finalized"
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
      description: "The list is finalized and ready for the store.",
      href: "/grocery-list",
      label: "Start shopping"
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

  it("makes pending weekly wrap-up the primary action after completed shopping", () => {
    expect(
      getDashboardNextAction({
        groceryList: {
          checkedItemCount: 2,
          itemCount: 2,
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
      })
    ).toEqual({
      description:
        "Capture quick notes while this week's meals and groceries are fresh.",
      href: "/weekly-wrap-up/week-1",
      label: "Open weekly wrap-up"
    });
  });

  it("keeps completed-shopping behavior when wrap-up is completed or unavailable", () => {
    const weeklyPlan = {
      approvedGroceryInputItemCount: 1,
      selectedStapleCount: 1,
      status: "draft" as const,
      totalPlanItemCount: 2,
      unapprovedPlanItemCount: 0
    };
    const groceryList = {
      checkedItemCount: 2,
      itemCount: 2,
      status: "completed" as const
    };
    const expectedAction = {
      description: "This week's shopping list is completed.",
      href: "/recipes",
      label: "Review recipes"
    };

    expect(
      getDashboardNextAction({
        groceryList,
        weeklyPlan,
        weeklyWrapUp: null
      })
    ).toEqual(expectedAction);
    expect(
      getDashboardNextAction({
        groceryList,
        weeklyPlan,
        weeklyWrapUp: {
          dismissed: false,
          status: "completed"
        },
        weeklyWrapUpHref: "/weekly-wrap-up/week-1"
      })
    ).toEqual(expectedAction);
    expect(
      getDashboardNextAction({
        groceryList,
        weeklyPlan,
        weeklyWrapUp: {
          dismissed: true,
          status: "open"
        },
        weeklyWrapUpHref: "/weekly-wrap-up/week-1"
      })
    ).toEqual(expectedAction);
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

  it("prioritizes pending wrap-up over completed-list plan cleanup", () => {
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
        },
        weeklyWrapUp: {
          dismissed: false,
          status: "open"
        },
        weeklyWrapUpHref: "/weekly-wrap-up/week-1"
      })
    ).toEqual({
      description:
        "Capture quick notes while this week's meals and groceries are fresh.",
      href: "/weekly-wrap-up/week-1",
      label: "Open weekly wrap-up"
    });
  });
});

describe("buildDashboardAttentionItems", () => {
  it("starts the queue with planning when no current weekly plan exists", () => {
    expect(
      buildDashboardAttentionItems({
        groceryList: null,
        setup: null,
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

  it("keeps setup items visible when no current weekly plan exists", () => {
    const items = buildDashboardAttentionItems({
      groceryList: null,
      setup: {
        adultProfileCount: 2,
        adultProfilesMissingCalorieTargets: 1,
        approvedRecipeCount: 0,
        babyFoodStatusCount: 0,
        babyProfileReady: false,
        lowConfidenceRecipeCount: 0,
        recipeCount: 0,
        stapleCount: 0
      },
      weeklyPlan: null,
      weeklyWrapUp: null
    });

    expect(items.map((item) => item.id)).toEqual([
      "start-plan",
      "no-approved-recipes",
      "baby-setup-needed",
      "missing-calorie-targets",
      "no-staples"
    ]);
  });

  it("surfaces unapproved meals and missing grocery inputs", () => {
    const items = buildDashboardAttentionItems({
      groceryList: null,
      setup: null,
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

  it("surfaces current-week lifecycle work before setup issues", () => {
    const items = buildDashboardAttentionItems({
      groceryList: null,
      setup: {
        adultProfileCount: 2,
        adultProfilesMissingCalorieTargets: 1,
        approvedRecipeCount: 0,
        babyFoodStatusCount: 0,
        babyProfileReady: true,
        lowConfidenceRecipeCount: 3,
        recipeCount: 4,
        stapleCount: 0
      },
      weeklyPlan: {
        approvedGroceryInputItemCount: 0,
        selectedStapleCount: 0,
        status: "draft",
        totalPlanItemCount: 0,
        unapprovedPlanItemCount: 0
      },
      weeklyWrapUp: null
    });

    expect(items.map((item) => item.id)).toEqual([
      "empty-plan",
      "no-grocery-inputs",
      "no-approved-recipes",
      "no-baby-food-statuses",
      "missing-calorie-targets",
      "low-confidence-recipes",
      "no-staples"
    ]);
    expect(items[0]).toEqual(
      expect.objectContaining({
        href: "/plan-week",
        label: "Add meals or staples"
      })
    );
  });

  it("suppresses baby food status warnings until baby stage setup is ready", () => {
    const items = buildDashboardAttentionItems({
      groceryList: null,
      setup: {
        adultProfileCount: 2,
        adultProfilesMissingCalorieTargets: 0,
        approvedRecipeCount: 1,
        babyFoodStatusCount: 0,
        babyProfileReady: false,
        lowConfidenceRecipeCount: 0,
        recipeCount: 1,
        stapleCount: 1
      },
      weeklyPlan: {
        approvedGroceryInputItemCount: 0,
        selectedStapleCount: 0,
        status: "draft",
        totalPlanItemCount: 0,
        unapprovedPlanItemCount: 0
      },
      weeklyWrapUp: null
    });

    expect(items.map((item) => item.id)).toContain("baby-setup-needed");
    expect(items.map((item) => item.id)).not.toContain("no-baby-food-statuses");
  });

  it("surfaces gentle current-week calorie estimate and target warnings", () => {
    const items = buildDashboardAttentionItems({
      groceryList: null,
      setup: {
        adultProfileCount: 2,
        adultProfilesMissingCalorieTargets: 0,
        approvedRecipeCount: 2,
        babyFoodStatusCount: 1,
        babyProfileReady: true,
        calorieGuidanceOverDayCount: 1,
        calorieGuidanceUnderDayCount: 2,
        calorieGuidanceUnknownDayCount: 1,
        lowConfidenceRecipeCount: 0,
        recipeCount: 2,
        stapleCount: 1
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

    expect(items.map((item) => item.id)).toEqual([
      "unknown-calorie-estimates",
      "calorie-target-mismatch"
    ]);
  });

  it("suppresses resolved setup issues and preserves stable lifecycle ordering", () => {
    const items = buildDashboardAttentionItems({
      groceryList: {
        checkedItemCount: 0,
        itemCount: 5,
        status: "draft"
      },
      setup: {
        adultProfileCount: 2,
        adultProfilesMissingCalorieTargets: 0,
        approvedRecipeCount: 3,
        babyFoodStatusCount: 2,
        babyProfileReady: true,
        lowConfidenceRecipeCount: 0,
        recipeCount: 3,
        stapleCount: 1
      },
      weeklyPlan: {
        approvedGroceryInputItemCount: 1,
        selectedStapleCount: 1,
        status: "draft",
        totalPlanItemCount: 2,
        unapprovedPlanItemCount: 1
      },
      weeklyWrapUp: null
    });

    expect(items.map((item) => item.id)).toEqual([
      "unapproved-plan-items",
      "draft-grocery-list"
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

  it("keeps current-week wrap-up ahead of recipe maintenance", () => {
    const items = buildDashboardAttentionItems({
      groceryList: {
        checkedItemCount: 6,
        itemCount: 6,
        status: "completed"
      },
      setup: {
        adultProfileCount: 2,
        adultProfilesMissingCalorieTargets: 0,
        approvedRecipeCount: 2,
        babyFoodStatusCount: 1,
        babyProfileReady: true,
        lowConfidenceRecipeCount: 1,
        recipeCount: 2,
        stapleCount: 1
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

    expect(items.map((item) => item.id)).toEqual([
      "weekly-wrap-up",
      "low-confidence-recipes"
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
