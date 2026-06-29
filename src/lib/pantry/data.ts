import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPantryRestockGroceryAddOperation,
  isEditablePantryRestockGroceryListStatus
} from "./restock-add";
import { buildPantryEventTypes, normalizePantryItemInput } from "./domain";
import {
  buildPantryRestockCandidates,
  type PantryRestockGroceryList
} from "./restock-candidates";
import {
  buildPantryIntakeCandidates,
  type PantryIntakeCandidate,
  type PantryIntakeDecision,
  type PantryIntakeGroceryList
} from "./intake-candidates";
import {
  buildPantryConsumptionCandidates,
  type PantryConsumptionCandidate,
  type PantryConsumptionCookingSession,
  type PantryConsumptionDecision
} from "./consumption-candidates";
import {
  buildConfirmedPantryIntakeDecisionInsert,
  buildPantryItemInputFromIntakeCandidate,
  buildSkippedPantryIntakeDecisionInsert,
  type PantryIntakeConfirmInput,
  type PantryIntakeConfirmResult,
  type PantryIntakeSkipResult
} from "./intake-review";
import {
  buildConfirmedPantryConsumptionDecisionInsert,
  buildSkippedPantryConsumptionDecisionInsert,
  type PantryConsumptionConfirmResult,
  type PantryConsumptionSkipResult
} from "./consumption-review";
import type {
  NormalizedPantryItemInput,
  PantryEvent,
  PantryEventType,
  PantryItem,
  PantryItemInput,
  PantryStockStatus
} from "./types";
import { createClient } from "@/lib/supabase/server";

type JoinedName = { name: string } | { name: string }[] | null;

type PantryItemRow = {
  created_at: string;
  discarded_at: string | null;
  display_name: string;
  expiration_date: string | null;
  food_id: string;
  foods:
    | { default_grocery_category_id: string | null; name: string }
    | Array<{ default_grocery_category_id: string | null; name: string }>
    | null;
  grocery_categories:
    | { name: string; sort_order: number }
    | Array<{ name: string; sort_order: number }>
    | null;
  grocery_category_id: string | null;
  household_id: string;
  id: string;
  is_open: boolean;
  low_stock_threshold_quantity: number | string | null;
  low_stock_threshold_unit: string | null;
  meal_profile_id: string | null;
  meal_profiles: JoinedName;
  notes: string | null;
  opened_at: string | null;
  package_detail: string | null;
  quantity: number | string | null;
  quantity_note: string | null;
  stock_status: PantryStockStatus;
  storage_location: string | null;
  unit: string | null;
  updated_at: string;
};

type PantryEventRow = {
  after_state: Record<string, unknown> | null;
  before_state: Record<string, unknown> | null;
  created_at: string;
  event_type: PantryEventType;
  household_id: string;
  id: string;
  note: string | null;
  pantry_item_id: string;
};

type PantryRestockGroceryListRow = {
  created_at: string;
  grocery_list_items:
    | Array<{ display_name: string; food_id: string | null; id: string }>
    | null;
  id: string;
  status: PantryRestockGroceryList["status"];
};

type PantryIntakeGroceryListRow = {
  completed_at: string | null;
  created_at: string;
  grocery_list_items: Array<{
    already_have: boolean;
    checked: boolean;
    display_name: string;
    food_id: string | null;
    foods: JoinedName;
    grocery_categories: JoinedName;
    grocery_category_id: string | null;
    grocery_list_id: string;
    id: string;
    preferred_quantity_text: string | null;
    quantity: number | string | null;
    sort_order: number;
    unit: string | null;
  }> | null;
  id: string;
  name: string | null;
  status: PantryIntakeGroceryList["status"];
  weekly_plans:
    | { week_start_date: string | null }
    | Array<{ week_start_date: string | null }>
    | null;
};

type PantryIntakeDecisionRow = {
  created_pantry_item_id: string | null;
  grocery_list_item_id: string;
  status: PantryIntakeDecision["status"];
};

type PantryConsumptionDecisionRow = {
  cooking_session_ingredient_id: string;
  status: PantryConsumptionDecision["status"];
};

type PantryConsumptionCookingSessionRow = {
  completed_at: string | null;
  cooking_session_ingredients: Array<{
    display_name: string;
    food_id: string | null;
    foods: JoinedName;
    id: string;
    is_ready: boolean;
    notes: string | null;
    optional: boolean;
    preparation: string | null;
    quantity: number | string | null;
    ready_at: string | null;
    sort_order: number;
    unit: string | null;
  }> | null;
  created_at: string;
  id: string;
  recipe_id: string;
  recipe_name_snapshot: string;
  scale_factor_snapshot: number | string;
  servings_snapshot: number | string | null;
  started_at: string;
  status: PantryConsumptionCookingSession["status"];
};

type GroceryItemSourceRow = {
  grocery_list_item_id: string;
  meal_profiles: JoinedName;
  notes: string | null;
  quantity: number | string | null;
  source_label: string | null;
  source_type: string;
  unit: string | null;
};

export type AddPantryRestockCandidateResult =
  | {
      groceryListId: string;
      groceryListItemId: string;
      status: "added";
    }
  | {
      groceryListId: string;
      groceryListItemId: string;
      status: "already_on_grocery_list";
    };

export async function getPantryItems(
  householdId: string,
  options: { includeDiscarded?: boolean } = {}
) {
  const supabase = await createClient();
  return getPantryItemsWithClient({ householdId, options, supabase });
}

export async function getPantryEvents(householdId: string, pantryItemId: string) {
  const supabase = await createClient();
  return getPantryEventsWithClient({ householdId, pantryItemId, supabase });
}

export async function getRecentPantryEvents(
  householdId: string,
  options: { limit?: number } = {}
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pantry_events")
    .select(
      "id, household_id, pantry_item_id, event_type, before_state, after_state, note, created_at"
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 20);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryEventRow[]).map(mapPantryEventRow);
}

export async function getPantryRestockCandidates(householdId: string) {
  const supabase = await createClient();
  const [pantryItems, groceryLists] = await Promise.all([
    getPantryItemsWithClient({ householdId, supabase }),
    getEditableGroceryListsWithClient({ householdId, supabase })
  ]);

  return buildPantryRestockCandidates({ groceryLists, pantryItems });
}

export async function getPantryIntakeCandidates({
  groceryListId,
  householdId
}: {
  groceryListId?: string | null;
  householdId: string;
}) {
  const supabase = await createClient();
  return getPantryIntakeCandidatesWithClient({
    groceryListId,
    householdId,
    supabase
  });
}

export async function getPantryIntakeCandidatesWithClient({
  groceryListId,
  householdId,
  supabase
}: {
  groceryListId?: string | null;
  householdId: string;
  supabase: SupabaseClient;
}): Promise<PantryIntakeCandidate[]> {
  const groceryLists = await getCompletedGroceryListsForPantryIntake({
    groceryListId,
    householdId,
    supabase
  });
  const itemIds = groceryLists.flatMap((list) =>
    list.items.map((item) => item.id)
  );
  const [sourcesByItemId, decisions] = await Promise.all([
    getGroceryItemSourcesByItemIds({ groceryListItemIds: itemIds, householdId, supabase }),
    getPantryIntakeDecisionsByItemIds({
      groceryListItemIds: itemIds,
      householdId,
      supabase
    })
  ]);

  return buildPantryIntakeCandidates({
    decisions,
    groceryLists: groceryLists.map((list) => ({
      ...list,
      items: list.items.map((item) => ({
        ...item,
        sources: sourcesByItemId.get(item.id) ?? []
      }))
    }))
  });
}

export async function getPantryConsumptionCandidates({
  cookingSessionId,
  householdId
}: {
  cookingSessionId?: string | null;
  householdId: string;
}) {
  const supabase = await createClient();
  return getPantryConsumptionCandidatesWithClient({
    cookingSessionId,
    householdId,
    supabase
  });
}

export async function getPantryConsumptionCandidatesWithClient({
  cookingSessionId,
  householdId,
  supabase
}: {
  cookingSessionId?: string | null;
  householdId: string;
  supabase: SupabaseClient;
}): Promise<PantryConsumptionCandidate[]> {
  const cookingSessions = await getCompletedCookingSessionsForPantryConsumption({
    cookingSessionId,
    householdId,
    supabase
  });
  const ingredientIds = cookingSessions.flatMap((session) =>
    session.ingredients.map((ingredient) => ingredient.id)
  );
  const decisions = await getPantryConsumptionDecisionsByIngredientIds({
    cookingSessionIngredientIds: ingredientIds,
    householdId,
    supabase
  });

  return buildPantryConsumptionCandidates({ cookingSessions, decisions });
}

export async function confirmPantryIntakeCandidate({
  groceryListItemId,
  householdId,
  input,
  note
}: {
  groceryListItemId: string;
  householdId: string;
  input: PantryIntakeConfirmInput;
  note?: string | null;
}): Promise<PantryIntakeConfirmResult> {
  const supabase = await createClient();
  return confirmPantryIntakeCandidateWithClient({
    groceryListItemId,
    householdId,
    input,
    note,
    supabase
  });
}

export async function confirmPantryIntakeCandidateWithClient({
  groceryListItemId,
  householdId,
  input,
  note,
  supabase
}: {
  groceryListItemId: string;
  householdId: string;
  input: PantryIntakeConfirmInput;
  note?: string | null;
  supabase: SupabaseClient;
}): Promise<PantryIntakeConfirmResult> {
  const existingDecision = await getPantryIntakeDecisionByItemId({
    groceryListItemId,
    householdId,
    supabase
  });

  if (existingDecision) {
    if (existingDecision.status === "confirmed") {
      return {
        groceryListItemId,
        pantryItemId: existingDecision.created_pantry_item_id,
        status: "already_confirmed"
      };
    }

    throw new Error("That grocery item was already skipped for pantry intake.");
  }

  const candidate = await getSinglePantryIntakeCandidate({
    groceryListItemId,
    householdId,
    supabase
  });
  const pantryInput = buildPantryItemInputFromIntakeCandidate({
    candidate,
    input
  });
  const pantryItem = await createPantryItemWithClient({
    householdId,
    input: pantryInput,
    note,
    supabase
  });

  try {
    const { error } = await supabase.from("pantry_intake_decisions").insert(
      buildConfirmedPantryIntakeDecisionInsert({
        groceryListItemId,
        householdId,
        note,
        pantryItemId: pantryItem.id
      })
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    await supabase
      .from("pantry_items")
      .delete()
      .eq("household_id", householdId)
      .eq("id", pantryItem.id);

    const finalDecision = await getPantryIntakeDecisionByItemId({
      groceryListItemId,
      householdId,
      supabase
    });

    if (finalDecision?.status === "confirmed") {
      return {
        groceryListItemId,
        pantryItemId: finalDecision.created_pantry_item_id,
        status: "already_confirmed"
      };
    }

    throw new Error(getSupabaseErrorMessage(error));
  }

  return {
    groceryListItemId,
    pantryItem,
    status: "confirmed"
  };
}

export async function skipPantryIntakeCandidate({
  groceryListItemId,
  householdId,
  note
}: {
  groceryListItemId: string;
  householdId: string;
  note?: string | null;
}): Promise<PantryIntakeSkipResult> {
  const supabase = await createClient();
  return skipPantryIntakeCandidateWithClient({
    groceryListItemId,
    householdId,
    note,
    supabase
  });
}

export async function skipPantryIntakeCandidateWithClient({
  groceryListItemId,
  householdId,
  note,
  supabase
}: {
  groceryListItemId: string;
  householdId: string;
  note?: string | null;
  supabase: SupabaseClient;
}): Promise<PantryIntakeSkipResult> {
  const existingDecision = await getPantryIntakeDecisionByItemId({
    groceryListItemId,
    householdId,
    supabase
  });

  if (existingDecision) {
    if (existingDecision.status === "skipped") {
      return { groceryListItemId, status: "already_skipped" };
    }

    throw new Error("That grocery item was already confirmed for pantry intake.");
  }

  await getSinglePantryIntakeCandidate({
    groceryListItemId,
    householdId,
    supabase
  });

  const { error } = await supabase.from("pantry_intake_decisions").insert(
    buildSkippedPantryIntakeDecisionInsert({
      groceryListItemId,
      householdId,
      note
    })
  );

  if (error) {
    const finalDecision = await getPantryIntakeDecisionByItemId({
      groceryListItemId,
      householdId,
      supabase
    });

    if (finalDecision?.status === "skipped") {
      return { groceryListItemId, status: "already_skipped" };
    }

    throw new Error(error.message);
  }

  return { groceryListItemId, status: "skipped" };
}

export async function confirmPantryConsumptionCandidate({
  cookingSessionIngredientId,
  householdId,
  note
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  note?: string | null;
}): Promise<PantryConsumptionConfirmResult> {
  const supabase = await createClient();
  return confirmPantryConsumptionCandidateWithClient({
    cookingSessionIngredientId,
    householdId,
    note,
    supabase
  });
}

export async function confirmPantryConsumptionCandidateWithClient({
  cookingSessionIngredientId,
  householdId,
  note,
  supabase
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  note?: string | null;
  supabase: SupabaseClient;
}): Promise<PantryConsumptionConfirmResult> {
  const existingDecision = await getPantryConsumptionDecisionByIngredientId({
    cookingSessionIngredientId,
    householdId,
    supabase
  });

  if (existingDecision) {
    if (existingDecision.status === "confirmed") {
      return { cookingSessionIngredientId, status: "already_confirmed" };
    }

    throw new Error("That cooking ingredient was already skipped for pantry review.");
  }

  await getSinglePantryConsumptionCandidate({
    cookingSessionIngredientId,
    householdId,
    supabase
  });

  const { error } = await supabase.from("pantry_consumption_decisions").insert(
    buildConfirmedPantryConsumptionDecisionInsert({
      cookingSessionIngredientId,
      householdId,
      note
    })
  );

  if (error) {
    const finalDecision = await getPantryConsumptionDecisionByIngredientId({
      cookingSessionIngredientId,
      householdId,
      supabase
    });

    if (finalDecision?.status === "confirmed") {
      return { cookingSessionIngredientId, status: "already_confirmed" };
    }

    throw new Error(error.message);
  }

  return { cookingSessionIngredientId, status: "confirmed" };
}

export async function skipPantryConsumptionCandidate({
  cookingSessionIngredientId,
  householdId,
  note
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  note?: string | null;
}): Promise<PantryConsumptionSkipResult> {
  const supabase = await createClient();
  return skipPantryConsumptionCandidateWithClient({
    cookingSessionIngredientId,
    householdId,
    note,
    supabase
  });
}

export async function skipPantryConsumptionCandidateWithClient({
  cookingSessionIngredientId,
  householdId,
  note,
  supabase
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  note?: string | null;
  supabase: SupabaseClient;
}): Promise<PantryConsumptionSkipResult> {
  const existingDecision = await getPantryConsumptionDecisionByIngredientId({
    cookingSessionIngredientId,
    householdId,
    supabase
  });

  if (existingDecision) {
    if (existingDecision.status === "skipped") {
      return { cookingSessionIngredientId, status: "already_skipped" };
    }

    throw new Error("That cooking ingredient was already confirmed for pantry review.");
  }

  await getSinglePantryConsumptionCandidate({
    cookingSessionIngredientId,
    householdId,
    supabase
  });

  const { error } = await supabase.from("pantry_consumption_decisions").insert(
    buildSkippedPantryConsumptionDecisionInsert({
      cookingSessionIngredientId,
      householdId,
      note
    })
  );

  if (error) {
    const finalDecision = await getPantryConsumptionDecisionByIngredientId({
      cookingSessionIngredientId,
      householdId,
      supabase
    });

    if (finalDecision?.status === "skipped") {
      return { cookingSessionIngredientId, status: "already_skipped" };
    }

    throw new Error(error.message);
  }

  return { cookingSessionIngredientId, status: "skipped" };
}

export async function addPantryRestockCandidateToGroceryList({
  householdId,
  pantryItemId
}: {
  householdId: string;
  pantryItemId: string;
}): Promise<AddPantryRestockCandidateResult> {
  const supabase = await createClient();
  return addPantryRestockCandidateToGroceryListWithClient({
    householdId,
    pantryItemId,
    supabase
  });
}

export async function addPantryRestockCandidateToGroceryListWithClient({
  householdId,
  pantryItemId,
  supabase
}: {
  householdId: string;
  pantryItemId: string;
  supabase: SupabaseClient;
}): Promise<AddPantryRestockCandidateResult> {
  const [pantryItems, groceryLists] = await Promise.all([
    getPantryItemsWithClient({ householdId, supabase }),
    getEditableGroceryListsWithClient({ householdId, supabase })
  ]);
  const candidates = buildPantryRestockCandidates({ groceryLists, pantryItems });
  const candidate = candidates.find(
    (restockCandidate) => restockCandidate.pantryItemId === pantryItemId
  );

  if (!candidate) {
    throw new Error("That restock candidate is no longer available.");
  }

  if (!candidate.groceryListId) {
    throw new Error("No editable grocery list is available.");
  }

  if (candidate.status === "already_on_grocery_list") {
    if (!candidate.existingGroceryListItemId) {
      throw new Error("That pantry item is already on the grocery list.");
    }

    return {
      groceryListId: candidate.groceryListId,
      groceryListItemId: candidate.existingGroceryListItemId,
      status: "already_on_grocery_list"
    };
  }

  const currentListStatus = await getRestockGroceryListStatus({
    groceryListId: candidate.groceryListId,
    householdId,
    supabase
  });

  if (
    !currentListStatus ||
    !isEditablePantryRestockGroceryListStatus(currentListStatus)
  ) {
    throw new Error("That grocery list is no longer editable.");
  }

  const existingItemId = await getExistingRestockGroceryListItemId({
    foodId: candidate.foodId,
    groceryListId: candidate.groceryListId,
    householdId,
    supabase
  });

  if (existingItemId) {
    return {
      groceryListId: candidate.groceryListId,
      groceryListItemId: existingItemId,
      status: "already_on_grocery_list"
    };
  }

  const sortOrder = await getNextRestockGroceryItemSortOrder({
    groceryListId: candidate.groceryListId,
    householdId,
    supabase
  });
  const operation = buildPantryRestockGroceryAddOperation({
    candidate: {
      ...candidate,
      groceryListStatus: currentListStatus
    },
    householdId,
    sortOrder
  });
  const { data: insertedItem, error: itemError } = await supabase
    .from("grocery_list_items")
    .insert(operation.item)
    .select("id")
    .maybeSingle();

  if (itemError) {
    throw new Error(itemError.message);
  }

  if (!insertedItem) {
    throw new Error("Restock grocery item could not be added.");
  }

  const { error: sourceError } = await supabase
    .from("grocery_item_sources")
    .insert({
      ...operation.source,
      grocery_list_item_id: insertedItem.id
    });

  if (sourceError) {
    await supabase
      .from("grocery_list_items")
      .delete()
      .eq("household_id", householdId)
      .eq("id", insertedItem.id);
    throw new Error(sourceError.message);
  }

  return {
    groceryListId: candidate.groceryListId,
    groceryListItemId: insertedItem.id,
    status: "added"
  };
}

export async function getPantryEventsByItemIds({
  householdId,
  pantryItemIds
}: {
  householdId: string;
  pantryItemIds: string[];
}) {
  if (pantryItemIds.length === 0) {
    return new Map<string, PantryEvent[]>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pantry_events")
    .select(
      "id, household_id, pantry_item_id, event_type, before_state, after_state, note, created_at"
    )
    .eq("household_id", householdId)
    .in("pantry_item_id", pantryItemIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const eventsByItemId = new Map<string, PantryEvent[]>();

  for (const event of ((data ?? []) as PantryEventRow[]).map(
    mapPantryEventRow
  )) {
    eventsByItemId.set(event.pantryItemId, [
      ...(eventsByItemId.get(event.pantryItemId) ?? []),
      event
    ]);
  }

  return eventsByItemId;
}

export async function createPantryItem({
  householdId,
  input,
  note
}: {
  householdId: string;
  input: PantryItemInput;
  note?: string | null;
}) {
  const supabase = await createClient();
  return createPantryItemWithClient({ householdId, input, note, supabase });
}

async function createPantryItemWithClient({
  householdId,
  input,
  note,
  supabase
}: {
  householdId: string;
  input: PantryItemInput;
  note?: string | null;
  supabase: SupabaseClient;
}) {
  const normalizedInput = normalizePantryItemInput(input);
  const { data, error } = await supabase
    .from("pantry_items")
    .insert(toPantryItemPayload(householdId, normalizedInput))
    .select(pantryItemSelect)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Pantry item could not be created.");
  }

  const pantryItem = mapPantryItemRow(data as PantryItemRow);
  await insertPantryEvents({
    after: pantryItem,
    before: null,
    householdId,
    note,
    pantryItemId: pantryItem.id,
    supabase
  });

  return pantryItem;
}

export async function updatePantryItem({
  householdId,
  input,
  note,
  pantryItemId
}: {
  householdId: string;
  input: PantryItemInput;
  note?: string | null;
  pantryItemId: string;
}) {
  const supabase = await createClient();
  const before = await getPantryItemWithClient({
    householdId,
    pantryItemId,
    supabase
  });
  const normalizedInput = normalizePantryItemInput(input);
  const { data, error } = await supabase
    .from("pantry_items")
    .update(toPantryItemPayload(householdId, normalizedInput))
    .eq("household_id", householdId)
    .eq("id", pantryItemId)
    .is("discarded_at", null)
    .select(pantryItemSelect)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Pantry item could not be updated.");
  }

  const after = mapPantryItemRow(data as PantryItemRow);
  await insertPantryEvents({
    after,
    before,
    householdId,
    note,
    pantryItemId,
    supabase
  });

  return after;
}

export async function discardPantryItem({
  householdId,
  note,
  pantryItemId
}: {
  householdId: string;
  note?: string | null;
  pantryItemId: string;
}) {
  const supabase = await createClient();
  const before = await getPantryItemWithClient({
    householdId,
    pantryItemId,
    supabase
  });
  const { data, error } = await supabase
    .from("pantry_items")
    .update({ discarded_at: new Date().toISOString() })
    .eq("household_id", householdId)
    .eq("id", pantryItemId)
    .is("discarded_at", null)
    .select(pantryItemSelect)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Pantry item could not be discarded.");
  }

  const after = mapPantryItemRow(data as PantryItemRow);
  await insertPantryEvents({
    after,
    before,
    householdId,
    note,
    pantryItemId,
    supabase
  });

  return after;
}

export async function getPantryItemsWithClient({
  householdId,
  options = {},
  supabase
}: {
  householdId: string;
  options?: { includeDiscarded?: boolean };
  supabase: SupabaseClient;
}) {
  let query = supabase
    .from("pantry_items")
    .select(pantryItemSelect)
    .eq("household_id", householdId)
    .order("display_name", { ascending: true });

  if (!options.includeDiscarded) {
    query = query.is("discarded_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryItemRow[]).map(mapPantryItemRow);
}

export async function getPantryEventsWithClient({
  householdId,
  pantryItemId,
  supabase
}: {
  householdId: string;
  pantryItemId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("pantry_events")
    .select(
      "id, household_id, pantry_item_id, event_type, before_state, after_state, note, created_at"
    )
    .eq("household_id", householdId)
    .eq("pantry_item_id", pantryItemId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryEventRow[]).map(mapPantryEventRow);
}

async function getPantryItemWithClient({
  householdId,
  pantryItemId,
  supabase
}: {
  householdId: string;
  pantryItemId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("pantry_items")
    .select(pantryItemSelect)
    .eq("household_id", householdId)
    .eq("id", pantryItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Pantry item could not be loaded.");
  }

  return mapPantryItemRow(data as PantryItemRow);
}

async function getSinglePantryIntakeCandidate({
  groceryListItemId,
  householdId,
  supabase
}: {
  groceryListItemId: string;
  householdId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .select("grocery_list_id")
    .eq("household_id", householdId)
    .eq("id", groceryListItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const groceryListId = data?.grocery_list_id as string | undefined;

  if (!groceryListId) {
    throw new Error("That grocery item is no longer available.");
  }

  const candidates = await getPantryIntakeCandidatesWithClient({
    groceryListId,
    householdId,
    supabase
  });
  const candidate = candidates.find(
    (intakeCandidate) =>
      intakeCandidate.groceryListItemId === groceryListItemId
  );

  if (!candidate) {
    throw new Error("That grocery item is not available for pantry intake.");
  }

  return candidate;
}

async function getSinglePantryConsumptionCandidate({
  cookingSessionIngredientId,
  householdId,
  supabase
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("cooking_session_ingredients")
    .select("cooking_session_id")
    .eq("household_id", householdId)
    .eq("id", cookingSessionIngredientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const cookingSessionId = data?.cooking_session_id as string | undefined;

  if (!cookingSessionId) {
    throw new Error("That cooking ingredient is no longer available.");
  }

  const candidates = await getPantryConsumptionCandidatesWithClient({
    cookingSessionId,
    householdId,
    supabase
  });
  const candidate = candidates.find(
    (consumptionCandidate) =>
      consumptionCandidate.cookingSessionIngredientId === cookingSessionIngredientId
  );

  if (!candidate) {
    throw new Error("That cooking ingredient is not available for pantry review.");
  }

  return candidate;
}

async function getCompletedGroceryListsForPantryIntake({
  groceryListId,
  householdId,
  supabase
}: {
  groceryListId?: string | null;
  householdId: string;
  supabase: SupabaseClient;
}): Promise<PantryIntakeGroceryList[]> {
  let query = supabase
    .from("grocery_lists")
    .select(
      "id, name, status, completed_at, created_at, weekly_plans(week_start_date), grocery_list_items(id, grocery_list_id, food_id, display_name, quantity, unit, preferred_quantity_text, checked, already_have, sort_order, grocery_category_id, foods(name), grocery_categories(name))"
    )
    .eq("household_id", householdId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (groceryListId) {
    query = query.eq("id", groceryListId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryIntakeGroceryListRow[]).map((list) => ({
    completedAt: list.completed_at,
    createdAt: list.created_at,
    id: list.id,
    items: (list.grocery_list_items ?? []).map((item) => ({
      alreadyHave: item.already_have,
      checked: item.checked,
      displayName: item.display_name,
      foodId: item.food_id,
      foodName: getOptionalJoinedName(item.foods),
      groceryCategoryId: item.grocery_category_id,
      groceryCategoryName: getOptionalJoinedName(item.grocery_categories),
      groceryListId: item.grocery_list_id,
      id: item.id,
      preferredQuantityText: item.preferred_quantity_text,
      quantity: toNullableNumber(item.quantity),
      sortOrder: item.sort_order,
      sources: [],
      unit: item.unit
    })),
    name: list.name,
    status: list.status,
    weekStartDate: getJoinedWeekStartDate(list.weekly_plans)
  }));
}

async function getCompletedCookingSessionsForPantryConsumption({
  cookingSessionId,
  householdId,
  supabase
}: {
  cookingSessionId?: string | null;
  householdId: string;
  supabase: SupabaseClient;
}): Promise<PantryConsumptionCookingSession[]> {
  let query = supabase
    .from("cooking_sessions")
    .select(
      "id, recipe_id, status, recipe_name_snapshot, servings_snapshot, scale_factor_snapshot, started_at, completed_at, created_at, cooking_session_ingredients(id, food_id, display_name, quantity, unit, preparation, notes, optional, sort_order, is_ready, ready_at, foods(name))"
    )
    .eq("household_id", householdId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (cookingSessionId) {
    query = query.eq("id", cookingSessionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryConsumptionCookingSessionRow[]).map(
    (session) => ({
      completedAt: session.completed_at,
      createdAt: session.created_at,
      id: session.id,
      ingredients: (session.cooking_session_ingredients ?? []).map(
        (ingredient) => ({
          displayName: ingredient.display_name,
          foodId: ingredient.food_id,
          foodName: getOptionalJoinedName(ingredient.foods),
          id: ingredient.id,
          isReady: ingredient.is_ready,
          notes: ingredient.notes,
          optional: ingredient.optional,
          preparation: ingredient.preparation,
          quantity: toNullableNumber(ingredient.quantity),
          readyAt: ingredient.ready_at,
          sortOrder: ingredient.sort_order,
          unit: ingredient.unit
        })
      ),
      recipeId: session.recipe_id,
      recipeNameSnapshot: session.recipe_name_snapshot,
      scaleFactorSnapshot: Number(session.scale_factor_snapshot),
      servingsSnapshot: toNullableNumber(session.servings_snapshot),
      startedAt: session.started_at,
      status: session.status
    })
  );
}

async function getGroceryItemSourcesByItemIds({
  groceryListItemIds,
  householdId,
  supabase
}: {
  groceryListItemIds: string[];
  householdId: string;
  supabase: SupabaseClient;
}) {
  const sourcesByItemId = new Map<
    string,
    PantryIntakeGroceryList["items"][number]["sources"]
  >();

  if (groceryListItemIds.length === 0) {
    return sourcesByItemId;
  }

  const { data, error } = await supabase
    .from("grocery_item_sources")
    .select(
      "grocery_list_item_id, source_type, source_label, quantity, unit, notes, meal_profiles(name)"
    )
    .eq("household_id", householdId)
    .in("grocery_list_item_id", groceryListItemIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const source of (data ?? []) as GroceryItemSourceRow[]) {
    sourcesByItemId.set(source.grocery_list_item_id, [
      ...(sourcesByItemId.get(source.grocery_list_item_id) ?? []),
      {
        mealProfileName: getOptionalJoinedName(source.meal_profiles),
        notes: source.notes,
        quantity: toNullableNumber(source.quantity),
        sourceLabel: source.source_label,
        sourceType: source.source_type,
        unit: source.unit
      }
    ]);
  }

  return sourcesByItemId;
}

async function getPantryIntakeDecisionsByItemIds({
  groceryListItemIds,
  householdId,
  supabase
}: {
  groceryListItemIds: string[];
  householdId: string;
  supabase: SupabaseClient;
}): Promise<PantryIntakeDecision[]> {
  if (groceryListItemIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("pantry_intake_decisions")
    .select("grocery_list_item_id, status, created_pantry_item_id")
    .eq("household_id", householdId)
    .in("grocery_list_item_id", groceryListItemIds);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryIntakeDecisionRow[]).map((decision) => ({
    groceryListItemId: decision.grocery_list_item_id,
    status: decision.status
  }));
}

async function getPantryIntakeDecisionByItemId({
  groceryListItemId,
  householdId,
  supabase
}: {
  groceryListItemId: string;
  householdId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("pantry_intake_decisions")
    .select("grocery_list_item_id, status, created_pantry_item_id")
    .eq("household_id", householdId)
    .eq("grocery_list_item_id", groceryListItemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PantryIntakeDecisionRow | null;
}

async function getPantryConsumptionDecisionsByIngredientIds({
  cookingSessionIngredientIds,
  householdId,
  supabase
}: {
  cookingSessionIngredientIds: string[];
  householdId: string;
  supabase: SupabaseClient;
}): Promise<PantryConsumptionDecision[]> {
  if (cookingSessionIngredientIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("pantry_consumption_decisions")
    .select("cooking_session_ingredient_id, status")
    .eq("household_id", householdId)
    .in("cooking_session_ingredient_id", cookingSessionIngredientIds);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryConsumptionDecisionRow[]).map((decision) => ({
    cookingSessionIngredientId: decision.cooking_session_ingredient_id,
    status: decision.status
  }));
}

async function getPantryConsumptionDecisionByIngredientId({
  cookingSessionIngredientId,
  householdId,
  supabase
}: {
  cookingSessionIngredientId: string;
  householdId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("pantry_consumption_decisions")
    .select("cooking_session_ingredient_id, status")
    .eq("household_id", householdId)
    .eq("cooking_session_ingredient_id", cookingSessionIngredientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PantryConsumptionDecisionRow | null;
}

async function getEditableGroceryListsWithClient({
  householdId,
  supabase
}: {
  householdId: string;
  supabase: SupabaseClient;
}): Promise<PantryRestockGroceryList[]> {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("id, status, created_at, grocery_list_items(id, food_id, display_name)")
    .eq("household_id", householdId)
    .in("status", ["draft", "finalized", "shopping_started"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PantryRestockGroceryListRow[]).map((list) => ({
    createdAt: list.created_at,
    id: list.id,
    items: (list.grocery_list_items ?? []).map((item) => ({
      displayName: item.display_name,
      foodId: item.food_id,
      id: item.id
    })),
    status: list.status
  }));
}

async function getRestockGroceryListStatus({
  groceryListId,
  householdId,
  supabase
}: {
  groceryListId: string;
  householdId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("status")
    .eq("household_id", householdId)
    .eq("id", groceryListId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.status as PantryRestockGroceryList["status"] | undefined;
}

async function getExistingRestockGroceryListItemId({
  foodId,
  groceryListId,
  householdId,
  supabase
}: {
  foodId: string;
  groceryListId: string;
  householdId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await supabase
    .from("grocery_list_items")
    .select("id")
    .eq("household_id", householdId)
    .eq("grocery_list_id", groceryListId)
    .eq("food_id", foodId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id as string | undefined;
}

async function getNextRestockGroceryItemSortOrder({
  groceryListId,
  householdId,
  supabase
}: {
  groceryListId: string;
  householdId: string;
  supabase: SupabaseClient;
}) {
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

  return data ? Number(data.sort_order) + 1 : 0;
}

async function insertPantryEvents({
  after,
  before,
  householdId,
  note,
  pantryItemId,
  supabase
}: {
  after: PantryItem;
  before: PantryItem | null;
  householdId: string;
  note?: string | null;
  pantryItemId: string;
  supabase: SupabaseClient;
}) {
  const eventTypes = buildPantryEventTypes({ after, before });

  if (eventTypes.length === 0) {
    return;
  }

  const { error } = await supabase.from("pantry_events").insert(
    eventTypes.map((eventType) => ({
      after_state: toPantryEventState(after),
      before_state: before ? toPantryEventState(before) : null,
      event_type: eventType,
      household_id: householdId,
      note: normalizeEventNote(note),
      pantry_item_id: pantryItemId
    }))
  );

  if (error) {
    throw new Error(error.message);
  }
}

function toPantryItemPayload(
  householdId: string,
  input: NormalizedPantryItemInput
) {
  return {
    display_name: input.displayName,
    expiration_date: input.expirationDate,
    food_id: input.foodId,
    grocery_category_id: input.groceryCategoryId,
    household_id: householdId,
    is_open: input.isOpen,
    low_stock_threshold_quantity: input.lowStockThresholdQuantity,
    low_stock_threshold_unit: input.lowStockThresholdUnit,
    meal_profile_id: input.mealProfileId,
    notes: input.notes,
    opened_at: input.openedAt,
    package_detail: input.packageDetail,
    quantity: input.quantity,
    quantity_note: input.quantityNote,
    stock_status: input.stockStatus,
    storage_location: input.storageLocation,
    unit: input.unit
  };
}

function toPantryEventState(item: PantryItem) {
  return {
    discardedAt: item.discardedAt,
    displayName: item.displayName,
    expirationDate: item.expirationDate,
    foodId: item.foodId,
    groceryCategoryId: item.groceryCategoryId,
    isOpen: item.isOpen,
    lowStockThresholdQuantity: item.lowStockThresholdQuantity,
    lowStockThresholdUnit: item.lowStockThresholdUnit,
    mealProfileId: item.mealProfileId,
    notes: item.notes,
    openedAt: item.openedAt,
    packageDetail: item.packageDetail,
    quantity: item.quantity,
    quantityNote: item.quantityNote,
    stockStatus: item.stockStatus,
    storageLocation: item.storageLocation,
    unit: item.unit
  };
}

const pantryItemSelect =
  "id, household_id, food_id, meal_profile_id, grocery_category_id, display_name, package_detail, quantity, unit, quantity_note, stock_status, low_stock_threshold_quantity, low_stock_threshold_unit, expiration_date, is_open, opened_at, storage_location, notes, discarded_at, created_at, updated_at, foods(name, default_grocery_category_id), meal_profiles(name), grocery_categories(name, sort_order)";

function mapPantryItemRow(row: PantryItemRow): PantryItem {
  const category = getOptionalJoinedCategory(row.grocery_categories);

  return {
    discardedAt: row.discarded_at,
    displayName: row.display_name,
    expirationDate: row.expiration_date,
    foodDefaultGroceryCategoryId:
      getJoinedFood(row.foods)?.default_grocery_category_id ?? null,
    foodId: row.food_id,
    foodName: getJoinedFood(row.foods)?.name ?? "Unknown",
    groceryCategoryId: row.grocery_category_id,
    groceryCategoryName: category?.name ?? null,
    groceryCategorySortOrder: category?.sort_order ?? null,
    householdId: row.household_id,
    id: row.id,
    isOpen: row.is_open,
    lowStockThresholdQuantity: toNullableNumber(
      row.low_stock_threshold_quantity
    ),
    lowStockThresholdUnit: row.low_stock_threshold_unit,
    mealProfileId: row.meal_profile_id,
    mealProfileName: getOptionalJoinedName(row.meal_profiles),
    notes: row.notes,
    openedAt: row.opened_at,
    packageDetail: row.package_detail,
    quantity: toNullableNumber(row.quantity),
    quantityNote: row.quantity_note,
    stockStatus: row.stock_status,
    storageLocation: row.storage_location,
    unit: row.unit,
    updatedAt: row.updated_at
  };
}

function mapPantryEventRow(row: PantryEventRow): PantryEvent {
  return {
    afterState: row.after_state,
    beforeState: row.before_state,
    createdAt: row.created_at,
    eventType: row.event_type,
    householdId: row.household_id,
    id: row.id,
    note: row.note,
    pantryItemId: row.pantry_item_id
  };
}

function getOptionalJoinedName(value: JoinedName) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value?.name ?? null;
}

function getJoinedFood(value: PantryItemRow["foods"]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getOptionalJoinedCategory(
  value:
    | { name: string; sort_order: number }
    | Array<{ name: string; sort_order: number }>
    | null
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getJoinedWeekStartDate(
  value:
    | { week_start_date: string | null }
    | Array<{ week_start_date: string | null }>
    | null
) {
  if (Array.isArray(value)) {
    return value[0]?.week_start_date ?? null;
  }

  return value?.week_start_date ?? null;
}

function toNullableNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeEventNote(value: string | null | undefined) {
  const note = String(value ?? "").trim().replace(/\s+/g, " ");
  return note.length > 0 ? note : null;
}

function getSupabaseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Pantry intake decision could not be saved.";
}
