export type PlanWeekSummaryItem = {
  estimated_calories: number | null;
  estimated_protein_grams: number | null;
  is_approved: boolean;
  is_locked: boolean;
  plan_date: string;
  recipe_id: string | null;
};

export type PlanWeekAttention = {
  description: string;
  label: string;
  tone: "attention" | "info" | "success";
};

export type PlanWeekSummary = {
  approvedItemCount: number;
  daysWithPlannedItems: number;
  emptyDayCount: number;
  lockedItemCount: number;
  missingEstimateItemCount: number;
  primaryAttention: PlanWeekAttention;
  readyForGroceryCount: number;
  selectedStapleCount: number;
  totalItemCount: number;
  unapprovedItemCount: number;
};

export function buildPlanWeekSummary({
  planItems,
  selectedStapleCount,
  weekDateKeys
}: {
  planItems: PlanWeekSummaryItem[];
  selectedStapleCount: number;
  weekDateKeys: string[];
}): PlanWeekSummary {
  const approvedItemCount = planItems.filter(
    (item) => item.is_approved && item.recipe_id
  ).length;
  const unapprovedItemCount = planItems.filter(
    (item) => !item.is_approved
  ).length;
  const lockedItemCount = planItems.filter((item) => item.is_locked).length;
  const missingEstimateItemCount = planItems.filter(
    (item) =>
      item.estimated_calories === null || item.estimated_protein_grams === null
  ).length;
  const plannedDateKeys = new Set(planItems.map((item) => item.plan_date));
  const readyForGroceryCount = approvedItemCount + selectedStapleCount;

  return {
    approvedItemCount,
    daysWithPlannedItems: plannedDateKeys.size,
    emptyDayCount: weekDateKeys.filter((dateKey) => !plannedDateKeys.has(dateKey))
      .length,
    lockedItemCount,
    missingEstimateItemCount,
    primaryAttention: getPrimaryAttention({
      missingEstimateItemCount,
      readyForGroceryCount,
      totalItemCount: planItems.length,
      unapprovedItemCount
    }),
    readyForGroceryCount,
    selectedStapleCount,
    totalItemCount: planItems.length,
    unapprovedItemCount
  };
}

function getPrimaryAttention({
  missingEstimateItemCount,
  readyForGroceryCount,
  totalItemCount,
  unapprovedItemCount
}: {
  missingEstimateItemCount: number;
  readyForGroceryCount: number;
  totalItemCount: number;
  unapprovedItemCount: number;
}): PlanWeekAttention {
  if (totalItemCount === 0 && readyForGroceryCount === 0) {
    return {
      description:
        "Start by adding recipes to the days and profiles that need coverage.",
      label: "Add meals to this week",
      tone: "attention"
    };
  }

  if (unapprovedItemCount > 0) {
    return {
      description: `Approve ${formatCount(unapprovedItemCount, "planned item")} before relying on it for groceries.`,
      label: "Review planned meals",
      tone: "attention"
    };
  }

  if (missingEstimateItemCount > 0) {
    return {
      description: `${formatCount(missingEstimateItemCount, "planned item")} ${missingEstimateItemCount === 1 ? "is" : "are"} missing calories or protein. Grocery generation can still continue.`,
      label: "Nutrition estimates need data",
      tone: "info"
    };
  }

  if (readyForGroceryCount > 0) {
    return {
      description:
        "Approved recipes or selected staples are ready for the grocery list.",
      label: "Ready for grocery generation",
      tone: "success"
    };
  }

  return {
    description: "Select a staple or approve a recipe before groceries.",
    label: "Review weekly plan",
    tone: "attention"
  };
}

function formatCount(count: number, singularLabel: string) {
  return `${count} ${singularLabel}${count === 1 ? "" : "s"}`;
}
