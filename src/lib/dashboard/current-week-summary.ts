import type { GroceryListStatus } from "@/lib/grocery/data";
import type { WeeklyPlanStatus } from "@/lib/weekly-plans/types";

export type DashboardWeeklyPlanSummary = {
  approvedGroceryInputItemCount: number;
  selectedStapleCount: number;
  status: WeeklyPlanStatus;
  totalPlanItemCount: number;
  unapprovedPlanItemCount: number;
};

export type DashboardGroceryListSummary = {
  checkedItemCount: number;
  itemCount: number;
  status: GroceryListStatus;
};

export type DashboardNextAction = {
  description: string;
  href: string;
  label: string;
};

export type DashboardWeeklyWrapUpSummary = {
  dismissed: boolean;
  status: "open" | "dismissed" | "completed";
} | null;

export type DashboardSetupSummary = {
  adultProfileCount: number;
  adultProfilesMissingCalorieTargets: number;
  approvedRecipeCount: number;
  babyFoodStatusCount: number;
  babyProfileReady: boolean;
  calorieGuidanceOverDayCount?: number;
  calorieGuidanceUnderDayCount?: number;
  calorieGuidanceUnknownDayCount?: number;
  lowConfidenceRecipeCount: number;
  recipeCount: number;
  stapleCount: number;
} | null;

export type DashboardAttentionItem = {
  actionLabel: string;
  description: string;
  href: string;
  id: string;
  label: string;
};

export function buildDashboardAttentionItems({
  groceryList,
  setup,
  weeklyPlan,
  weeklyWrapUp,
  weeklyWrapUpHref
}: {
  groceryList: DashboardGroceryListSummary | null;
  setup?: DashboardSetupSummary;
  weeklyPlan: DashboardWeeklyPlanSummary | null;
  weeklyWrapUp: DashboardWeeklyWrapUpSummary;
  weeklyWrapUpHref?: string;
}): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];
  items.push(...buildSetupAttentionItems(setup ?? null));

  if (!weeklyPlan) {
    items.push({
      actionLabel: "Start plan",
      description: "Create this week before adding meals, staples, or groceries.",
      href: "/plan-week",
      id: "start-plan",
      label: "Start this week's plan"
    });

    return items;
  }

  if (weeklyPlan.totalPlanItemCount === 0 && weeklyPlan.selectedStapleCount === 0) {
    items.push({
      actionLabel: "Open Plan Week",
      description: "Add saved recipes or select staples before generating groceries.",
      href: "/plan-week",
      id: "empty-plan",
      label: "Add meals or staples"
    });
  }

  if (weeklyPlan.unapprovedPlanItemCount > 0) {
    items.push({
      actionLabel: "Review plan",
      description: `${weeklyPlan.unapprovedPlanItemCount} planned ${weeklyPlan.unapprovedPlanItemCount === 1 ? "item needs" : "items need"} approval before it counts for groceries.`,
      href: "/plan-week",
      id: "unapproved-plan-items",
      label: "Review planned meals"
    });
  }

  if (
    !groceryList &&
    weeklyPlan.approvedGroceryInputItemCount + weeklyPlan.selectedStapleCount === 0
  ) {
    items.push({
      actionLabel: "Open Plan Week",
      description: "Approve at least one recipe or staple so grocery generation has inputs.",
      href: "/plan-week",
      id: "no-grocery-inputs",
      label: "Prepare grocery inputs"
    });
  }

  if (groceryList?.status === "draft") {
    items.push({
      actionLabel: "Open list",
      description: "Review the generated list and finalize it before shopping.",
      href: "/grocery-list",
      id: "draft-grocery-list",
      label: "Finalize grocery list"
    });
  }

  if (groceryList?.status === "finalized") {
    items.push({
      actionLabel: "Open list",
      description: "Start shopping when you are ready to check items off.",
      href: "/grocery-list",
      id: "finalized-grocery-list",
      label: "Start shopping"
    });
  }

  if (groceryList?.status === "shopping_started") {
    items.push({
      actionLabel: "Open list",
      description: `${groceryList.checkedItemCount} of ${groceryList.itemCount} items are checked.`,
      href: "/grocery-list",
      id: "shopping-in-progress",
      label: "Continue shopping"
    });
  }

  if (
    groceryList?.status === "completed" &&
    weeklyWrapUp?.dismissed !== true &&
    weeklyWrapUp?.status !== "completed" &&
    weeklyWrapUp?.status !== "dismissed"
  ) {
    items.push({
      actionLabel: "Open wrap-up",
      description: "Capture made/skipped meals, leftovers, and unused grocery notes.",
      href: weeklyWrapUpHref ?? "/dashboard",
      id: "weekly-wrap-up",
      label: "Review this week"
    });
  }

  return items;
}

function buildSetupAttentionItems(
  setup: DashboardSetupSummary
): DashboardAttentionItem[] {
  if (!setup) {
    return [];
  }

  const items: DashboardAttentionItem[] = [];

  if (setup.approvedRecipeCount === 0) {
    items.push({
      actionLabel: "Open recipes",
      description:
        setup.recipeCount > 0
          ? "Mark at least one saved recipe as approved so suggestions and planning have safe options."
          : "Add and approve a few reliable recipes before planning the week.",
      href: "/recipes",
      id: "no-approved-recipes",
      label: "Approve recipes"
    });
  }

  if (!setup.babyProfileReady) {
    items.push({
      actionLabel: "Open Baby settings",
      description:
        "Add Baby's birthdate or stage override so solids planning can use the right routine context.",
      href: "/settings/baby",
      id: "baby-setup-needed",
      label: "Finish Baby setup"
    });
  }

  if (setup.babyProfileReady && setup.babyFoodStatusCount === 0) {
    items.push({
      actionLabel: "Open Baby settings",
      description:
        "Add tried, liked, or disliked baby foods so Baby Meal 1/2 suggestions are useful.",
      href: "/settings/baby",
      id: "no-baby-food-statuses",
      label: "Add Baby foods"
    });
  }

  if (setup.adultProfilesMissingCalorieTargets > 0) {
    items.push({
      actionLabel: "Open profiles",
      description: `${setup.adultProfilesMissingCalorieTargets} adult ${setup.adultProfilesMissingCalorieTargets === 1 ? "profile is" : "profiles are"} missing calorie targets for gentle planning guidance.`,
      href: "/settings/profiles",
      id: "missing-calorie-targets",
      label: "Add calorie targets"
    });
  }

  if (setup.lowConfidenceRecipeCount > 0) {
    items.push({
      actionLabel: "Open recipes",
      description: `${setup.lowConfidenceRecipeCount} approved ${setup.lowConfidenceRecipeCount === 1 ? "recipe has" : "recipes have"} low-confidence nutrition estimates.`,
      href: "/recipes",
      id: "low-confidence-recipes",
      label: "Review nutrition estimates"
    });
  }

  if ((setup.calorieGuidanceUnknownDayCount ?? 0) > 0) {
    items.push({
      actionLabel: "Open Plan Week",
      description: `${setup.calorieGuidanceUnknownDayCount} planned ${setup.calorieGuidanceUnknownDayCount === 1 ? "day has" : "days have"} calorie targets but incomplete meal estimates.`,
      href: "/plan-week",
      id: "unknown-calorie-estimates",
      label: "Review meal estimates"
    });
  }

  if (
    (setup.calorieGuidanceOverDayCount ?? 0) > 0 ||
    (setup.calorieGuidanceUnderDayCount ?? 0) > 0
  ) {
    const issueCount =
      (setup.calorieGuidanceOverDayCount ?? 0) +
      (setup.calorieGuidanceUnderDayCount ?? 0);
    items.push({
      actionLabel: "Open Plan Week",
      description: `${issueCount} planned ${issueCount === 1 ? "day is" : "days are"} outside the selected calorie guidance range.`,
      href: "/plan-week",
      id: "calorie-target-mismatch",
      label: "Review calorie guidance"
    });
  }

  if (setup.stapleCount === 0) {
    items.push({
      actionLabel: "Open staples",
      description:
        "Create reusable staples for recurring groceries before building a full weekly list.",
      href: "/settings/staples",
      id: "no-staples",
      label: "Add staples"
    });
  }

  return items;
}

export function getDashboardNextAction({
  groceryList,
  weeklyPlan,
  weeklyWrapUp,
  weeklyWrapUpHref
}: {
  groceryList: DashboardGroceryListSummary | null;
  weeklyPlan: DashboardWeeklyPlanSummary | null;
  weeklyWrapUp?: DashboardWeeklyWrapUpSummary;
  weeklyWrapUpHref?: string;
}): DashboardNextAction {
  if (!weeklyPlan) {
    return {
      description: "Create or select the current week before planning meals.",
      href: "/plan-week",
      label: "Start this week's plan"
    };
  }

  if (groceryList) {
    return getGroceryListNextAction({
      status: groceryList.status,
      weeklyPlan,
      weeklyWrapUp,
      weeklyWrapUpHref
    });
  }

  if (
    weeklyPlan.approvedGroceryInputItemCount > 0 ||
    weeklyPlan.selectedStapleCount > 0
  ) {
    return {
      description: "Approved items are ready to become a draft grocery list.",
      href: "/plan-week",
      label: "Generate grocery list"
    };
  }

  return {
    description: "Approve a recipe item or select a staple before groceries.",
    href: "/plan-week",
    label: "Review weekly plan"
  };
}

function getGroceryListNextAction({
  status,
  weeklyPlan,
  weeklyWrapUp,
  weeklyWrapUpHref
}: {
  status: GroceryListStatus;
  weeklyPlan: DashboardWeeklyPlanSummary;
  weeklyWrapUp?: DashboardWeeklyWrapUpSummary;
  weeklyWrapUpHref?: string;
}): DashboardNextAction {
  if (status === "completed" && isWeeklyWrapUpPending(weeklyWrapUp)) {
    return {
      description:
        "Capture quick notes while this week's meals and groceries are fresh.",
      href: weeklyWrapUpHref ?? "/dashboard",
      label: "Open weekly wrap-up"
    };
  }

  if (status === "completed" && weeklyPlan.unapprovedPlanItemCount > 0) {
    return {
      description:
        "A planned meal still needs approval after the completed grocery list.",
      href: "/plan-week",
      label: "Review planned meals"
    };
  }

  const actions: Record<GroceryListStatus, DashboardNextAction> = {
    completed: {
      description: "This week's shopping list is completed.",
      href: "/recipes",
      label: "Review recipes"
    },
    draft: {
      description: "Review the generated list and finalize it before shopping.",
      href: "/grocery-list",
      label: "Review draft grocery list"
    },
    finalized: {
      description: "The list is finalized and ready for the store.",
      href: "/grocery-list",
      label: "Start shopping"
    },
    shopping_started: {
      description: "Keep checking off items while shopping.",
      href: "/grocery-list",
      label: "Continue shopping"
    }
  };

  return actions[status];
}

function isWeeklyWrapUpPending(weeklyWrapUp?: DashboardWeeklyWrapUpSummary) {
  return (
    weeklyWrapUp !== null &&
    weeklyWrapUp !== undefined &&
    weeklyWrapUp.dismissed !== true &&
    weeklyWrapUp.status !== "completed" &&
    weeklyWrapUp.status !== "dismissed"
  );
}

export function formatDashboardStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
