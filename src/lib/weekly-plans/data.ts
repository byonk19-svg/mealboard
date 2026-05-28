import { createClient } from "@/lib/supabase/server";
import type {
  WeeklyPlan,
  WeeklyPlanGoal,
  WeeklyPlanProfileDay
} from "@/lib/weekly-plans/types";

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
