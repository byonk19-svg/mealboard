import { createClient } from "@/lib/supabase/server";
import {
  getDashboardNextAction,
  type DashboardGroceryListSummary,
  type DashboardNextAction,
  type DashboardWeeklyPlanSummary
} from "./current-week-summary";
import type { GroceryListStatus } from "@/lib/grocery/data";
import type { WeeklyPlanStatus } from "@/lib/weekly-plans/types";

export type DashboardCurrentWeekSnapshot = {
  groceryList: (DashboardGroceryListSummary & {
    generatedAt: string | null;
    id: string;
    name: string | null;
  }) | null;
  nextAction: DashboardNextAction;
  weekStartDate: string;
  weeklyWrapUp: {
    dismissed: boolean;
    id: string;
    status: "open" | "dismissed" | "completed";
  } | null;
  weeklyPlan: (DashboardWeeklyPlanSummary & {
    id: string;
  }) | null;
};

type WeeklyPlanRow = {
  id: string;
  status: WeeklyPlanStatus;
};

type GroceryListRow = {
  generated_at: string | null;
  id: string;
  name: string | null;
  status: GroceryListStatus;
};

type GroceryListItemRow = {
  checked: boolean;
};

type WeeklyWrapUpRow = {
  dismissed: boolean;
  id: string;
  status: "open" | "dismissed" | "completed";
};

export async function getDashboardCurrentWeekSnapshot({
  householdId,
  weekStartDate
}: {
  householdId: string;
  weekStartDate: string;
}): Promise<DashboardCurrentWeekSnapshot> {
  const supabase = await createClient();
  const weeklyPlan = await getCurrentWeeklyPlan({
    householdId,
    supabase,
    weekStartDate
  });

  if (!weeklyPlan) {
    return {
      groceryList: null,
      nextAction: getDashboardNextAction({
        groceryList: null,
        weeklyPlan: null
      }),
      weekStartDate,
      weeklyWrapUp: null,
      weeklyPlan: null
    };
  }

  const [
    approvedRecipeItemCount,
    selectedStapleCount,
    totalPlanItemCount,
    unapprovedPlanItemCount
  ] = await Promise.all([
      countApprovedRecipeItems({
        householdId,
        supabase,
        weeklyPlanId: weeklyPlan.id
      }),
      countSelectedStaples({
        householdId,
        supabase,
        weeklyPlanId: weeklyPlan.id
      }),
      countWeeklyPlanItems({
        householdId,
        supabase,
        weeklyPlanId: weeklyPlan.id
      }),
      countUnapprovedPlanItems({
        householdId,
        supabase,
        weeklyPlanId: weeklyPlan.id
      })
    ]);
  const weeklyPlanSummary = {
    approvedRecipeItemCount,
    id: weeklyPlan.id,
    selectedStapleCount,
    status: weeklyPlan.status,
    totalPlanItemCount,
    unapprovedPlanItemCount
  };
  const groceryList = await getCurrentWeekGroceryListSummary({
    householdId,
    supabase,
    weeklyPlanId: weeklyPlan.id
  });
  const weeklyWrapUp = await getCurrentWeekWrapUpSummary({
    householdId,
    supabase,
    weeklyPlanId: weeklyPlan.id
  });

  return {
    groceryList,
    nextAction: getDashboardNextAction({
      groceryList,
      weeklyPlan: weeklyPlanSummary
    }),
    weekStartDate,
    weeklyWrapUp,
    weeklyPlan: weeklyPlanSummary
  };
}

async function getCurrentWeeklyPlan({
  householdId,
  supabase,
  weekStartDate
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weekStartDate: string;
}) {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("id, status")
    .eq("household_id", householdId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WeeklyPlanRow | null;
}

async function countWeeklyPlanItems({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { count, error } = await supabase
    .from("weekly_plan_items")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countApprovedRecipeItems({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { count, error } = await supabase
    .from("weekly_plan_items")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .eq("is_approved", true)
    .not("recipe_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countUnapprovedPlanItems({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { count, error } = await supabase
    .from("weekly_plan_items")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .eq("is_approved", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countSelectedStaples({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { count, error } = await supabase
    .from("weekly_plan_staples")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getCurrentWeekGroceryListSummary({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("id, name, status, generated_at")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const groceryList = data as GroceryListRow;
  const { data: itemRows, error: itemError } = await supabase
    .from("grocery_list_items")
    .select("checked")
    .eq("household_id", householdId)
    .eq("grocery_list_id", groceryList.id);

  if (itemError) {
    throw new Error(itemError.message);
  }

  const items = (itemRows ?? []) as GroceryListItemRow[];

  return {
    checkedItemCount: items.filter((item) => item.checked).length,
    generatedAt: groceryList.generated_at,
    id: groceryList.id,
    itemCount: items.length,
    name: groceryList.name,
    status: groceryList.status
  };
}

async function getCurrentWeekWrapUpSummary({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { data, error } = await supabase
    .from("weekly_wrap_ups")
    .select("id, status, dismissed")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WeeklyWrapUpRow | null;
}
