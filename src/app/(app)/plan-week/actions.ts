"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import { getWeekStartDate } from "@/lib/weekly-plans/week-dates";
import {
  adultDayTypes,
  weeklyGoalTypes,
  type AdultDayType,
  type WeeklyGoalType
} from "@/lib/weekly-plans/types";

type DayTypeInput = {
  adult_day_type: AdultDayType | null;
  day_label: string;
  household_id: string;
  meal_profile_id: string;
  plan_date: string;
  weekly_plan_id: string;
};

function planWeekRedirect(weekStartDate: string, message: string): never {
  redirect(
    `/plan-week?weekStartDate=${encodeURIComponent(weekStartDate)}&message=${encodeURIComponent(message)}`
  );
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

async function requireHousehold(weekStartDate: string) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    planWeekRedirect(weekStartDate, "Link your user to a household first.");
  }

  return householdContext.household;
}

export async function createOrSelectWeeklyPlan(formData: FormData) {
  const requestedDate = textOrNull(formData.get("weekStartDate"));
  const weekStartDate = getWeekStartDate(requestedDate ?? new Date());
  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();

  const { error } = await supabase.from("weekly_plans").upsert(
    {
      household_id: household.id,
      week_start_date: weekStartDate
    },
    { onConflict: "household_id,week_start_date" }
  );

  if (error) {
    planWeekRedirect(weekStartDate, error.message);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(weekStartDate, "Planning week ready.");
}

export async function saveWeeklyPlanSetup(formData: FormData) {
  const weekStartDate = textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));

  if (!weeklyPlanId) {
    planWeekRedirect(weekStartDate, "Create the planning week before saving.");
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const dayInputs = parseDayTypeInputs(formData, household.id, weeklyPlanId);
  const selectedGoals = parseWeeklyGoals(formData);

  if (dayInputs.length > 0) {
    const { error } = await supabase.from("weekly_plan_profile_days").upsert(
      dayInputs,
      {
        onConflict: "weekly_plan_id,meal_profile_id,plan_date"
      }
    );

    if (error) {
      planWeekRedirect(weekStartDate, error.message);
    }
  }

  const { error: deleteGoalError } = await supabase
    .from("weekly_plan_goals")
    .delete()
    .eq("household_id", household.id)
    .eq("weekly_plan_id", weeklyPlanId)
    .is("meal_profile_id", null);

  if (deleteGoalError) {
    planWeekRedirect(weekStartDate, deleteGoalError.message);
  }

  if (selectedGoals.length > 0) {
    const { error } = await supabase.from("weekly_plan_goals").insert(
      selectedGoals.map((goal) => ({
        goal,
        household_id: household.id,
        weekly_plan_id: weeklyPlanId
      }))
    );

    if (error) {
      planWeekRedirect(weekStartDate, error.message);
    }
  }

  revalidatePath("/plan-week");
  planWeekRedirect(weekStartDate, "Weekly planning setup saved.");
}

function parseDayTypeInputs(
  formData: FormData,
  householdId: string,
  weeklyPlanId: string
): DayTypeInput[] {
  return Array.from(formData.entries())
    .filter(([key]) => key.startsWith("adultDayType:"))
    .map(([key, value]) => {
      const [, mealProfileId, planDate, dayLabel] = key.split(":");
      const dayType = textOrNull(value);

      if (!mealProfileId || !planDate || !dayLabel) {
        return null;
      }

      return {
        adult_day_type: isAdultDayType(dayType) ? dayType : null,
        day_label: dayLabel,
        household_id: householdId,
        meal_profile_id: mealProfileId,
        plan_date: planDate,
        weekly_plan_id: weeklyPlanId
      };
    })
    .filter((input): input is DayTypeInput => input !== null);
}

function parseWeeklyGoals(formData: FormData): WeeklyGoalType[] {
  return formData
    .getAll("weeklyGoals")
    .map((goal) => String(goal))
    .filter(isWeeklyGoalType);
}

function isAdultDayType(value: string | null): value is AdultDayType {
  return value !== null && adultDayTypes.includes(value as AdultDayType);
}

function isWeeklyGoalType(value: string): value is WeeklyGoalType {
  return weeklyGoalTypes.includes(value as WeeklyGoalType);
}
