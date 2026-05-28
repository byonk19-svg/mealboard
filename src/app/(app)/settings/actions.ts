"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { preferenceLevels, type FoodPreferenceLevel } from "@/lib/settings/types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type ParsedNumber =
  | {
      value: number | null;
    }
  | {
      error: string;
    };

function settingsRedirect(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function parseOptionalPositiveInteger(
  value: FormDataEntryValue | null,
  label: string
): ParsedNumber {
  const text = String(value ?? "").trim();

  if (!text) {
    return { value: null };
  }

  const parsed = Number(text);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `${label} must be a positive whole number.` };
  }

  return { value: parsed };
}

function isPreferenceLevel(value: string): value is FoodPreferenceLevel {
  return preferenceLevels.includes(value as FoodPreferenceLevel);
}

async function requireHousehold(path: string) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    settingsRedirect(path, "Link your user to a household before editing settings.");
  }

  return householdContext.household;
}

export async function updateMealProfile(formData: FormData) {
  const path = "/settings/profiles";
  const household = await requireHousehold(path);
  const profileId = textOrNull(formData.get("profileId"));

  if (!profileId) {
    settingsRedirect(path, "Profile is required.");
  }

  const defaultTarget = parseOptionalPositiveInteger(
    formData.get("defaultDailyCalorieTarget"),
    "Default daily calorie target"
  );
  const workTarget = parseOptionalPositiveInteger(
    formData.get("workDayCalorieTarget"),
    "Work day calorie target"
  );
  const offTarget = parseOptionalPositiveInteger(
    formData.get("offDayCalorieTarget"),
    "Off day calorie target"
  );

  if ("error" in defaultTarget) {
    settingsRedirect(path, defaultTarget.error);
  }

  if ("error" in workTarget) {
    settingsRedirect(path, workTarget.error);
  }

  if ("error" in offTarget) {
    settingsRedirect(path, offTarget.error);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("meal_profiles")
    .update({
      notes: textOrNull(formData.get("notes")),
      default_daily_calorie_target: defaultTarget.value,
      work_day_calorie_target: workTarget.value,
      off_day_calorie_target: offTarget.value
    })
    .eq("household_id", household.id)
    .eq("id", profileId);

  if (error) {
    settingsRedirect(path, error.message);
  }

  revalidatePath(path);
  settingsRedirect(path, "Profile updated.");
}

export async function saveFoodPreference(formData: FormData) {
  const path = "/settings/preferences";
  const household = await requireHousehold(path);
  const preferenceId = textOrNull(formData.get("preferenceId"));
  const mealProfileId = textOrNull(formData.get("mealProfileId"));
  const foodId = textOrNull(formData.get("foodId"));
  const preference = String(formData.get("preference") ?? "");

  if (!mealProfileId || !foodId || !isPreferenceLevel(preference)) {
    settingsRedirect(path, "Choose a profile, food, and preference level.");
  }

  const payload = {
    household_id: household.id,
    meal_profile_id: mealProfileId,
    food_id: foodId,
    preference,
    notes: textOrNull(formData.get("notes")),
    prep_notes: textOrNull(formData.get("prepNotes"))
  };

  const supabase = await createClient();
  const { error } = preferenceId
    ? await supabase
        .from("food_preferences")
        .update(payload)
        .eq("household_id", household.id)
        .eq("id", preferenceId)
    : await supabase
        .from("food_preferences")
        .upsert(payload, { onConflict: "meal_profile_id,food_id" });

  if (error) {
    settingsRedirect(path, error.message);
  }

  revalidatePath(path);
  settingsRedirect(path, "Food preference saved.");
}

export async function deleteFoodPreference(formData: FormData) {
  const path = "/settings/preferences";
  const household = await requireHousehold(path);
  const preferenceId = textOrNull(formData.get("preferenceId"));

  if (!preferenceId) {
    settingsRedirect(path, "Preference is required.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("food_preferences")
    .delete()
    .eq("household_id", household.id)
    .eq("id", preferenceId);

  if (error) {
    settingsRedirect(path, error.message);
  }

  revalidatePath(path);
  settingsRedirect(path, "Food preference deleted.");
}
