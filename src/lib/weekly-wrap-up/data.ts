import { createClient } from "@/lib/supabase/server";
import {
  buildWeeklyWrapUpCandidates,
  type WrapUpGroceryItem,
  type WrapUpPlanItem
} from "./build-wrap-up-items";

type WrapUpStatus = "open" | "dismissed" | "completed";
type WrapUpItemStatus = "pending" | "completed" | "dismissed";
type WrapUpPromptType = "recipe_review" | "unused_grocery_item";

type JoinedValue<T> = T | T[] | null;

type PlanItemRow = {
  display_name: string;
  id: string;
  is_try_this: boolean;
  meal_profile_id: string | null;
  meal_profiles: JoinedValue<{ name: string }>;
  meal_type: WrapUpPlanItem["mealType"];
  plan_date: string;
  recipe_id: string | null;
  recipes: JoinedValue<{ name: string; status: WrapUpPlanItem["recipeStatus"] }>;
};

type GroceryItemRow = {
  already_have: boolean;
  checked: boolean;
  display_name: string;
  id: string;
};

type RecipeReviewRow = {
  weekly_plan_item_id: string | null;
};

type WrapUpRow = {
  dismissed: boolean;
  id: string;
  status: WrapUpStatus;
  weekly_plan_id: string;
};

type WrapUpItemRow = {
  grocery_list_item_id: string | null;
  grocery_list_items: JoinedValue<{ display_name: string }>;
  id: string;
  prompt_type: WrapUpPromptType;
  response: Record<string, unknown>;
  status: WrapUpItemStatus;
  weekly_plan_item_id: string | null;
  weekly_plan_items: JoinedValue<{
    display_name: string;
    meal_profile_id: string | null;
    meal_profiles: JoinedValue<{ name: string }>;
    meal_type: WrapUpPlanItem["mealType"];
    plan_date: string;
    recipe_id: string | null;
    recipes: JoinedValue<{ name: string; status: WrapUpPlanItem["recipeStatus"] }>;
  }>;
};

export type WeeklyWrapUpItem = {
  displayName: string;
  groceryListItemId: string | null;
  id: string;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: WrapUpPlanItem["mealType"] | null;
  planDate: string | null;
  promptType: WrapUpPromptType;
  recipeId: string | null;
  recipeName: string | null;
  response: Record<string, unknown>;
  status: WrapUpItemStatus;
  weeklyPlanItemId: string | null;
};

export type WeeklyWrapUpResult =
  | {
      eligible: false;
      reason: string;
      weeklyPlanId: string;
    }
  | {
      eligible: true;
      items: WeeklyWrapUpItem[];
      pendingItemCount: number;
      status: WrapUpStatus;
      weeklyPlanId: string;
      wrapUpId: string;
    };

export async function getOrCreateWeeklyWrapUp({
  householdId,
  weeklyPlanId
}: {
  householdId: string;
  weeklyPlanId: string;
}): Promise<WeeklyWrapUpResult> {
  const supabase = await createClient();
  const { data: completedList, error: listError } = await supabase
    .from("grocery_lists")
    .select("id")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (listError) {
    throw new Error(listError.message);
  }

  if (!completedList) {
    return {
      eligible: false,
      reason: "Complete this week's grocery list before opening wrap-up.",
      weeklyPlanId
    };
  }

  const wrapUp = await getOrInsertWrapUp(supabase, householdId, weeklyPlanId);
  await syncWrapUpItems({
    groceryListId: completedList.id,
    householdId,
    supabase,
    weeklyPlanId,
    wrapUpId: wrapUp.id
  });
  const items = await getWeeklyWrapUpItems(supabase, householdId, wrapUp.id);
  const pendingItemCount = items.filter((item) => item.status === "pending").length;
  const status =
    wrapUp.status === "open" && pendingItemCount === 0
      ? await completeEmptyWrapUp(supabase, householdId, wrapUp.id)
      : wrapUp.status;

  return {
    eligible: true,
    items,
    pendingItemCount,
    status,
    weeklyPlanId,
    wrapUpId: wrapUp.id
  };
}

async function getOrInsertWrapUp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data: existing, error: existingError } = await supabase
    .from("weekly_wrap_ups")
    .select("id, weekly_plan_id, status, dismissed")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing as WrapUpRow;
  }

  const { data, error } = await supabase
    .from("weekly_wrap_ups")
    .insert({
      household_id: householdId,
      weekly_plan_id: weeklyPlanId
    })
    .select("id, weekly_plan_id, status, dismissed")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Weekly wrap-up could not be created.");
  }

  return data as WrapUpRow;
}

async function syncWrapUpItems({
  groceryListId,
  householdId,
  supabase,
  weeklyPlanId,
  wrapUpId
}: {
  groceryListId: string;
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlanId: string;
  wrapUpId: string;
}) {
  const [planItems, groceryItems, reviewedPlanItemIds, existingItems] =
    await Promise.all([
      getWrapUpPlanItems(supabase, householdId, weeklyPlanId),
      getWrapUpGroceryItems(supabase, householdId, groceryListId),
      getReviewedPlanItemIds(supabase, householdId),
      getExistingWrapUpItemKeys(supabase, householdId, wrapUpId)
    ]);
  const candidates = buildWeeklyWrapUpCandidates({
    existingReviewedPlanItemIds: reviewedPlanItemIds,
    groceryItems,
    planItems
  });
  const rows = [
    ...candidates.recipeReviewCandidates
      .filter(
        (candidate) =>
          !existingItems.has(`recipe_review:${candidate.weeklyPlanItemId}`)
      )
      .map((candidate) => ({
        household_id: householdId,
        prompt_type: "recipe_review",
        weekly_plan_item_id: candidate.weeklyPlanItemId,
        weekly_wrap_up_id: wrapUpId
      })),
    ...candidates.unusedGroceryCandidates
      .filter(
        (candidate) =>
          !existingItems.has(`unused_grocery_item:${candidate.groceryListItemId}`)
      )
      .map((candidate) => ({
        grocery_list_item_id: candidate.groceryListItemId,
        household_id: householdId,
        prompt_type: "unused_grocery_item",
        weekly_wrap_up_id: wrapUpId
      }))
  ];

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("weekly_wrap_up_items").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

async function getWrapUpPlanItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data, error } = await supabase
    .from("weekly_plan_items")
    .select(
      "id, display_name, meal_profile_id, meal_type, plan_date, recipe_id, is_try_this, meal_profiles(name), recipes(name, status)"
    )
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .not("recipe_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PlanItemRow[]).map((item) => {
    const recipe = getJoinedValue(item.recipes);

    return {
      displayName: item.display_name,
      isTryThis: item.is_try_this,
      mealProfileId: item.meal_profile_id,
      mealProfileName: getJoinedValue(item.meal_profiles)?.name ?? null,
      mealType: item.meal_type,
      planDate: item.plan_date,
      recipeId: item.recipe_id,
      recipeName: recipe?.name ?? item.display_name,
      recipeStatus: recipe?.status ?? null,
      weeklyPlanItemId: item.id
    } satisfies WrapUpPlanItem;
  });
}

async function getWrapUpGroceryItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  groceryListId: string
) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .select("id, display_name, checked, already_have")
    .eq("household_id", householdId)
    .eq("grocery_list_id", groceryListId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as GroceryItemRow[]).map(
    (item): WrapUpGroceryItem => ({
      alreadyHave: item.already_have,
      checked: item.checked,
      displayName: item.display_name,
      groceryListItemId: item.id
    })
  );
}

async function getReviewedPlanItemIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string
) {
  const { data, error } = await supabase
    .from("recipe_reviews")
    .select("weekly_plan_item_id")
    .eq("household_id", householdId)
    .not("weekly_plan_item_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    ((data ?? []) as RecipeReviewRow[])
      .map((review) => review.weekly_plan_item_id)
      .filter((id): id is string => Boolean(id))
  );
}

async function getExistingWrapUpItemKeys(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  wrapUpId: string
) {
  const { data, error } = await supabase
    .from("weekly_wrap_up_items")
    .select("prompt_type, weekly_plan_item_id, grocery_list_item_id")
    .eq("household_id", householdId)
    .eq("weekly_wrap_up_id", wrapUpId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? []).map((item) => {
      const typed = item as Pick<
        WrapUpItemRow,
        "grocery_list_item_id" | "prompt_type" | "weekly_plan_item_id"
      >;
      const id =
        typed.prompt_type === "recipe_review"
          ? typed.weekly_plan_item_id
          : typed.grocery_list_item_id;

      return `${typed.prompt_type}:${id}`;
    })
  );
}

async function getWeeklyWrapUpItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  wrapUpId: string
) {
  const { data, error } = await supabase
    .from("weekly_wrap_up_items")
    .select(
      "id, prompt_type, status, response, weekly_plan_item_id, grocery_list_item_id, weekly_plan_items(display_name, meal_profile_id, meal_type, plan_date, recipe_id, meal_profiles(name), recipes(name, status)), grocery_list_items(display_name)"
    )
    .eq("household_id", householdId)
    .eq("weekly_wrap_up_id", wrapUpId)
    .order("prompt_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WrapUpItemRow[]).map((item) => {
    const planItem = getJoinedValue(item.weekly_plan_items);
    const groceryItem = getJoinedValue(item.grocery_list_items);
    const recipe = getJoinedValue(planItem?.recipes ?? null);

    return {
      displayName: planItem?.display_name ?? groceryItem?.display_name ?? "Wrap-up item",
      groceryListItemId: item.grocery_list_item_id,
      id: item.id,
      mealProfileId: planItem?.meal_profile_id ?? null,
      mealProfileName: getJoinedValue(planItem?.meal_profiles ?? null)?.name ?? null,
      mealType: planItem?.meal_type ?? null,
      planDate: planItem?.plan_date ?? null,
      promptType: item.prompt_type,
      recipeId: planItem?.recipe_id ?? null,
      recipeName: recipe?.name ?? null,
      response: item.response,
      status: item.status,
      weeklyPlanItemId: item.weekly_plan_item_id
    } satisfies WeeklyWrapUpItem;
  });
}

async function completeEmptyWrapUp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  wrapUpId: string
): Promise<WrapUpStatus> {
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
    throw new Error(error.message);
  }

  return "completed";
}

function getJoinedValue<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
