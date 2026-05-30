import type { GroceryListStatus } from "@/lib/grocery/data";
import type { WeeklyPlanStatus } from "@/lib/weekly-plans/types";

export type DashboardWeeklyPlanSummary = {
  approvedRecipeItemCount: number;
  selectedStapleCount: number;
  status: WeeklyPlanStatus;
  totalPlanItemCount: number;
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
    return getGroceryListNextAction(groceryList.status);
  }

  if (
    weeklyPlan.approvedRecipeItemCount > 0 ||
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

function getGroceryListNextAction(
  status: GroceryListStatus
): DashboardNextAction {
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
