"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeBabyFoodStatusInput } from "@/lib/settings/baby-food-statuses";
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

function babyFoodStatusDatabaseMessage(error: { code?: string; message: string }) {
  if (
    error.code === "23505" ||
    error.message.includes("baby_food_statuses_baby_profile_id_food_id_key")
  ) {
    return "That food already has a baby status.";
  }

  if (error.message.includes("Baby food statuses can only be saved")) {
    return "Baby food statuses can only be saved for the household Baby profile.";
  }

  return "Baby food status could not be saved.";
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

export async function saveBabyFoodStatus(formData: FormData) {
  const path = "/settings/baby";
  const household = await requireHousehold(path);
  const babyFoodStatusId = textOrNull(formData.get("babyFoodStatusId"));
  const babyProfileId = textOrNull(formData.get("babyProfileId"));

  if (!babyProfileId) {
    settingsRedirect(path, "Choose the household Baby profile.");
  }

  let babyFoodStatus;

  try {
    babyFoodStatus = normalizeBabyFoodStatusInput({
      foodId: textOrNull(formData.get("foodId")),
      lastOfferedOn: textOrNull(formData.get("lastOfferedOn")),
      notes: textOrNull(formData.get("notes")),
      prepNotes: textOrNull(formData.get("prepNotes")),
      status: textOrNull(formData.get("status"))
    });
  } catch (error) {
    settingsRedirect(
      path,
      error instanceof Error ? error.message : "Baby food status could not be saved."
    );
  }

  const supabase = await createClient();
  const { data: babyProfiles, error: babyProfileError } = await supabase
    .from("meal_profiles")
    .select("id, profile_type")
    .eq("household_id", household.id)
    .eq("profile_type", "baby")
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(1);

  if (babyProfileError) {
    settingsRedirect(path, "Baby profile could not be loaded.");
  }

  const babyProfile = babyProfiles?.[0] ?? null;

  if (!babyProfile || babyProfile.id !== babyProfileId) {
    settingsRedirect(path, "Choose the household Baby profile.");
  }

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .select("id")
    .eq("household_id", household.id)
    .eq("id", babyFoodStatus.foodId)
    .is("archived_at", null)
    .maybeSingle();

  if (foodError) {
    settingsRedirect(path, "Food could not be loaded.");
  }

  if (!food) {
    settingsRedirect(path, "That food is no longer available.");
  }

  const payload = {
    baby_profile_id: babyProfile.id,
    food_id: babyFoodStatus.foodId,
    household_id: household.id,
    last_offered_on: babyFoodStatus.lastOfferedOn,
    notes: babyFoodStatus.notes,
    prep_notes: babyFoodStatus.prepNotes,
    status: babyFoodStatus.status
  };

  if (babyFoodStatusId) {
    const { data: existing, error: existingError } = await supabase
      .from("baby_food_statuses")
      .select("id")
      .eq("household_id", household.id)
      .eq("baby_profile_id", babyProfile.id)
      .eq("id", babyFoodStatusId)
      .maybeSingle();

    if (existingError) {
      settingsRedirect(path, "Baby food status could not be loaded.");
    }

    if (!existing) {
      settingsRedirect(path, "That baby food status is no longer available.");
    }

    const { data: updated, error } = await supabase
      .from("baby_food_statuses")
      .update(payload)
      .eq("household_id", household.id)
      .eq("baby_profile_id", babyProfile.id)
      .eq("id", babyFoodStatusId)
      .select("id")
      .maybeSingle();

    if (error) {
      settingsRedirect(path, babyFoodStatusDatabaseMessage(error));
    }

    if (!updated) {
      settingsRedirect(path, "That baby food status is no longer available.");
    }
  } else {
    const { error } = await supabase
      .from("baby_food_statuses")
      .upsert(payload, { onConflict: "baby_profile_id,food_id" });

    if (error) {
      settingsRedirect(path, babyFoodStatusDatabaseMessage(error));
    }
  }

  revalidatePath(path);
  settingsRedirect(path, "Baby food status saved.");
}

export async function deleteBabyFoodStatus(formData: FormData) {
  const path = "/settings/baby";
  const household = await requireHousehold(path);
  const babyFoodStatusId = textOrNull(formData.get("babyFoodStatusId"));

  if (!babyFoodStatusId) {
    settingsRedirect(path, "Baby food status is required.");
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("baby_food_statuses")
    .select("id")
    .eq("household_id", household.id)
    .eq("id", babyFoodStatusId)
    .maybeSingle();

  if (existingError) {
    settingsRedirect(path, "Baby food status could not be loaded.");
  }

  if (!existing) {
    settingsRedirect(path, "That baby food status is no longer available.");
  }

  const { data: deleted, error } = await supabase
    .from("baby_food_statuses")
    .delete()
    .eq("household_id", household.id)
    .eq("id", babyFoodStatusId)
    .select("id")
    .maybeSingle();

  if (error) {
    settingsRedirect(path, "Baby food status could not be deleted.");
  }

  if (!deleted) {
    settingsRedirect(path, "That baby food status is no longer available.");
  }

  revalidatePath(path);
  settingsRedirect(path, "Baby food status deleted.");
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
