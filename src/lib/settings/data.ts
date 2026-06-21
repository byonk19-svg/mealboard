import { createClient } from "@/lib/supabase/server";
import type {
  BabyFoodStatusEntry,
  Food,
  FoodPreference,
  MealProfile,
  Staple
} from "@/lib/settings/types";

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

type StapleRow = Omit<
  Staple,
  "food_name" | "grocery_category_name" | "meal_profile_name"
> & {
  foods: { name: string } | { name: string }[] | null;
  grocery_categories: { name: string } | { name: string }[] | null;
  meal_profiles: { name: string } | { name: string }[] | null;
};

type BabyFoodStatusRow = Omit<BabyFoodStatusEntry, "food_name"> & {
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
    .select("id, household_id, name, default_unit, default_grocery_category_id")
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

export async function getBabyFoodStatuses(
  householdId: string,
  babyProfileId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baby_food_statuses")
    .select(
      "id, household_id, baby_profile_id, food_id, status, notes, prep_notes, last_offered_on, foods(name)"
    )
    .eq("household_id", householdId)
    .eq("baby_profile_id", babyProfileId)
    .order("last_offered_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BabyFoodStatusRow[]).map((row) => ({
    baby_profile_id: row.baby_profile_id,
    food_id: row.food_id,
    food_name: getJoinedName(row.foods),
    household_id: row.household_id,
    id: row.id,
    last_offered_on: row.last_offered_on,
    notes: row.notes,
    prep_notes: row.prep_notes,
    status: row.status
  }));
}

export async function getStaples(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staples")
    .select(
      "id, household_id, meal_profile_id, food_id, display_name, default_quantity, default_unit, preferred_quantity_text, grocery_category_id, frequency, notes, active, meal_profiles(name), foods(name), grocery_categories(name)"
    )
    .eq("household_id", householdId)
    .order("active", { ascending: false })
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as StapleRow[]).map((row) => ({
    active: row.active,
    default_quantity: toNullableNumber(row.default_quantity),
    default_unit: row.default_unit,
    display_name: row.display_name,
    food_id: row.food_id,
    food_name: getOptionalJoinedName(row.foods),
    frequency: row.frequency,
    grocery_category_id: row.grocery_category_id,
    grocery_category_name: getOptionalJoinedName(row.grocery_categories),
    household_id: row.household_id,
    id: row.id,
    meal_profile_id: row.meal_profile_id,
    meal_profile_name: getOptionalJoinedName(row.meal_profiles),
    notes: row.notes,
    preferred_quantity_text: row.preferred_quantity_text
  }));
}

function getJoinedName(value: { name: string } | { name: string }[] | null) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? "Unknown";
  }

  return value?.name ?? "Unknown";
}

function getOptionalJoinedName(
  value: { name: string } | { name: string }[] | null
) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value?.name ?? null;
}

function toNullableNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
