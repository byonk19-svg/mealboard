import { createClient } from "@/lib/supabase/server";
import type {
  PlanRecipeOption,
  WeeklyPlan,
  WeeklyPlanGoal,
  WeeklyPlanItem,
  WeeklyPlanProfileDay,
  WeeklyPlanStapleSelection
} from "@/lib/weekly-plans/types";

type WeeklyPlanItemRow = Omit<
  WeeklyPlanItem,
  "meal_profile_name" | "meal_profile_type" | "recipe_name"
> & {
  meal_profiles:
    | { name: string; profile_type: WeeklyPlanItem["meal_profile_type"] }
    | Array<{ name: string; profile_type: WeeklyPlanItem["meal_profile_type"] }>
    | null;
  recipes: { name: string } | { name: string }[] | null;
};

export async function getWeeklyPlan(
  householdId: string,
  weekStartDate: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("id, household_id, week_start_date, status, calorie_strictness, notes")
    .eq("household_id", householdId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WeeklyPlan | null;
}

export async function getWeeklyPlanProfileDays(
  householdId: string,
  weeklyPlanId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_plan_profile_days")
    .select(
      "id, weekly_plan_id, meal_profile_id, plan_date, adult_day_type, day_label"
    )
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .order("plan_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WeeklyPlanProfileDay[];
}

export async function getWeeklyPlanGoals(
  householdId: string,
  weeklyPlanId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_plan_goals")
    .select("id, weekly_plan_id, meal_profile_id, goal")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .is("meal_profile_id", null)
    .order("goal", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WeeklyPlanGoal[];
}

export async function getWeeklyPlanStapleSelections(
  householdId: string,
  weeklyPlanId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_plan_staples")
    .select("id, weekly_plan_id, staple_id")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WeeklyPlanStapleSelection[];
}

export async function getWeeklyPlanItems(
  householdId: string,
  weeklyPlanId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_plan_items")
    .select(
      "id, weekly_plan_id, meal_profile_id, plan_date, meal_type, component_type, recipe_id, display_name, scale_factor, is_locked, is_approved, is_try_this, is_backup, reason_labels, why_this, notes, estimated_calories, estimated_protein_grams, sort_order, meal_profiles(name, profile_type), recipes(name)"
    )
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .order("plan_date", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WeeklyPlanItemRow[]).map((row) => {
    const profile = getJoinedValue(row.meal_profiles);

    return {
      id: row.id,
      weekly_plan_id: row.weekly_plan_id,
      meal_profile_id: row.meal_profile_id,
      meal_profile_name: profile?.name ?? null,
      meal_profile_type: profile?.profile_type ?? null,
      plan_date: row.plan_date,
      meal_type: row.meal_type,
      component_type: row.component_type,
      recipe_id: row.recipe_id,
      recipe_name: getJoinedValue(row.recipes)?.name ?? null,
      display_name: row.display_name,
      scale_factor: row.scale_factor,
      is_locked: row.is_locked,
      is_approved: row.is_approved,
      is_try_this: row.is_try_this,
      is_backup: row.is_backup,
      reason_labels: row.reason_labels ?? [],
      why_this: row.why_this,
      notes: row.notes,
      estimated_calories: row.estimated_calories,
      estimated_protein_grams: row.estimated_protein_grams,
      sort_order: row.sort_order
    };
  });
}

export async function getPlanRecipeOptions(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, name, meal_type, status, estimated_calories_per_serving, estimated_protein_grams_per_serving"
    )
    .eq("household_id", householdId)
    .is("archived_at", null)
    .neq("status", "retired")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PlanRecipeOption[];
}

function getJoinedValue<T>(value: T | T[] | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
