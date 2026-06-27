import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPantryEventTypes, normalizePantryItemInput } from "./domain";
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
  foods: JoinedName;
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
  "id, household_id, food_id, meal_profile_id, grocery_category_id, display_name, package_detail, quantity, unit, quantity_note, stock_status, low_stock_threshold_quantity, low_stock_threshold_unit, expiration_date, is_open, opened_at, storage_location, notes, discarded_at, created_at, updated_at, foods(name), meal_profiles(name), grocery_categories(name, sort_order)";

function mapPantryItemRow(row: PantryItemRow): PantryItem {
  const category = getOptionalJoinedCategory(row.grocery_categories);

  return {
    discardedAt: row.discarded_at,
    displayName: row.display_name,
    expirationDate: row.expiration_date,
    foodId: row.food_id,
    foodName: getJoinedName(row.foods),
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

function getJoinedName(value: JoinedName) {
  return getOptionalJoinedName(value) ?? "Unknown";
}

function getOptionalJoinedName(value: JoinedName) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value?.name ?? null;
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
