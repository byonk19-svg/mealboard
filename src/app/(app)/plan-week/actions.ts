"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mealTypes, type MealType } from "@/lib/recipes/types";
import { buildBabyRoutineWeekItems } from "@/lib/baby/build-baby-routine-week-items";
import { generateBabyMeals } from "@/lib/baby/generate-baby-meals";
import { getRecipes } from "@/lib/recipes/data";
import {
  buildRuleBasedMealSuggestions,
  buildRuleBasedSwapSuggestions
} from "@/lib/meal-planning/rule-based-suggestions";
import { getPantryUseSoonSignals } from "@/lib/pantry/data";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import { getBabyFoodStatuses, getMealProfiles } from "@/lib/settings/data";
import { getBabyProfile } from "@/lib/settings/baby-settings";
import {
  getWeeklyPlanGoals,
  getWeeklyPlanItems,
  getWeeklyPlanProfileDays
} from "@/lib/weekly-plans/data";
import { getRecipeReviewSignals } from "@/lib/weekly-wrap-up/data";
import {
  getWeekDates,
  getWeekStartDate
} from "@/lib/weekly-plans/week-dates";
import {
  adultDayTypes,
  type MealComponentType,
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

function planWeekRedirect(
  weekStartDate: string,
  message: string,
  view?: string | null
): never {
  const params = new URLSearchParams({
    message,
    weekStartDate
  });

  if (view === "profile") {
    params.set("view", "profile");
  }

  redirect(`/plan-week?${params.toString()}`);
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

export async function saveWeeklyPlanStaples(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));

  if (!weeklyPlanId) {
    planWeekRedirect(weekStartDate, "Create the planning week before saving staples.");
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const weeklyPlan = await getScopedWeeklyPlan(
    supabase,
    household.id,
    weeklyPlanId
  );

  if (!weeklyPlan) {
    planWeekRedirect(weekStartDate, "That planning week is no longer available.");
  }

  const selectedStapleIds = parseSelectedStapleIds(formData);
  const scopedStapleIds = await getScopedActiveStapleIds(
    supabase,
    household.id,
    selectedStapleIds
  );

  if (scopedStapleIds.length !== selectedStapleIds.length) {
    planWeekRedirect(weekStartDate, "One selected staple is no longer available.");
  }

  if (scopedStapleIds.length > 0) {
    const { error } = await supabase.from("weekly_plan_staples").upsert(
      scopedStapleIds.map((stapleId) => ({
        household_id: household.id,
        staple_id: stapleId,
        weekly_plan_id: weeklyPlan.id
      })),
      { onConflict: "weekly_plan_id,staple_id" }
    );

    if (error) {
      planWeekRedirect(weekStartDate, error.message);
    }
  }

  let deleteQuery = supabase
    .from("weekly_plan_staples")
    .delete()
    .eq("household_id", household.id)
    .eq("weekly_plan_id", weeklyPlan.id);

  if (scopedStapleIds.length > 0) {
    deleteQuery = deleteQuery.not(
      "staple_id",
      "in",
      `(${scopedStapleIds.join(",")})`
    );
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    planWeekRedirect(weekStartDate, deleteError.message);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(weekStartDate, "Weekly staples saved.");
}

export async function addWeeklyPlanItem(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));
  const planDate = textOrNull(formData.get("planDate"));
  const mealProfileId = textOrNull(formData.get("mealProfileId"));
  const recipeId = textOrNull(formData.get("recipeId"));
  const requestedMealType = textOrNull(formData.get("mealType"));
  const mealType = isMealType(requestedMealType) ? requestedMealType : null;

  if (!weeklyPlanId || !planDate || !mealProfileId || !recipeId || !mealType) {
    planWeekRedirect(weekStartDate, "Choose a recipe, profile, and meal slot.");
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();

  const [weeklyPlan, profile, recipe] = await Promise.all([
    getScopedWeeklyPlan(supabase, household.id, weeklyPlanId),
    getScopedMealProfile(supabase, household.id, mealProfileId),
    getScopedRecipe(supabase, household.id, recipeId)
  ]);

  if (!weeklyPlan || !profile || !recipe) {
    planWeekRedirect(weekStartDate, "That recipe or plan is no longer available.");
  }

  const { error } = await supabase.from("weekly_plan_items").insert({
    component_type: getComponentTypeForMeal(mealType),
    display_name: recipe.name,
    estimated_calories: recipe.estimated_calories_per_serving,
    estimated_protein_grams: recipe.estimated_protein_grams_per_serving,
    household_id: household.id,
    meal_profile_id: profile.id,
    meal_type: mealType,
    plan_date: planDate,
    recipe_id: recipe.id,
    scale_factor: 1,
    weekly_plan_id: weeklyPlan.id
  });

  if (error) {
    planWeekRedirect(weekStartDate, error.message);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(weekStartDate, "Recipe added to the week. Review it in Manual plan below.");
}

export async function approveWeeklyPlanItem(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const itemId = textOrNull(formData.get("weeklyPlanItemId"));
  const view = textOrNull(formData.get("view"));

  if (!itemId) {
    planWeekRedirect(weekStartDate, "Choose a plan item first.", view);
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_plan_items")
    .update({ is_approved: true })
    .eq("household_id", household.id)
    .eq("id", itemId);

  if (error) {
    planWeekRedirect(weekStartDate, error.message, view);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(weekStartDate, "Plan item approved.", view);
}

export async function toggleWeeklyPlanItemLock(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const itemId = textOrNull(formData.get("weeklyPlanItemId"));
  const view = textOrNull(formData.get("view"));

  if (!itemId) {
    planWeekRedirect(weekStartDate, "Choose a plan item first.", view);
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const { data, error: readError } = await supabase
    .from("weekly_plan_items")
    .select("is_locked")
    .eq("household_id", household.id)
    .eq("id", itemId)
    .maybeSingle();

  if (readError) {
    planWeekRedirect(weekStartDate, readError.message, view);
  }

  if (!data) {
    planWeekRedirect(weekStartDate, "That plan item is no longer available.", view);
  }

  const { error } = await supabase
    .from("weekly_plan_items")
    .update({ is_locked: !data.is_locked })
    .eq("household_id", household.id)
    .eq("id", itemId);

  if (error) {
    planWeekRedirect(weekStartDate, error.message, view);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(
    weekStartDate,
    data.is_locked ? "Plan item unlocked." : "Plan item locked.",
    view
  );
}

export async function removeWeeklyPlanItem(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const itemId = textOrNull(formData.get("weeklyPlanItemId"));
  const view = textOrNull(formData.get("view"));

  if (!itemId) {
    planWeekRedirect(weekStartDate, "Choose a plan item first.", view);
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_plan_items")
    .delete()
    .eq("household_id", household.id)
    .eq("id", itemId);

  if (error) {
    planWeekRedirect(weekStartDate, error.message, view);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(weekStartDate, "Plan item removed.", view);
}

export async function confirmWeeklyPlanItemSwap(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const itemId = textOrNull(formData.get("weeklyPlanItemId"));
  const recipeId = textOrNull(formData.get("recipeId"));
  const view = textOrNull(formData.get("view"));

  if (!itemId || !recipeId) {
    planWeekRedirect(weekStartDate, "Choose a meal and swap recipe first.", view);
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const { data: itemRow, error: itemError } = await supabase
    .from("weekly_plan_items")
    .select("id, weekly_plan_id")
    .eq("household_id", household.id)
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) {
    planWeekRedirect(weekStartDate, itemError.message, view);
  }

  if (!itemRow) {
    planWeekRedirect(weekStartDate, "That meal is no longer in the plan.", view);
  }

  const [
    profileDays,
    goals,
    planItems,
    recipes,
    pantryUseSoonSignals,
    reviewSignals
  ] = await Promise.all([
    getWeeklyPlanProfileDays(household.id, itemRow.weekly_plan_id),
    getWeeklyPlanGoals(household.id, itemRow.weekly_plan_id),
    getWeeklyPlanItems(household.id, itemRow.weekly_plan_id),
    getRecipes(household.id),
    getPantryUseSoonSignals({ householdId: household.id }),
    getRecipeReviewSignals(household.id)
  ]);
  const targetItem = planItems.find((item) => item.id === itemId);

  if (!targetItem) {
    planWeekRedirect(weekStartDate, "That meal is no longer in the plan.", view);
  }

  const selectedSuggestion = buildRuleBasedSwapSuggestions({
    goals: goals.map((goal) => goal.goal),
    pantryUseSoonSignals,
    planItems,
    profileDays,
    recipes,
    reviewSignals,
    targetItem
  }).find((suggestion) => suggestion.recipeId === recipeId);

  if (!selectedSuggestion) {
    planWeekRedirect(
      weekStartDate,
      targetItem.is_locked
        ? "Unlock this meal before swapping it."
        : "That swap is no longer available.",
      view
    );
  }

  if (!targetItem.recipe_id) {
    planWeekRedirect(
      weekStartDate,
      "Only planned recipes can be swapped.",
      view
    );
  }

  const currentRecipeId = targetItem.recipe_id;
  const { data: updatedItem, error } = await supabase
    .from("weekly_plan_items")
    .update({
      display_name: selectedSuggestion.recipeName,
      estimated_calories: selectedSuggestion.estimatedCalories,
      estimated_protein_grams: selectedSuggestion.estimatedProteinGrams,
      reason_labels: selectedSuggestion.reasonLabels,
      recipe_id: selectedSuggestion.recipeId,
      why_this: selectedSuggestion.whyThis
    })
    .eq("household_id", household.id)
    .eq("id", targetItem.id)
    .eq("is_locked", false)
    .eq("recipe_id", currentRecipeId)
    .select("id")
    .maybeSingle();

  if (error) {
    planWeekRedirect(weekStartDate, error.message, view);
  }

  if (!updatedItem) {
    planWeekRedirect(
      weekStartDate,
      "That meal changed while you were swapping it. Reload and try again.",
      view
    );
  }

  revalidatePath("/plan-week");
  planWeekRedirect(
    weekStartDate,
    "Meal swapped. Review groceries before regenerating.",
    view
  );
}

export async function applyBabyRoutineToWeek(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));

  if (!weeklyPlanId) {
    planWeekRedirect(weekStartDate, "Create the planning week before adding baby meals.");
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const [weeklyPlan, profiles] = await Promise.all([
    getScopedWeeklyPlan(supabase, household.id, weeklyPlanId),
    getMealProfiles(household.id)
  ]);

  if (!weeklyPlan) {
    planWeekRedirect(weekStartDate, "That planning week is no longer available.");
  }

  const babyProfile = getBabyProfile(profiles);

  if (!babyProfile) {
    planWeekRedirect(weekStartDate, "Add a Baby profile before applying baby meals.");
  }

  const [babyFoodStatuses, existingRows] = await Promise.all([
    getBabyFoodStatuses(household.id, babyProfile.id),
    getExistingBabyRoutineRows({
      householdId: household.id,
      supabase,
      weeklyPlanId: weeklyPlan.id
    })
  ]);
  const routine = generateBabyMeals(babyFoodStatuses);
  const weekItems = buildBabyRoutineWeekItems({
    existingItems: existingRows,
    routine,
    weekDateKeys: getWeekDates(weekStartDate).map((date) => date.dateKey)
  });

  if (weekItems.length === 0) {
    planWeekRedirect(
      weekStartDate,
      "Add tried or liked baby foods before applying baby meals."
    );
  }

  const { error } = await supabase.rpc("replace_weekly_plan_baby_routine_items", {
    p_baby_profile_id: babyProfile.id,
    p_household_id: household.id,
    p_items: weekItems.map((item, index) => ({
      baby_plan_slot: item.babyPlanSlot,
      display_name: item.displayName,
      food_id: item.foodId,
      notes: item.notes,
      plan_date: item.planDate,
      reason_labels: item.reasonLabels,
      sort_order: 200 + index,
      why_this: item.whyThis
    })),
    p_weekly_plan_id: weeklyPlan.id
  });

  if (error) {
    planWeekRedirect(weekStartDate, error.message);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(weekStartDate, "Baby routine added to the week for review.");
}

export async function addRuleBasedMealSuggestions(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));

  if (!weeklyPlanId) {
    planWeekRedirect(weekStartDate, "Create the planning week before adding suggestions.");
  }

  const household = await requireHousehold(weekStartDate);
  const supabase = await createClient();
  const weeklyPlan = await getScopedWeeklyPlan(
    supabase,
    household.id,
    weeklyPlanId
  );

  if (!weeklyPlan) {
    planWeekRedirect(weekStartDate, "That planning week is no longer available.");
  }

  const [
    profiles,
    profileDays,
    goals,
    planItems,
    pantryUseSoonSignals,
    recipes,
    reviewSignals
  ] = await Promise.all([
    getMealProfiles(household.id),
    getWeeklyPlanProfileDays(household.id, weeklyPlan.id),
    getWeeklyPlanGoals(household.id, weeklyPlan.id),
    getWeeklyPlanItems(household.id, weeklyPlan.id),
    getPantryUseSoonSignals({ householdId: household.id }),
    getRecipes(household.id),
    getRecipeReviewSignals(household.id)
  ]);
  const suggestions = buildRuleBasedMealSuggestions({
    goals: goals.map((goal) => goal.goal),
    planItems,
    pantryUseSoonSignals,
    profileDays,
    profiles,
    recipes,
    reviewSignals,
    weekDateKeys: getWeekDates(weekStartDate).map((date) => date.dateKey)
  });

  if (suggestions.length === 0) {
    planWeekRedirect(
      weekStartDate,
      "No open adult meal slots have approved recipe suggestions right now."
    );
  }

  const { error } = await supabase.from("weekly_plan_items").insert(
    suggestions.map((suggestion, index) => ({
      component_type: getComponentTypeForMeal(suggestion.mealType),
      display_name: suggestion.recipeName,
      estimated_calories: suggestion.estimatedCalories,
      estimated_protein_grams: suggestion.estimatedProteinGrams,
      household_id: household.id,
      is_approved: false,
      is_locked: false,
      meal_profile_id: suggestion.mealProfileId,
      meal_type: suggestion.mealType,
      notes: suggestion.notes,
      plan_date: suggestion.planDate,
      reason_labels: suggestion.reasonLabels,
      recipe_id: suggestion.recipeId,
      scale_factor: 1,
      sort_order: 100 + index,
      weekly_plan_id: weeklyPlan.id,
      why_this: suggestion.reasonLabels.join(", ")
    }))
  );

  if (error) {
    planWeekRedirect(weekStartDate, error.message);
  }

  revalidatePath("/plan-week");
  planWeekRedirect(
    weekStartDate,
    `Added ${suggestions.length} rule-based meal ${suggestions.length === 1 ? "suggestion" : "suggestions"}. Review ${suggestions.length === 1 ? "it" : "them"} in Manual plan below.`
  );
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

function parseSelectedStapleIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("stapleIds")
        .map((stapleId) => String(stapleId).trim())
        .filter((stapleId) => stapleId.length > 0)
    )
  );
}

function isAdultDayType(value: string | null): value is AdultDayType {
  return value !== null && adultDayTypes.includes(value as AdultDayType);
}

function isWeeklyGoalType(value: string): value is WeeklyGoalType {
  return weeklyGoalTypes.includes(value as WeeklyGoalType);
}

function isMealType(value: string | null): value is MealType {
  return value !== null && mealTypes.includes(value as MealType);
}

function getComponentTypeForMeal(mealType: MealType): MealComponentType {
  if (mealType === "side") {
    return "side";
  }

  if (mealType === "snack") {
    return "snack";
  }

  if (mealType === "drink") {
    return "drink";
  }

  if (mealType === "baby_meal") {
    return "baby_food";
  }

  return "main";
}

async function getScopedWeeklyPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("household_id", householdId)
    .eq("id", weeklyPlanId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getExistingBabyRoutineRows({
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
    .select("baby_plan_slot, is_locked, plan_date")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .not("baby_plan_slot", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Array<{
    baby_plan_slot: "baby_meal_1" | "baby_meal_2" | null;
    is_locked: boolean;
    plan_date: string;
  }>;
}

async function getScopedMealProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  mealProfileId: string
) {
  const { data, error } = await supabase
    .from("meal_profiles")
    .select("id")
    .eq("household_id", householdId)
    .eq("id", mealProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getScopedRecipe(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  recipeId: string
) {
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, name, estimated_calories_per_serving, estimated_protein_grams_per_serving"
    )
    .eq("household_id", householdId)
    .eq("id", recipeId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getScopedActiveStapleIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  stapleIds: string[]
) {
  if (stapleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("staples")
    .select("id")
    .eq("household_id", householdId)
    .eq("active", true)
    .in("id", stapleIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((staple) => staple.id);
}
