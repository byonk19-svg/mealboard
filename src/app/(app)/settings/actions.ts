"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeBabyProfileInput } from "@/lib/settings/baby-profile";
import { resolveSettingsReturnPath } from "@/lib/settings/baby-settings";
import { normalizeStapleInput } from "@/lib/settings/staples";
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
  const path = resolveSettingsReturnPath(textOrNull(formData.get("returnPath")));
  const household = await requireHousehold(path);
  const profileId = textOrNull(formData.get("profileId"));

  if (!profileId) {
    settingsRedirect(path, "Profile is required.");
  }

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("meal_profiles")
    .select("id, profile_type")
    .eq("household_id", household.id)
    .eq("id", profileId)
    .is("archived_at", null)
    .maybeSingle();

  if (profileError) {
    settingsRedirect(path, profileError.message);
  }

  if (!profile) {
    settingsRedirect(path, "That profile is no longer available.");
  }

  const payload: {
    baby_stage_override_months?: number | null;
    birthdate?: string | null;
    default_daily_calorie_target?: number | null;
    notes: string | null;
    off_day_calorie_target?: number | null;
    work_day_calorie_target?: number | null;
  } = {
    notes: textOrNull(formData.get("notes"))
  };

  if (profile.profile_type === "adult") {
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

    payload.default_daily_calorie_target = defaultTarget.value;
    payload.work_day_calorie_target = workTarget.value;
    payload.off_day_calorie_target = offTarget.value;
  }

  if (profile.profile_type === "baby") {
    try {
      const babyInput = normalizeBabyProfileInput({
        birthdate: textOrNull(formData.get("birthdate")),
        stageOverrideMonths: textOrNull(formData.get("babyStageOverrideMonths"))
      });

      payload.birthdate = babyInput.birthdate;
      payload.baby_stage_override_months = babyInput.babyStageOverrideMonths;
    } catch (error) {
      settingsRedirect(
        path,
        error instanceof Error ? error.message : "Baby profile could not be saved."
      );
    }
  }

  const { error } = await supabase
    .from("meal_profiles")
    .update(payload)
    .eq("household_id", household.id)
    .eq("id", profileId);

  if (error) {
    settingsRedirect(path, error.message);
  }

  revalidatePath(path);
  revalidatePath("/settings/profiles");
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

export async function saveStaple(formData: FormData) {
  const path = "/settings/staples";
  const household = await requireHousehold(path);
  const stapleId = textOrNull(formData.get("stapleId"));

  let staple;

  try {
    staple = normalizeStapleInput({
      displayName: textOrNull(formData.get("displayName")),
      frequency: textOrNull(formData.get("frequency")),
      notes: textOrNull(formData.get("notes")),
      preferredQuantityText: textOrNull(formData.get("preferredQuantityText")),
      quantity: textOrNull(formData.get("quantity")),
      unit: textOrNull(formData.get("unit"))
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Staple could not be saved.";
    settingsRedirect(path, message);
  }

  const payload = {
    default_quantity: staple.quantity,
    default_unit: staple.unit,
    display_name: staple.displayName,
    food_id: textOrNull(formData.get("foodId")),
    frequency: staple.frequency,
    grocery_category_id: textOrNull(formData.get("groceryCategoryId")),
    household_id: household.id,
    meal_profile_id: textOrNull(formData.get("mealProfileId")),
    notes: staple.notes,
    preferred_quantity_text: staple.preferredQuantityText
  };

  const supabase = await createClient();
  const { error } = stapleId
    ? await supabase
        .from("staples")
        .update(payload)
        .eq("household_id", household.id)
        .eq("id", stapleId)
    : await supabase.from("staples").insert({
        ...payload,
        active: true
      });

  if (error) {
    settingsRedirect(path, error.message);
  }

  revalidatePath("/settings");
  revalidatePath(path);
  settingsRedirect(path, stapleId ? "Staple updated." : "Staple created.");
}

export async function deactivateStaple(formData: FormData) {
  const path = "/settings/staples";
  const household = await requireHousehold(path);
  const stapleId = textOrNull(formData.get("stapleId"));

  if (!stapleId) {
    settingsRedirect(path, "Staple is required.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("staples")
    .update({ active: false })
    .eq("household_id", household.id)
    .eq("id", stapleId);

  if (error) {
    settingsRedirect(path, error.message);
  }

  revalidatePath("/settings");
  revalidatePath(path);
  settingsRedirect(path, "Staple deactivated.");
}
