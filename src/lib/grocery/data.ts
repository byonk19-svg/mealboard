import { createClient } from "@/lib/supabase/server";
import {
  generateGroceryList,
  type GroceryGenerationPlanItem
} from "./generate-grocery-list";
import {
  getGroceryLifecycleTimestampField,
  getNextGroceryListStatus
} from "./lifecycle";

export type GroceryListStatus =
  | "draft"
  | "finalized"
  | "shopping_started"
  | "completed";

export type GroceryListItemSource = {
  id: string;
  label: string | null;
  mealProfileName: string | null;
  quantity: number | null;
  recipeName: string | null;
  sourceType: string;
  unit: string | null;
};

export type GroceryListItem = {
  alreadyHave: boolean;
  categoryName: string | null;
  categorySortOrder: number | null;
  checked: boolean;
  displayName: string;
  id: string;
  needsReview: boolean;
  preferredQuantityText: string | null;
  quantity: number | null;
  reviewReason: string | null;
  sortOrder: number;
  sources: GroceryListItemSource[];
  unit: string | null;
};

export type GroceryList = {
  createdAt: string;
  generatedAt: string | null;
  id: string;
  items: GroceryListItem[];
  name: string | null;
  status: GroceryListStatus;
  weekStartDate: string | null;
};

type WeeklyPlanRow = {
  id: string;
  week_start_date: string;
};

type WeeklyPlanItemRow = {
  display_name: string;
  id: string;
  is_approved: boolean;
  meal_profile_id: string | null;
  meal_profiles:
    | { name: string }
    | Array<{ name: string }>
    | null;
  meal_type: string;
  plan_date: string;
  recipe_id: string | null;
  recipes: { name: string } | Array<{ name: string }> | null;
  scale_factor: number | string | null;
};

type RecipeIngredientRow = {
  display_name: string;
  food_id: string | null;
  grocery_category_id: string | null;
  id: string;
  quantity: number | string | null;
  recipe_id: string;
  unit: string | null;
};

type PreferredProductRow = {
  food_id: string | null;
  preferred_quantity: string | null;
};

type InsertedGroceryListItem = {
  id: string;
  sort_order: number;
};

type GroceryListRow = {
  created_at: string;
  generated_at: string | null;
  id: string;
  name: string | null;
  status: GroceryListStatus;
  weekly_plans:
    | { week_start_date: string }
    | Array<{ week_start_date: string }>
    | null;
};

type GroceryListItemRow = {
  already_have: boolean;
  checked: boolean;
  display_name: string;
  grocery_categories:
    | { name: string; sort_order: number }
    | Array<{ name: string; sort_order: number }>
    | null;
  id: string;
  needs_review: boolean;
  preferred_quantity_text: string | null;
  quantity: number | string | null;
  review_reason: string | null;
  sort_order: number;
  unit: string | null;
};

type GroceryListItemSourceRow = {
  grocery_list_item_id: string;
  id: string;
  meal_profiles: { name: string } | Array<{ name: string }> | null;
  quantity: number | string | null;
  recipes: { name: string } | Array<{ name: string }> | null;
  source_label: string | null;
  source_type: string;
  unit: string | null;
};

export async function generateAndPersistGroceryList({
  householdId,
  weeklyPlanId
}: {
  householdId: string;
  weeklyPlanId: string;
}) {
  const supabase = await createClient();
  const weeklyPlan = await getScopedWeeklyPlan(
    supabase,
    householdId,
    weeklyPlanId
  );

  if (!weeklyPlan) {
    throw new Error("That weekly plan is no longer available.");
  }

  const weeklyPlanItems = await getApprovedWeeklyPlanItems(
    supabase,
    householdId,
    weeklyPlan.id
  );

  if (weeklyPlanItems.length === 0) {
    throw new Error("Approve at least one recipe before generating groceries.");
  }

  const recipeIds = Array.from(
    new Set(
      weeklyPlanItems
        .map((item) => item.recipe_id)
        .filter((recipeId): recipeId is string => Boolean(recipeId))
    )
  );
  const recipeIngredients = await getRecipeIngredients(
    supabase,
    householdId,
    recipeIds
  );

  if (recipeIngredients.length === 0) {
    throw new Error("Approved recipes need ingredients before generating groceries.");
  }

  const preferredQuantityByFoodId = await getPreferredQuantityByFoodId(
    supabase,
    householdId,
    recipeIngredients
      .map((ingredient) => ingredient.food_id)
      .filter((foodId): foodId is string => Boolean(foodId))
  );
  const generated = generateGroceryList({
    recipeIngredients: recipeIngredients.map((ingredient) => ({
      displayName: ingredient.display_name,
      foodId: ingredient.food_id,
      groceryCategoryId: ingredient.grocery_category_id,
      id: ingredient.id,
      preferredQuantityText: ingredient.food_id
        ? (preferredQuantityByFoodId.get(ingredient.food_id) ?? null)
        : null,
      quantity: toNullableNumber(ingredient.quantity),
      recipeId: ingredient.recipe_id,
      unit: ingredient.unit
    })),
    weeklyPlanItems: weeklyPlanItems.map(toGenerationPlanItem)
  });

  if (generated.items.length === 0) {
    throw new Error("No grocery items were generated from approved recipes.");
  }

  const { error: deleteDraftError } = await supabase
    .from("grocery_lists")
    .delete()
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlan.id)
    .eq("status", "draft");

  if (deleteDraftError) {
    throw new Error(deleteDraftError.message);
  }

  const groceryListId = await createGroceryList(
    supabase,
    householdId,
    weeklyPlan
  );

  try {
    const itemIdByIndex = await createGroceryListItems(
      supabase,
      householdId,
      groceryListId,
      generated.items
    );
    await createGroceryItemSources(
      supabase,
      householdId,
      itemIdByIndex,
      generated.sources
    );
  } catch (error) {
    await supabase
      .from("grocery_lists")
      .delete()
      .eq("household_id", householdId)
      .eq("id", groceryListId);
    throw error;
  }

  return groceryListId;
}

export async function getLatestGroceryList(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grocery_lists")
    .select(
      "id, name, status, generated_at, created_at, weekly_plans(week_start_date)"
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const groceryList = data as GroceryListRow;
  const items = await getGroceryListItems(supabase, householdId, groceryList.id);
  const weekStartDate =
    getJoinedValue(groceryList.weekly_plans)?.week_start_date ?? null;

  return {
    createdAt: groceryList.created_at,
    generatedAt: groceryList.generated_at,
    id: groceryList.id,
    items,
    name: groceryList.name,
    status: groceryList.status,
    weekStartDate
  } satisfies GroceryList;
}

export async function updateGroceryListItemState({
  alreadyHave,
  checked,
  householdId,
  itemId
}: {
  alreadyHave?: boolean;
  checked?: boolean;
  householdId: string;
  itemId: string;
}) {
  const updates: { already_have?: boolean; checked?: boolean } = {};

  if (typeof alreadyHave === "boolean") {
    updates.already_have = alreadyHave;
  }

  if (typeof checked === "boolean") {
    updates.checked = checked;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("Choose an item state to update.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grocery_list_items")
    .update(updates)
    .eq("household_id", householdId)
    .eq("id", itemId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("That grocery item is no longer available.");
  }
}

export async function advanceGroceryListLifecycle({
  groceryListId,
  householdId
}: {
  groceryListId: string;
  householdId: string;
}) {
  const supabase = await createClient();
  const { data: currentList, error: currentListError } = await supabase
    .from("grocery_lists")
    .select("id, status")
    .eq("household_id", householdId)
    .eq("id", groceryListId)
    .maybeSingle();

  if (currentListError) {
    throw new Error(currentListError.message);
  }

  if (!currentList) {
    throw new Error("That grocery list is no longer available.");
  }

  const currentStatus = currentList.status as GroceryListStatus;
  const nextStatus = getNextGroceryListStatus(currentStatus);

  if (!nextStatus) {
    throw new Error("This grocery list is already completed.");
  }

  const timestampField = getGroceryLifecycleTimestampField(nextStatus);
  const { data: updatedList, error: updateError } = await supabase
    .from("grocery_lists")
    .update({
      [timestampField]: new Date().toISOString(),
      status: nextStatus
    })
    .eq("household_id", householdId)
    .eq("id", groceryListId)
    .eq("status", currentStatus)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedList) {
    throw new Error("The grocery list changed. Reload and try again.");
  }

  return nextStatus;
}

async function getScopedWeeklyPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("id, week_start_date")
    .eq("household_id", householdId)
    .eq("id", weeklyPlanId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WeeklyPlanRow | null;
}

async function getApprovedWeeklyPlanItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data, error } = await supabase
    .from("weekly_plan_items")
    .select(
      "id, display_name, is_approved, meal_profile_id, meal_type, plan_date, recipe_id, scale_factor, meal_profiles(name), recipes(name)"
    )
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .eq("is_approved", true)
    .not("recipe_id", "is", null)
    .order("plan_date", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WeeklyPlanItemRow[];
}

async function getRecipeIngredients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  recipeIds: string[]
) {
  if (recipeIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      "id, recipe_id, food_id, display_name, quantity, unit, grocery_category_id"
    )
    .eq("household_id", householdId)
    .in("recipe_id", recipeIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RecipeIngredientRow[];
}

async function getPreferredQuantityByFoodId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  foodIds: string[]
) {
  const preferredQuantityByFoodId = new Map<string, string>();

  if (foodIds.length === 0) {
    return preferredQuantityByFoodId;
  }

  const { data, error } = await supabase
    .from("preferred_products")
    .select("food_id, preferred_quantity")
    .eq("household_id", householdId)
    .in("food_id", Array.from(new Set(foodIds)))
    .not("preferred_quantity", "is", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const product of (data ?? []) as PreferredProductRow[]) {
    if (
      product.food_id &&
      product.preferred_quantity &&
      !preferredQuantityByFoodId.has(product.food_id)
    ) {
      preferredQuantityByFoodId.set(product.food_id, product.preferred_quantity);
    }
  }

  return preferredQuantityByFoodId;
}

async function createGroceryList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlan: WeeklyPlanRow
) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .insert({
      generated_at: new Date().toISOString(),
      household_id: householdId,
      name: `Groceries for week of ${weeklyPlan.week_start_date}`,
      status: "draft",
      weekly_plan_id: weeklyPlan.id
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
}

async function createGroceryListItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  groceryListId: string,
  items: ReturnType<typeof generateGroceryList>["items"]
) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .insert(
      items.map((item, index) => ({
        display_name: item.displayName,
        food_id: item.foodId,
        grocery_category_id: item.categoryId,
        grocery_list_id: groceryListId,
        household_id: householdId,
        needs_review: item.needsReview,
        preferred_quantity_text: item.preferredQuantityText,
        quantity: item.quantity,
        review_reason: item.reviewReason,
        sort_order: index,
        unit: item.unit
      }))
    )
    .select("id, sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as InsertedGroceryListItem[]).map((item) => [
      item.sort_order,
      item.id
    ])
  );
}

async function createGroceryItemSources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  itemIdByIndex: Map<number, string>,
  sources: ReturnType<typeof generateGroceryList>["sources"]
) {
  const sourceRows = sources.map((source) => {
    const groceryListItemId = itemIdByIndex.get(source.groceryItemIndex);

    if (!groceryListItemId) {
      throw new Error("Generated grocery source did not match an item.");
    }

    return {
      grocery_list_item_id: groceryListItemId,
      household_id: householdId,
      meal_profile_id: source.mealProfileId,
      quantity: source.quantity,
      recipe_id: source.recipeId,
      recipe_ingredient_id: source.ingredientId,
      source_label: source.label,
      source_type: source.sourceType,
      unit: source.unit,
      weekly_plan_item_id: source.weeklyPlanItemId
    };
  });

  const { error } = await supabase
    .from("grocery_item_sources")
    .insert(sourceRows);

  if (error) {
    throw new Error(error.message);
  }
}

async function getGroceryListItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  groceryListId: string
) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .select(
      "id, display_name, quantity, unit, preferred_quantity_text, checked, already_have, needs_review, review_reason, sort_order, grocery_categories(name, sort_order)"
    )
    .eq("household_id", householdId)
    .eq("grocery_list_id", groceryListId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const items = ((data ?? []) as GroceryListItemRow[]).map((row) => {
    const category = getJoinedValue(row.grocery_categories);

    return {
      alreadyHave: row.already_have,
      categoryName: category?.name ?? null,
      categorySortOrder: category?.sort_order ?? null,
      checked: row.checked,
      displayName: row.display_name,
      id: row.id,
      needsReview: row.needs_review,
      preferredQuantityText: row.preferred_quantity_text,
      quantity: toNullableNumber(row.quantity),
      reviewReason: row.review_reason,
      sortOrder: row.sort_order,
      sources: [],
      unit: row.unit
    } satisfies GroceryListItem;
  });
  const sourcesByItemId = await getGroceryItemSources(
    supabase,
    householdId,
    items.map((item) => item.id)
  );

  return items.map((item) => ({
    ...item,
    sources: sourcesByItemId.get(item.id) ?? []
  }));
}

async function getGroceryItemSources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  groceryListItemIds: string[]
) {
  const sourcesByItemId = new Map<string, GroceryListItemSource[]>();

  if (groceryListItemIds.length === 0) {
    return sourcesByItemId;
  }

  const { data, error } = await supabase
    .from("grocery_item_sources")
    .select(
      "id, grocery_list_item_id, source_type, source_label, quantity, unit, meal_profiles(name), recipes(name)"
    )
    .eq("household_id", householdId)
    .in("grocery_list_item_id", groceryListItemIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const source of (data ?? []) as GroceryListItemSourceRow[]) {
    const itemSources = sourcesByItemId.get(source.grocery_list_item_id) ?? [];
    const profile = getJoinedValue(source.meal_profiles);
    const recipe = getJoinedValue(source.recipes);
    itemSources.push({
      id: source.id,
      label: source.source_label,
      mealProfileName: profile?.name ?? null,
      quantity: toNullableNumber(source.quantity),
      recipeName: recipe?.name ?? null,
      sourceType: source.source_type,
      unit: source.unit
    });
    sourcesByItemId.set(source.grocery_list_item_id, itemSources);
  }

  return sourcesByItemId;
}

function toGenerationPlanItem(
  row: WeeklyPlanItemRow
): GroceryGenerationPlanItem {
  return {
    displayName: row.display_name,
    id: row.id,
    isApproved: row.is_approved,
    mealProfileId: row.meal_profile_id,
    mealProfileName: getJoinedValue(row.meal_profiles)?.name ?? null,
    mealType: row.meal_type,
    planDate: row.plan_date,
    recipeId: row.recipe_id,
    recipeName: getJoinedValue(row.recipes)?.name ?? null,
    scaleFactor: toNullableNumber(row.scale_factor)
  };
}

function toNullableNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getJoinedValue<T>(value: T | T[] | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
