import { createClient } from "@/lib/supabase/server";
import type { RecipeReviewSignal } from "@/lib/meal-planning/rule-based-suggestions";
import type { RecipeRating } from "@/lib/recipes/types";
import {
  getStapleWrapUpAdjustmentIntent,
  type StapleWrapUpAdjustmentIntent
} from "@/lib/settings/staples";
import {
  buildWeeklyWrapUpCandidates,
  toUnusedGroceryCandidate,
  type WrapUpGroceryItem,
  type WrapUpGroceryItemSource,
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
  manual_item: boolean;
};

type GroceryItemSourceRow = {
  grocery_list_item_id: string;
  meal_profiles: JoinedValue<{ name: string }>;
  notes: string | null;
  quantity: number | string | null;
  recipes: JoinedValue<{ name: string }>;
  source_id: string | null;
  source_label: string | null;
  source_type: string;
  unit: string | null;
};

type RecipeReviewRow = {
  weekly_plan_item_id: string | null;
};

type RecipeReviewSignalRow = {
  created_at: string;
  meal_profile_id: string | null;
  quick_tags: string[];
  rating: RecipeRating | null;
  recipe_id: string;
};

type WrapUpRow = {
  dismissed: boolean;
  id: string;
  status: WrapUpStatus;
  weekly_plan_id: string;
};

type WrapUpItemRow = {
  grocery_list_item_id: string | null;
  grocery_list_items: JoinedValue<{ display_name: string; manual_item: boolean }>;
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

type StapleWrapUpAdjustmentRow = {
  response: Record<string, unknown>;
};

export type WeeklyWrapUpItem = {
  actionHref: string | null;
  actionLabel: string | null;
  classification: string | null;
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
  sourceKinds: string[];
  sources: WrapUpGroceryItemSource[];
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

export async function getStapleWrapUpAdjustmentReview({
  householdId,
  wrapUpItemId
}: {
  householdId: string;
  wrapUpItemId: string;
}): Promise<StapleWrapUpAdjustmentIntent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_wrap_up_items")
    .select("response")
    .eq("household_id", householdId)
    .eq("id", wrapUpItemId)
    .eq("prompt_type", "unused_grocery_item")
    .eq("status", "completed")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return getStapleWrapUpAdjustmentIntent(
    (data as StapleWrapUpAdjustmentRow | null)?.response ?? null
  );
}

export async function getRecipeReviewSignals(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_reviews")
    .select("recipe_id, meal_profile_id, rating, quick_tags, created_at")
    .eq("household_id", householdId)
    .not("meal_profile_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const signalsByKey = new Map<string, RecipeReviewSignal>();

  for (const row of (data ?? []) as RecipeReviewSignalRow[]) {
    if (!row.meal_profile_id) {
      continue;
    }

    const key = `${row.recipe_id}:${row.meal_profile_id}`;
    const signal =
      signalsByKey.get(key) ??
      ({
        leftoverCount: 0,
        mealProfileId: row.meal_profile_id,
        rating: null,
        recipeId: row.recipe_id,
        skippedCount: 0
      } satisfies RecipeReviewSignal);

    if (!signal.rating && row.rating) {
      signal.rating = row.rating;
    }

    if (row.quick_tags.includes("skipped")) {
      signal.skippedCount += 1;
    }

    if (row.quick_tags.some(isLeftoverQuickTag)) {
      signal.leftoverCount += 1;
    }

    signalsByKey.set(key, signal);
  }

  return Array.from(signalsByKey.values());
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
    .select("id, display_name, checked, already_have, manual_item")
    .eq("household_id", householdId)
    .eq("grocery_list_id", groceryListId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as GroceryItemRow[];
  const sourcesByItemId = await getWrapUpGroceryItemSources(
    supabase,
    householdId,
    rows.map((item) => item.id)
  );

  return ((data ?? []) as GroceryItemRow[]).map(
    (item): WrapUpGroceryItem => ({
      alreadyHave: item.already_have,
      checked: item.checked,
      displayName: item.display_name,
      groceryListItemId: item.id,
      manualItem: item.manual_item,
      sources: sourcesByItemId.get(item.id) ?? []
    })
  );
}

async function getWrapUpGroceryItemSources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  groceryListItemIds: string[]
) {
  const sourcesByItemId = new Map<string, WrapUpGroceryItemSource[]>();

  if (groceryListItemIds.length === 0) {
    return sourcesByItemId;
  }

  const { data, error } = await supabase
    .from("grocery_item_sources")
    .select(
      "grocery_list_item_id, source_type, source_id, source_label, notes, quantity, unit, meal_profiles(name), recipes(name)"
    )
    .eq("household_id", householdId)
    .in("grocery_list_item_id", groceryListItemIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const source of (data ?? []) as GroceryItemSourceRow[]) {
    const sources = sourcesByItemId.get(source.grocery_list_item_id) ?? [];
    sources.push({
      label: source.source_label,
      mealProfileName: getJoinedValue(source.meal_profiles)?.name ?? null,
      notes: source.notes,
      quantity: toNullableNumber(source.quantity),
      recipeName: getJoinedValue(source.recipes)?.name ?? null,
      sourceId: source.source_id,
      sourceType: source.source_type,
      unit: source.unit
    });
    sourcesByItemId.set(source.grocery_list_item_id, sources);
  }

  return sourcesByItemId;
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
      "id, prompt_type, status, response, weekly_plan_item_id, grocery_list_item_id, weekly_plan_items(display_name, meal_profile_id, meal_type, plan_date, recipe_id, meal_profiles(name), recipes(name, status)), grocery_list_items(display_name, manual_item)"
    )
    .eq("household_id", householdId)
    .eq("weekly_wrap_up_id", wrapUpId)
    .order("prompt_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as WrapUpItemRow[];
  const groceryItemIds = rows
    .map((item) => item.grocery_list_item_id)
    .filter((id): id is string => Boolean(id));
  const grocerySourcesByItemId = await getWrapUpGroceryItemSources(
    supabase,
    householdId,
    groceryItemIds
  );

  return rows.map((item) => {
    const planItem = getJoinedValue(item.weekly_plan_items);
    const groceryItem = getJoinedValue(item.grocery_list_items);
    const recipe = getJoinedValue(planItem?.recipes ?? null);
    const sourceAware =
      item.prompt_type === "unused_grocery_item" && item.grocery_list_item_id
        ? toUnusedGroceryCandidate({
            alreadyHave: false,
            checked: false,
            displayName: groceryItem?.display_name ?? "Wrap-up item",
            groceryListItemId: item.grocery_list_item_id,
            manualItem: groceryItem?.manual_item ?? false,
            sources: grocerySourcesByItemId.get(item.grocery_list_item_id) ?? []
          })
        : null;

    return {
      actionHref: sourceAware?.actionHref ?? null,
      actionLabel: sourceAware?.actionLabel ?? null,
      classification: sourceAware?.classification ?? null,
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
      sourceKinds: sourceAware?.sourceKinds ?? [],
      sources: sourceAware?.sources ?? [],
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

function toNullableNumber(value: number | string | null) {
  if (value === null || value === "") {
    return null;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function isLeftoverQuickTag(tag: string) {
  return ["some", "lots", "used_leftovers"].includes(tag);
}
