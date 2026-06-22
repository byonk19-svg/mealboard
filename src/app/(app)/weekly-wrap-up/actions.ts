"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import type { RecipeRating, RecipeStatus } from "@/lib/recipes/types";
import { toUnusedGroceryCandidate } from "@/lib/weekly-wrap-up/build-wrap-up-items";

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

type JoinedValue<T> = T | T[] | null;

type UnusedGrocerySnapshotRow = {
  grocery_list_item_id: string | null;
  grocery_list_items: JoinedValue<{
    display_name: string;
    manual_item: boolean;
  }>;
};

type GroceryItemSourceRow = {
  meal_profiles: JoinedValue<{ name: string }>;
  notes: string | null;
  quantity: number | string | null;
  recipes: JoinedValue<{ name: string }>;
  source_id: string | null;
  source_label: string | null;
  source_type: string;
  unit: string | null;
};

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
  const notes = textOrNull(formData.get("notes"));

  if (!weeklyPlanId || !wrapUpId || !wrapUpItemId) {
    redirect("/dashboard");
  }

  const household = await requireHousehold(weeklyPlanId);
  const supabase = await createClient();
  const unusedGrocery = await loadUnusedGrocerySnapshot({
    householdId: household.id,
    supabase,
    wrapUpItemId
  });
  const { error } = await supabase
    .from("weekly_wrap_up_items")
    .update({
      response: { notes, resolution, unusedGrocery },
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

async function loadUnusedGrocerySnapshot({
  householdId,
  supabase,
  wrapUpItemId
}: {
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  wrapUpItemId: string;
}) {
  const { data, error } = await supabase
    .from("weekly_wrap_up_items")
    .select("grocery_list_item_id, grocery_list_items(display_name, manual_item)")
    .eq("household_id", householdId)
    .eq("id", wrapUpItemId)
    .eq("prompt_type", "unused_grocery_item")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as UnusedGrocerySnapshotRow | null;
  const groceryItem = getJoinedValue(row?.grocery_list_items ?? null);

  if (!row?.grocery_list_item_id || !groceryItem) {
    return null;
  }

  const { data: sourceRows, error: sourceError } = await supabase
    .from("grocery_item_sources")
    .select(
      "source_type, source_id, source_label, notes, quantity, unit, meal_profiles(name), recipes(name)"
    )
    .eq("household_id", householdId)
    .eq("grocery_list_item_id", row.grocery_list_item_id)
    .order("created_at", { ascending: true });

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  const candidate = toUnusedGroceryCandidate({
    alreadyHave: false,
    checked: false,
    displayName: groceryItem.display_name,
    groceryListItemId: row.grocery_list_item_id,
    manualItem: groceryItem.manual_item,
    sources: ((sourceRows ?? []) as GroceryItemSourceRow[]).map((source) => ({
      label: source.source_label,
      mealProfileName: getJoinedValue(source.meal_profiles)?.name ?? null,
      notes: source.notes,
      quantity: toNullableNumber(source.quantity),
      recipeName: getJoinedValue(source.recipes)?.name ?? null,
      sourceId: source.source_id,
      sourceType: source.source_type,
      unit: source.unit
    }))
  });

  return {
    actionHref: candidate.actionHref,
    actionLabel: candidate.actionLabel,
    classification: candidate.classification,
    displayName: candidate.displayName,
    groceryListItemId: candidate.groceryListItemId,
    manualItem: groceryItem.manual_item,
    sourceKinds: candidate.sourceKinds,
    sources: candidate.sources
  };
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
  const leftovers = textOrNull(formData.get("leftovers")) ?? "none";
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
    leftovers,
    notes,
    outcome,
    profileStatus,
    rating
  };
  const quickTags = [
    outcome === "skipped" ? "skipped" : null,
    leftovers !== "none" ? leftovers : null
  ].filter((tag): tag is string => Boolean(tag));
  const { error: reviewError } = await supabase.from("recipe_reviews").insert({
    household_id: household.id,
    meal_profile_id: mealProfileId,
    notes,
    quick_tags: quickTags,
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

function getJoinedValue<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toNullableNumber(value: number | string | null) {
  if (value === null || value === "") {
    return null;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}
