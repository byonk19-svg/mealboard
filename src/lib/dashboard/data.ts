import { createClient } from "@/lib/supabase/server";
import {
  calculateCalorieTargetGuidance,
  summarizeCalorieTargetGuidance
} from "@/lib/nutrition/calculate-calorie-target-guidance";
import { calculateDailyNutritionTotals } from "@/lib/nutrition/calculate-daily-totals";
import {
  buildDashboardAttentionItems,
  getDashboardNextAction,
  type DashboardAttentionItem,
  type DashboardGroceryListSummary,
  type DashboardNextAction,
  type DashboardSetupSummary,
  type DashboardWeeklyPlanSummary
} from "./current-week-summary";
import type { GroceryListStatus } from "@/lib/grocery/data";
import type {
  CalorieStrictness,
  WeeklyPlanItem,
  WeeklyPlanProfileDay,
  WeeklyPlanStatus
} from "@/lib/weekly-plans/types";
import type { MealProfile } from "@/lib/settings/types";

export type DashboardCurrentWeekSnapshot = {
  attentionItems: DashboardAttentionItem[];
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
  setup: DashboardSetupSummary;
  weeklyPlan: (DashboardWeeklyPlanSummary & {
    id: string;
  }) | null;
};

type WeeklyPlanRow = {
  calorie_strictness: CalorieStrictness;
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

type SetupMealProfileRow = {
  baby_stage_override_months: number | null;
  birthdate: string | null;
  default_daily_calorie_target: number | null;
  id: string;
  off_day_calorie_target: number | null;
  profile_type: "adult" | "baby" | "shared" | "household";
  work_day_calorie_target: number | null;
};

type DashboardWeeklyPlanItemRow = Omit<
  WeeklyPlanItem,
  "meal_profile_name" | "meal_profile_type" | "recipe_name"
> & {
  meal_profiles:
    | { name: string; profile_type: WeeklyPlanItem["meal_profile_type"] }
    | Array<{ name: string; profile_type: WeeklyPlanItem["meal_profile_type"] }>
    | null;
  recipes: { name: string } | { name: string }[] | null;
};

type ApprovedRecipeApprovalRow = {
  recipe_id: string;
  recipes:
    | {
        estimated_calories_per_serving: number | null;
        estimated_protein_grams_per_serving: number | null;
        nutrition_confidence: "low" | "medium" | "high" | null;
      }
    | Array<{
        estimated_calories_per_serving: number | null;
        estimated_protein_grams_per_serving: number | null;
        nutrition_confidence: "low" | "medium" | "high" | null;
      }>
    | null;
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
  const setup = await getDashboardSetupSummary({
    calorieStrictness: weeklyPlan?.calorie_strictness ?? null,
    householdId,
    supabase,
    weeklyPlanId: weeklyPlan?.id ?? null
  });

  if (!weeklyPlan) {
    return {
      attentionItems: buildDashboardAttentionItems({
        groceryList: null,
        setup,
        weeklyPlan: null,
        weeklyWrapUp: null
      }),
      groceryList: null,
      nextAction: getDashboardNextAction({
        groceryList: null,
        weeklyPlan: null
      }),
      setup,
      weekStartDate,
      weeklyWrapUp: null,
      weeklyPlan: null
    };
  }

  const [
    approvedGroceryInputItemCount,
    selectedStapleCount,
    totalPlanItemCount,
    unapprovedPlanItemCount
  ] = await Promise.all([
      countApprovedGroceryInputItems({
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
    approvedGroceryInputItemCount,
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
    attentionItems: buildDashboardAttentionItems({
      groceryList,
      setup,
      weeklyPlan: weeklyPlanSummary,
      weeklyWrapUp,
      weeklyWrapUpHref: `/weekly-wrap-up/${weeklyPlan.id}`
    }),
    groceryList,
    nextAction: getDashboardNextAction({
      groceryList,
      weeklyPlan: weeklyPlanSummary,
      weeklyWrapUp,
      weeklyWrapUpHref: `/weekly-wrap-up/${weeklyPlan.id}`
    }),
    setup,
    weekStartDate,
    weeklyWrapUp,
    weeklyPlan: weeklyPlanSummary
  };
}

async function getDashboardSetupSummary({
  calorieStrictness,
  householdId,
  supabase,
  weeklyPlanId
}: {
  calorieStrictness: CalorieStrictness | null;
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string | null;
}): Promise<NonNullable<DashboardSetupSummary>> {
  const [
    recipeCount,
    approvedRecipeCount,
    lowConfidenceRecipeCount,
    profileRows,
    stapleCount
  ] = await Promise.all([
    countRecipes({ householdId, supabase }),
    countRecipesApprovedForPlanning({ householdId, supabase }),
    countLowConfidenceRecipesApprovedForPlanning({ householdId, supabase }),
    getSetupMealProfiles({ householdId, supabase }),
    countActiveStaples({ householdId, supabase })
  ]);
  const adultProfiles = profileRows.filter(
    (profile) => profile.profile_type === "adult"
  );
  const babyProfile =
    profileRows.find((profile) => profile.profile_type === "baby") ?? null;
  const babyFoodStatusCount = babyProfile
    ? await countBabyFoodStatuses({
        babyProfileId: babyProfile.id,
        householdId,
        supabase
      })
    : 0;
  const nutritionGuidance = weeklyPlanId
    ? await getCurrentWeekNutritionGuidanceSummary({
        calorieStrictness,
        householdId,
        profileRows,
        supabase,
        weeklyPlanId
      })
    : {
        guidanceOnlyCount: 0,
        nearCount: 0,
        overCount: 0,
        underCount: 0,
        unknownCount: 0
      };

  return {
    adultProfileCount: adultProfiles.length,
    adultProfilesMissingCalorieTargets: adultProfiles.filter(
      (profile) =>
        profile.default_daily_calorie_target === null &&
        profile.work_day_calorie_target === null &&
        profile.off_day_calorie_target === null
    ).length,
    approvedRecipeCount,
    babyFoodStatusCount,
    babyProfileReady:
      babyProfile !== null &&
      (babyProfile.birthdate !== null ||
        babyProfile.baby_stage_override_months !== null),
    calorieGuidanceOverDayCount: nutritionGuidance.overCount,
    calorieGuidanceUnderDayCount: nutritionGuidance.underCount,
    calorieGuidanceUnknownDayCount: nutritionGuidance.unknownCount,
    lowConfidenceRecipeCount,
    recipeCount,
    stapleCount
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
    .select("id, status, calorie_strictness")
    .eq("household_id", householdId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WeeklyPlanRow | null;
}

async function getCurrentWeekNutritionGuidanceSummary({
  calorieStrictness,
  householdId,
  profileRows,
  supabase,
  weeklyPlanId
}: {
  calorieStrictness: CalorieStrictness | null;
  householdId: string;
  profileRows: SetupMealProfileRow[];
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  if (!calorieStrictness) {
    return {
      guidanceOnlyCount: 0,
      nearCount: 0,
      overCount: 0,
      underCount: 0,
      unknownCount: 0
    };
  }

  const [planItems, profileDays] = await Promise.all([
    getDashboardWeeklyPlanItems({ householdId, supabase, weeklyPlanId }),
    getDashboardWeeklyPlanProfileDays({ householdId, supabase, weeklyPlanId })
  ]);
  const summaries = calculateDailyNutritionTotals(planItems);
  const guidance = calculateCalorieTargetGuidance({
    profileDays,
    profiles: profileRows.map(toMealProfile),
    strictness: calorieStrictness,
    summaries
  });

  return summarizeCalorieTargetGuidance(guidance);
}

async function getDashboardWeeklyPlanItems({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { data, error } = await supabase
    .from("weekly_plan_items")
    .select(
      "id, weekly_plan_id, meal_profile_id, plan_date, meal_type, component_type, baby_plan_slot, food_id, recipe_id, display_name, scale_factor, is_locked, is_approved, is_try_this, is_backup, reason_labels, why_this, notes, estimated_calories, estimated_protein_grams, sort_order, meal_profiles(name, profile_type), recipes(name)"
    )
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DashboardWeeklyPlanItemRow[]).map((row) => {
    const profile = getJoinedValue(row.meal_profiles);

    return {
      ...row,
      meal_profile_name: profile?.name ?? null,
      meal_profile_type: profile?.profile_type ?? null,
      recipe_name: getJoinedValue(row.recipes)?.name ?? null,
      scale_factor:
        typeof row.scale_factor === "number"
          ? row.scale_factor
          : Number(row.scale_factor ?? 1)
    } satisfies WeeklyPlanItem;
  });
}

async function getDashboardWeeklyPlanProfileDays({
  householdId,
  supabase,
  weeklyPlanId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
}) {
  const { data, error } = await supabase
    .from("weekly_plan_profile_days")
    .select(
      "id, weekly_plan_id, meal_profile_id, plan_date, adult_day_type, day_label"
    )
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WeeklyPlanProfileDay[];
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

async function countApprovedGroceryInputItems({
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
    .or("recipe_id.not.is.null,food_id.not.is.null");

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

async function countRecipes({
  householdId,
  supabase
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { count, error } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countRecipesApprovedForPlanning({
  householdId,
  supabase
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data, error } = await supabase
    .from("recipe_profile_approvals")
    .select("recipe_id, recipes!inner(archived_at)")
    .eq("household_id", householdId)
    .eq("approved_for_planning", true)
    .is("recipes.archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    ((data ?? []) as Array<{ recipe_id: string }>).map(
      (approval) => approval.recipe_id
    )
  ).size;
}

async function countLowConfidenceRecipesApprovedForPlanning({
  householdId,
  supabase
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data, error } = await supabase
    .from("recipe_profile_approvals")
    .select(
      "recipe_id, recipes!inner(archived_at, estimated_calories_per_serving, estimated_protein_grams_per_serving, nutrition_confidence)"
    )
    .eq("household_id", householdId)
    .eq("approved_for_planning", true)
    .is("recipes.archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const recipeIds = new Set<string>();

  for (const approval of (data ?? []) as ApprovedRecipeApprovalRow[]) {
    const recipe = getJoinedValue(approval.recipes);

    if (
      recipe &&
      (recipe.estimated_calories_per_serving === null ||
        recipe.estimated_protein_grams_per_serving === null ||
        recipe.nutrition_confidence === null ||
        recipe.nutrition_confidence === "low")
    ) {
      recipeIds.add(approval.recipe_id);
    }
  }

  return recipeIds.size;
}

async function getSetupMealProfiles({
  householdId,
  supabase
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data, error } = await supabase
    .from("meal_profiles")
    .select(
      "id, profile_type, birthdate, baby_stage_override_months, default_daily_calorie_target, work_day_calorie_target, off_day_calorie_target"
    )
    .eq("household_id", householdId)
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SetupMealProfileRow[];
}

async function countBabyFoodStatuses({
  babyProfileId,
  householdId,
  supabase
}: {
  babyProfileId: string;
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { count, error } = await supabase
    .from("baby_food_statuses")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("baby_profile_id", babyProfileId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countActiveStaples({
  householdId,
  supabase
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { count, error } = await supabase
    .from("staples")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function getJoinedValue<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toMealProfile(row: SetupMealProfileRow): MealProfile {
  return {
    baby_stage_override_months: row.baby_stage_override_months,
    birthdate: row.birthdate,
    color_label: null,
    default_daily_calorie_target: row.default_daily_calorie_target,
    household_id: "",
    id: row.id,
    name: "",
    notes: null,
    off_day_calorie_target: row.off_day_calorie_target,
    profile_type: row.profile_type,
    sort_order: 0,
    work_day_calorie_target: row.work_day_calorie_target
  };
}
