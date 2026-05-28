import { createClient } from "@/lib/supabase/server";
import type { Food, FoodPreference, MealProfile } from "@/lib/settings/types";

type FoodPreferenceRow = {
  id: string;
  household_id: string;
  meal_profile_id: string;
  food_id: string;
  preference: FoodPreference["preference"];
  notes: string | null;
  prep_notes: string | null;
  meal_profiles: { name: string } | { name: string }[] | null;
  foods: { name: string } | { name: string }[] | null;
};

export async function getMealProfiles(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_profiles")
    .select(
      "id, household_id, name, profile_type, color_label, birthdate, baby_stage_override_months, default_daily_calorie_target, work_day_calorie_target, off_day_calorie_target, notes, sort_order"
    )
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MealProfile[];
}

export async function getFoods(householdId: string, search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("foods")
    .select("id, household_id, name, default_unit")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  const trimmedSearch = search?.trim();

  if (trimmedSearch) {
    query = query.ilike("name", `%${trimmedSearch}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Food[];
}

export async function getFoodPreferences(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_preferences")
    .select(
      "id, household_id, meal_profile_id, food_id, preference, notes, prep_notes, meal_profiles(name), foods(name)"
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as FoodPreferenceRow[]).map((row) => ({
    id: row.id,
    household_id: row.household_id,
    meal_profile_id: row.meal_profile_id,
    food_id: row.food_id,
    preference: row.preference,
    notes: row.notes,
    prep_notes: row.prep_notes,
    meal_profile_name: getJoinedName(row.meal_profiles),
    food_name: getJoinedName(row.foods)
  }));
}

function getJoinedName(value: { name: string } | { name: string }[] | null) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? "Unknown";
  }

  return value?.name ?? "Unknown";
}
