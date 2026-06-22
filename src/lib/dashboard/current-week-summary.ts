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

export type DashboardAttentionItem = {
  description: string;
  href: string;
  id: string;
  label: string;
};

export function buildDashboardAttentionItems({
  groceryList,
  weeklyPlan,
  weeklyWrapUp,
  weeklyWrapUpHref
}: {
  groceryList: DashboardGroceryListSummary | null;
  weeklyPlan: DashboardWeeklyPlanSummary | null;
  weeklyWrapUp: DashboardWeeklyWrapUpSummary;
  weeklyWrapUpHref?: string;
}): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];

  if (!weeklyPlan) {
    return [
      {
        description: "Create this week before adding meals, staples, or groceries.",
        href: "/plan-week",
        id: "start-plan",
        label: "Start this week's plan"
      }
    ];
  }

  if (weeklyPlan.totalPlanItemCount === 0 && weeklyPlan.selectedStapleCount === 0) {
    items.push({
      description: "Add saved recipes or select staples before generating groceries.",
      href: "/plan-week",
      id: "empty-plan",
      label: "Add meals or staples"
    });
  }

  if (weeklyPlan.unapprovedPlanItemCount > 0) {
    items.push({
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
      description: "Approve at least one recipe or staple so grocery generation has inputs.",
      href: "/plan-week",
      id: "no-grocery-inputs",
      label: "Prepare grocery inputs"
    });
  }

  if (groceryList?.status === "draft") {
    items.push({
      description: "Review the generated list and finalize it before shopping.",
      href: "/grocery-list",
      id: "draft-grocery-list",
      label: "Finalize grocery list"
    });
  }

  if (groceryList?.status === "finalized") {
    items.push({
      description: "Start shopping when you are ready to check items off.",
      href: "/grocery-list",
      id: "finalized-grocery-list",
      label: "Start shopping"
    });
  }

  if (groceryList?.status === "shopping_started") {
    items.push({
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
      description: "Capture made/skipped meals, leftovers, and unused grocery notes.",
      href: weeklyWrapUpHref ?? "/dashboard",
      id: "weekly-wrap-up",
      label: "Review this week"
    });
  }

  return items;
}

export function getDashboardNextAction({
  groceryList,
  weeklyPlan
}: {
  groceryList: DashboardGroceryListSummary | null;
  weeklyPlan: DashboardWeeklyPlanSummary | null;
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
      weeklyPlan
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
  weeklyPlan
}: {
  status: GroceryListStatus;
  weeklyPlan: DashboardWeeklyPlanSummary;
}): DashboardNextAction {
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

export function formatDashboardStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
