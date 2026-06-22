"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import type { RecipeRating, RecipeStatus } from "@/lib/recipes/types";

type RecipeWrapUpStatus = Extract<
  RecipeStatus,
  "tried" | "approved" | "favorite" | "retired"
>;

const recipeWrapUpStatuses = [
  "tried",
  "approved",
  "favorite",
  "retired"
] as const satisfies readonly RecipeWrapUpStatus[];
const recipeRatings = [
  "love",
  "like",
  "okay",
  "dislike",
  "hard_no"
] as const satisfies readonly RecipeRating[];

function wrapUpRedirect(weeklyPlanId: string, message: string): never {
  redirect(
    `/weekly-wrap-up/${encodeURIComponent(weeklyPlanId)}?message=${encodeURIComponent(message)}`
  );
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

async function requireHousehold(weeklyPlanId: string) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    wrapUpRedirect(weeklyPlanId, "Link your user to a household first.");
  }

  return householdContext.household;
}

export async function dismissWeeklyWrapUp(formData: FormData) {
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));
  const wrapUpId = textOrNull(formData.get("wrapUpId"));

  if (!weeklyPlanId || !wrapUpId) {
    redirect("/dashboard");
  }

  const household = await requireHousehold(weeklyPlanId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_wrap_ups")
    .update({
      dismissed: true,
      status: "dismissed"
    })
    .eq("household_id", household.id)
    .eq("id", wrapUpId);

  if (error) {
    wrapUpRedirect(weeklyPlanId, error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/weekly-wrap-up/${weeklyPlanId}`);
  wrapUpRedirect(weeklyPlanId, "Weekly wrap-up dismissed.");
}

export async function acknowledgeUnusedGroceryItem(formData: FormData) {
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));
  const wrapUpId = textOrNull(formData.get("wrapUpId"));
  const wrapUpItemId = textOrNull(formData.get("wrapUpItemId"));
  const resolution = textOrNull(formData.get("resolution")) ?? "acknowledged";

  if (!weeklyPlanId || !wrapUpId || !wrapUpItemId) {
    redirect("/dashboard");
  }

  const household = await requireHousehold(weeklyPlanId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_wrap_up_items")
    .update({
      response: { resolution },
      status: "completed"
    })
    .eq("household_id", household.id)
    .eq("id", wrapUpItemId)
    .eq("prompt_type", "unused_grocery_item");

  if (error) {
    wrapUpRedirect(weeklyPlanId, error.message);
  }

  await completeWrapUpIfNoPendingItems({
    householdId: household.id,
    supabase,
    weeklyPlanId,
    wrapUpId
  });

  revalidatePath("/dashboard");
  revalidatePath(`/weekly-wrap-up/${weeklyPlanId}`);
  wrapUpRedirect(weeklyPlanId, "Unused grocery item noted.");
}

export async function saveRecipeWrapUpReview(formData: FormData) {
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));
  const wrapUpId = textOrNull(formData.get("wrapUpId"));
  const wrapUpItemId = textOrNull(formData.get("wrapUpItemId"));
  const weeklyPlanItemId = textOrNull(formData.get("weeklyPlanItemId"));
  const recipeId = textOrNull(formData.get("recipeId"));
  const mealProfileId = textOrNull(formData.get("mealProfileId"));
  const rawStatus = textOrNull(formData.get("profileStatus"));
  const rawRating = textOrNull(formData.get("rating"));
  const outcome = textOrNull(formData.get("outcome")) ?? "made";
  const notes = textOrNull(formData.get("notes"));
  const profileStatus = recipeWrapUpStatuses.includes(
    rawStatus as RecipeWrapUpStatus
  )
    ? (rawStatus as RecipeWrapUpStatus)
    : "tried";
  const rating = recipeRatings.includes(rawRating as RecipeRating)
    ? (rawRating as RecipeRating)
    : null;

  if (!weeklyPlanId || !wrapUpId || !wrapUpItemId || !weeklyPlanItemId || !recipeId) {
    redirect("/dashboard");
  }

  const household = await requireHousehold(weeklyPlanId);
  const supabase = await createClient();
  const response = {
    notes,
    outcome,
    profileStatus,
    rating
  };
  const { error: reviewError } = await supabase.from("recipe_reviews").insert({
    household_id: household.id,
    meal_profile_id: mealProfileId,
    notes,
    quick_tags: outcome === "skipped" ? ["skipped"] : [],
    rating,
    recipe_id: recipeId,
    weekly_plan_item_id: weeklyPlanItemId
  });

  if (reviewError) {
    wrapUpRedirect(weeklyPlanId, reviewError.message);
  }

  if (mealProfileId) {
    const { error: approvalError } = await supabase
      .from("recipe_profile_approvals")
      .upsert(
        {
          approved_for_planning:
            profileStatus === "approved" || profileStatus === "favorite",
          household_id: household.id,
          meal_profile_id: mealProfileId,
          notes,
          rating,
          recipe_id: recipeId,
          status: profileStatus
        },
        { onConflict: "recipe_id,meal_profile_id" }
      );

    if (approvalError) {
      wrapUpRedirect(weeklyPlanId, approvalError.message);
    }
  }

  const { error: itemError } = await supabase
    .from("weekly_wrap_up_items")
    .update({
      response,
      status: "completed"
    })
    .eq("household_id", household.id)
    .eq("id", wrapUpItemId)
    .eq("prompt_type", "recipe_review");

  if (itemError) {
    wrapUpRedirect(weeklyPlanId, itemError.message);
  }

  await completeWrapUpIfNoPendingItems({
    householdId: household.id,
    supabase,
    weeklyPlanId,
    wrapUpId
  });

  revalidatePath("/dashboard");
  revalidatePath(`/weekly-wrap-up/${weeklyPlanId}`);
  wrapUpRedirect(weeklyPlanId, "Recipe feedback saved.");
}

async function completeWrapUpIfNoPendingItems({
  householdId,
  supabase,
  weeklyPlanId,
  wrapUpId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
  wrapUpId: string;
}) {
  const { count, error: countError } = await supabase
    .from("weekly_wrap_up_items")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("weekly_wrap_up_id", wrapUpId)
    .eq("status", "pending");

  if (countError) {
    wrapUpRedirect(weeklyPlanId, countError.message);
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const { error } = await supabase
    .from("weekly_wrap_ups")
    .update({
      completed_at: new Date().toISOString(),
      status: "completed"
    })
    .eq("household_id", householdId)
    .eq("id", wrapUpId)
    .eq("status", "open");

  if (error) {
    wrapUpRedirect(weeklyPlanId, error.message);
  }
}
