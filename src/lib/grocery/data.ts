import { createClient } from "@/lib/supabase/server";
import {
  generateGroceryList,
  type GeneratedGroceryList,
  type GroceryGenerationPlanItem,
  type GroceryGenerationSelectedStaple
} from "./generate-grocery-list";
import {
  buildPendingGroceryChanges,
  type PendingGroceryChanges
} from "./pending-grocery-changes";
import {
  getGroceryLifecycleTimestampField,
  getNextGroceryListStatus
} from "./lifecycle";
import {
  buildManualGrocerySourceLabel,
  type NormalizedManualGroceryItemInput
} from "./manual-grocery-item";

export type GroceryListStatus =
  | "draft"
  | "finalized"
  | "shopping_started"
  | "completed";

export type GroceryListItemSource = {
  id: string;
  label: string | null;
  mealProfileName: string | null;
  notes: string | null;
  quantity: number | null;
  recipeName: string | null;
  sourceId: string | null;
  sourceType: string;
  unit: string | null;
};

export type GroceryListItem = {
  alreadyHave: boolean;
  categoryName: string | null;
  categorySortOrder: number | null;
  checked: boolean;
  displayName: string;
  foodId: string | null;
  id: string;
  manualItem: boolean;
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
  baby_plan_slot: string | null;
  component_type: string;
  display_name: string;
  food_id: string | null;
  foods:
    | { name: string; default_grocery_category_id: string | null }
    | Array<{ name: string; default_grocery_category_id: string | null }>
    | null;
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

type WeeklyPlanStapleRow = {
  staple_id: string;
};

type SelectedStapleRow = {
  default_quantity: number | string | null;
  default_unit: string | null;
  display_name: string;
  food_id: string | null;
  grocery_category_id: string | null;
  id: string;
  meal_profile_id: string | null;
  meal_profiles: { name: string } | Array<{ name: string }> | null;
  notes: string | null;
  preferred_quantity_text: string | null;
};

type PreferredProductRow = {
  food_id: string | null;
  preferred_quantity: string | null;
};

type InsertedGroceryListItem = {
  id: string;
  sort_order: number;
};

type LatestGroceryListItemSortOrderRow = {
  sort_order: number;
};

type MealProfileNameRow = {
  name: string;
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
  food_id: string | null;
  grocery_categories:
    | { name: string; sort_order: number }
    | Array<{ name: string; sort_order: number }>
    | null;
  id: string;
  manual_item: boolean;
  needs_review: boolean;
  preferred_quantity_text: string | null;
  quantity: number | string | null;
  review_reason: string | null;
  sort_order: number;
  unit: string | null;
};

type SwapCandidateRecipeRow = {
  id: string;
  name: string;
};

export type WeeklyPlanPendingGroceryChanges = {
  changes: PendingGroceryChanges;
  groceryList: {
    createdAt: string;
    id: string;
    name: string | null;
    status: GroceryListStatus;
  };
};

export type SwapGroceryImpact = {
  addedCount: number;
  appliesToApprovedItem: boolean;
  hasChanges: boolean;
  hasGroceryList: boolean;
  keptCount: number;
  listStatus: GroceryListStatus | null;
  recipeId: string;
  removedCount: number;
};

type GroceryListItemSourceRow = {
  grocery_list_item_id: string;
  id: string;
  meal_profiles: { name: string } | Array<{ name: string }> | null;
  notes: string | null;
  quantity: number | string | null;
  recipes: { name: string } | Array<{ name: string }> | null;
  source_label: string | null;
  source_id: string | null;
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

  const generated = await buildGeneratedGroceryListForWeeklyPlan({
    allowEmpty: false,
    householdId,
    supabase,
    weeklyPlan
  });
  const protectedList = await getProtectedGroceryListForWeeklyPlan(
    supabase,
    householdId,
    weeklyPlan.id
  );

  if (protectedList) {
    throw new Error(
      "This grocery list is already protected. Review pending changes before replacing it."
    );
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

export async function getPendingGroceryChangesForWeeklyPlan({
  householdId,
  weeklyPlanId
}: {
  householdId: string;
  weeklyPlanId: string;
}): Promise<WeeklyPlanPendingGroceryChanges | null> {
  const supabase = await createClient();
  const weeklyPlan = await getScopedWeeklyPlan(
    supabase,
    householdId,
    weeklyPlanId
  );

  if (!weeklyPlan) {
    throw new Error("That weekly plan is no longer available.");
  }

  const { data: protectedList, error } = await supabase
    .from("grocery_lists")
    .select("id, name, status, created_at")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlan.id)
    .in("status", ["finalized", "shopping_started"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!protectedList) {
    return null;
  }

  const [currentItems, generated] = await Promise.all([
    getGroceryListItems(supabase, householdId, protectedList.id),
    buildGeneratedGroceryListForWeeklyPlan({
      allowEmpty: true,
      householdId,
      supabase,
      weeklyPlan
    })
  ]);

  return {
    changes: buildPendingGroceryChanges({
      currentItems: currentItems.map((item) => ({
        displayName: item.displayName,
        foodId: item.foodId,
        manualItem: item.manualItem,
        preferredQuantityText: item.preferredQuantityText,
        quantity: item.quantity,
        unit: item.unit
      })),
      generatedItems: generated.items
    }),
    groceryList: {
      createdAt: protectedList.created_at,
      id: protectedList.id,
      name: protectedList.name,
      status: protectedList.status as GroceryListStatus
    }
  };
}

export async function getSwapGroceryImpactsForWeeklyPlanItem({
  householdId,
  recipeIds,
  targetItemId,
  weeklyPlanId
}: {
  householdId: string;
  recipeIds: string[];
  targetItemId: string;
  weeklyPlanId: string;
}): Promise<SwapGroceryImpact[]> {
  const uniqueRecipeIds = Array.from(new Set(recipeIds));

  if (uniqueRecipeIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const weeklyPlan = await getScopedWeeklyPlan(
    supabase,
    householdId,
    weeklyPlanId
  );

  if (!weeklyPlan) {
    throw new Error("That weekly plan is no longer available.");
  }

  const [latestList, approvedPlanItems, selectedStaples, candidateRecipes] =
    await Promise.all([
      getLatestGroceryListForWeeklyPlan(supabase, householdId, weeklyPlan.id),
      getApprovedWeeklyPlanItems(supabase, householdId, weeklyPlan.id),
      getSelectedWeeklyPlanStaples(supabase, householdId, weeklyPlan.id),
      getSwapCandidateRecipes(supabase, householdId, uniqueRecipeIds)
    ]);
  const targetPlanItem = approvedPlanItems.find(
    (item) => item.id === targetItemId
  );

  if (!latestList || !targetPlanItem) {
    return uniqueRecipeIds.map((recipeId) => ({
      addedCount: 0,
      appliesToApprovedItem: Boolean(targetPlanItem),
      hasChanges: false,
      hasGroceryList: Boolean(latestList),
      keptCount: 0,
      listStatus: latestList?.status ?? null,
      recipeId,
      removedCount: 0
    }));
  }

  const recipeIdsForPreview = Array.from(
    new Set([
      ...approvedPlanItems
        .map((item) => item.recipe_id)
        .filter((recipeId): recipeId is string => Boolean(recipeId)),
      ...uniqueRecipeIds
    ])
  );
  const [currentItems, recipeIngredients] = await Promise.all([
    getGroceryListItems(supabase, householdId, latestList.id),
    getRecipeIngredients(supabase, householdId, recipeIdsForPreview)
  ]);
  const preferredQuantityByFoodId = await getPreferredQuantityByFoodId(
    supabase,
    householdId,
    recipeIngredients
      .map((ingredient) => ingredient.food_id)
      .filter((foodId): foodId is string => Boolean(foodId))
  );
  const candidateRecipeById = new Map(
    candidateRecipes.map((recipe) => [recipe.id, recipe])
  );
  const recipeIngredientInputs = recipeIngredients.map((ingredient) => ({
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
  }));
  const currentComparableItems = currentItems.map((item) => ({
    displayName: item.displayName,
    foodId: item.foodId,
    manualItem: item.manualItem,
    preferredQuantityText: item.preferredQuantityText,
    quantity: item.quantity,
    unit: item.unit
  }));

  return uniqueRecipeIds.map((recipeId) => {
    const candidateRecipe = candidateRecipeById.get(recipeId);
    const hypotheticalPlanItems = approvedPlanItems.map((item) =>
      item.id === targetItemId && candidateRecipe
        ? ({
            ...item,
            display_name: candidateRecipe.name,
            recipe_id: candidateRecipe.id,
            recipes: { name: candidateRecipe.name }
          } satisfies WeeklyPlanItemRow)
        : item
    );
    const generated = generateGroceryList({
      recipeIngredients: recipeIngredientInputs,
      selectedStaples: selectedStaples.map(toGenerationSelectedStaple),
      weeklyPlanItems: hypotheticalPlanItems.map(toGenerationPlanItem)
    });
    const changes = buildPendingGroceryChanges({
      currentItems: currentComparableItems,
      generatedItems: generated.items
    });

    return {
      addedCount: changes.addedCount,
      appliesToApprovedItem: true,
      hasChanges: changes.hasChanges,
      hasGroceryList: true,
      keptCount: changes.keptCount,
      listStatus: latestList.status,
      recipeId,
      removedCount: changes.removedCount
    };
  });
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
  const listStatus = await getGroceryListStatusForItem(
    supabase,
    householdId,
    itemId
  );

  if (!listStatus) {
    throw new Error("That grocery item is no longer available.");
  }

  if (!canToggleGroceryItemState(listStatus)) {
    throw new Error("This grocery list is no longer editable.");
  }

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

export async function addManualGroceryItem({
  groceryCategoryId,
  groceryListId,
  householdId,
  item,
  mealProfileId
}: {
  groceryCategoryId: string | null;
  groceryListId: string;
  householdId: string;
  item: NormalizedManualGroceryItemInput;
  mealProfileId: string | null;
}) {
  const supabase = await createClient();
  const listStatus = await getGroceryListStatus(
    supabase,
    householdId,
    groceryListId
  );

  if (!listStatus) {
    throw new Error("That grocery list is no longer available.");
  }

  if (!canAddManualItem(listStatus)) {
    throw new Error("Manual items can only be added before the list is finalized or while shopping.");
  }

  const mealProfileName = mealProfileId
    ? await getScopedMealProfileName(supabase, householdId, mealProfileId)
    : null;
  const sortOrder = await getNextGroceryItemSortOrder(
    supabase,
    householdId,
    groceryListId
  );
  const { data: insertedItem, error: itemError } = await supabase
    .from("grocery_list_items")
    .insert({
      display_name: item.displayName,
      grocery_category_id: groceryCategoryId,
      grocery_list_id: groceryListId,
      household_id: householdId,
      manual_item: true,
      notes: item.note,
      quantity: item.quantity,
      sort_order: sortOrder,
      unit: item.unit
    })
    .select("id")
    .maybeSingle();

  if (itemError) {
    throw new Error(itemError.message);
  }

  if (!insertedItem) {
    throw new Error("Manual grocery item could not be added.");
  }

  const { error: sourceError } = await supabase
    .from("grocery_item_sources")
    .insert({
      grocery_list_item_id: insertedItem.id,
      household_id: householdId,
      meal_profile_id: mealProfileId,
      notes: item.note,
      quantity: item.quantity,
      source_label: buildManualGrocerySourceLabel(mealProfileName),
      source_id: null,
      source_type: "manual_add",
      unit: item.unit
    });

  if (sourceError) {
    await supabase
      .from("grocery_list_items")
      .delete()
      .eq("household_id", householdId)
      .eq("id", insertedItem.id);
    throw new Error(sourceError.message);
  }
}

async function getProtectedGroceryListForWeeklyPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("id")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .in("status", ["finalized", "shopping_started"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getLatestGroceryListForWeeklyPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("id, status")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as { id: string; status: GroceryListStatus } | null;
}

async function getGroceryListStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  groceryListId: string
) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("status")
    .eq("household_id", householdId)
    .eq("id", groceryListId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.status as GroceryListStatus | undefined;
}

async function getGroceryListStatusForItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  itemId: string
) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .select("grocery_lists(status)")
    .eq("household_id", householdId)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const joinedList = getJoinedValue(
    data?.grocery_lists as { status: GroceryListStatus } | Array<{ status: GroceryListStatus }> | null | undefined
  );

  return joinedList?.status;
}

function canToggleGroceryItemState(status: GroceryListStatus) {
  return status === "draft" || status === "shopping_started";
}

function canAddManualItem(status: GroceryListStatus) {
  return status === "draft" || status === "shopping_started";
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

async function getScopedMealProfileName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  mealProfileId: string
) {
  const { data, error } = await supabase
    .from("meal_profiles")
    .select("name")
    .eq("household_id", householdId)
    .eq("id", mealProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("That meal profile is no longer available.");
  }

  return (data as MealProfileNameRow).name;
}

async function getNextGroceryItemSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  groceryListId: string
) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .select("sort_order")
    .eq("household_id", householdId)
    .eq("grocery_list_id", groceryListId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? ((data as LatestGroceryListItemSortOrderRow).sort_order + 1) : 0;
}

async function buildGeneratedGroceryListForWeeklyPlan({
  allowEmpty,
  householdId,
  supabase,
  weeklyPlan
}: {
  allowEmpty: boolean;
  householdId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  weeklyPlan: WeeklyPlanRow;
}): Promise<GeneratedGroceryList> {
  const weeklyPlanItems = await getApprovedWeeklyPlanItems(
    supabase,
    householdId,
    weeklyPlan.id
  );
  const selectedStaples = await getSelectedWeeklyPlanStaples(
    supabase,
    householdId,
    weeklyPlan.id
  );

  if (!allowEmpty && weeklyPlanItems.length === 0 && selectedStaples.length === 0) {
    throw new Error(
      "Approve at least one recipe or select one staple before generating groceries."
    );
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

  const recipeBackedItemCount = weeklyPlanItems.filter(
    (item) => item.recipe_id
  ).length;

  if (!allowEmpty && recipeBackedItemCount > 0 && recipeIngredients.length === 0) {
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
    selectedStaples: selectedStaples.map(toGenerationSelectedStaple),
    weeklyPlanItems: weeklyPlanItems.map(toGenerationPlanItem)
  });

  if (!allowEmpty && generated.items.length === 0) {
    throw new Error("No grocery items were generated from this weekly plan.");
  }

  return generated;
}

async function getApprovedWeeklyPlanItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data, error } = await supabase
    .from("weekly_plan_items")
    .select(
      "id, baby_plan_slot, component_type, display_name, food_id, is_approved, meal_profile_id, meal_type, plan_date, recipe_id, scale_factor, foods(name, default_grocery_category_id), meal_profiles(name), recipes(name)"
    )
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .eq("is_approved", true)
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

async function getSwapCandidateRecipes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  recipeIds: string[]
) {
  if (recipeIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("id, name")
    .eq("household_id", householdId)
    .in("id", recipeIds)
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SwapCandidateRecipeRow[];
}

async function getSelectedWeeklyPlanStaples(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
  weeklyPlanId: string
) {
  const { data: selections, error: selectionError } = await supabase
    .from("weekly_plan_staples")
    .select("staple_id")
    .eq("household_id", householdId)
    .eq("weekly_plan_id", weeklyPlanId)
    .order("created_at", { ascending: true });

  if (selectionError) {
    throw new Error(selectionError.message);
  }

  const stapleIds = ((selections ?? []) as WeeklyPlanStapleRow[]).map(
    (selection) => selection.staple_id
  );

  if (stapleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("staples")
    .select(
      "id, meal_profile_id, food_id, display_name, default_quantity, default_unit, preferred_quantity_text, grocery_category_id, notes, meal_profiles(name)"
    )
    .eq("household_id", householdId)
    .eq("active", true)
    .in("id", stapleIds)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SelectedStapleRow[];
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
      notes: source.notes,
      quantity: source.quantity,
      recipe_id: source.recipeId,
      recipe_ingredient_id: source.ingredientId,
      source_label: source.label,
      source_id: source.sourceId,
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
      "id, food_id, display_name, quantity, unit, preferred_quantity_text, checked, already_have, manual_item, needs_review, review_reason, sort_order, grocery_categories(name, sort_order)"
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
      foodId: row.food_id,
      id: row.id,
      manualItem: row.manual_item,
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
      "id, grocery_list_item_id, source_type, source_id, source_label, notes, quantity, unit, meal_profiles(name), recipes(name)"
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
      notes: source.notes,
      quantity: toNullableNumber(source.quantity),
      recipeName: recipe?.name ?? null,
      sourceId: source.source_id,
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
    babyPlanSlot: row.baby_plan_slot,
    componentType: row.component_type,
    displayName: row.display_name,
    foodId: row.food_id,
    foodName: getJoinedValue(row.foods)?.name ?? null,
    groceryCategoryId:
      getJoinedValue(row.foods)?.default_grocery_category_id ?? null,
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

function toGenerationSelectedStaple(
  row: SelectedStapleRow
): GroceryGenerationSelectedStaple {
  return {
    defaultQuantity: toNullableNumber(row.default_quantity),
    defaultUnit: row.default_unit,
    displayName: row.display_name,
    foodId: row.food_id,
    groceryCategoryId: row.grocery_category_id,
    id: row.id,
    mealProfileId: row.meal_profile_id,
    mealProfileName: getJoinedValue(row.meal_profiles)?.name ?? null,
    notes: row.notes,
    preferredQuantityText: row.preferred_quantity_text
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
