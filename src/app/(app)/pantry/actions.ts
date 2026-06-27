"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPantryItem,
  discardPantryItem,
  updatePantryItem
} from "@/lib/pantry/data";
import type { PantryItemInput } from "@/lib/pantry/types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

const pantryPath = "/pantry";

function pantryRedirect(message: string): never {
  redirect(`${pantryPath}?message=${encodeURIComponent(message)}`);
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

async function requireHousehold() {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    pantryRedirect("Link your user to a household before editing pantry stock.");
  }

  return householdContext.household;
}

export async function createPantryItemAction(formData: FormData) {
  const household = await requireHousehold();

  try {
    const foodId = await resolvePantryFoodId({
      formData,
      householdId: household.id
    });

    await createPantryItem({
      householdId: household.id,
      input: buildPantryItemInput(formData, foodId),
      note: textOrNull(formData.get("eventNote"))
    });
  } catch (error) {
    pantryRedirect(error instanceof Error ? error.message : "Pantry item failed.");
  }

  revalidatePath(pantryPath);
  pantryRedirect("Pantry item created.");
}

export async function updatePantryItemAction(formData: FormData) {
  const household = await requireHousehold();
  const pantryItemId = textOrNull(formData.get("pantryItemId"));

  if (!pantryItemId) {
    pantryRedirect("Choose a pantry item to update.");
  }

  try {
    const foodId = await resolvePantryFoodId({
      formData,
      householdId: household.id
    });

    await updatePantryItem({
      householdId: household.id,
      input: buildPantryItemInput(formData, foodId),
      note: textOrNull(formData.get("eventNote")),
      pantryItemId
    });
  } catch (error) {
    pantryRedirect(error instanceof Error ? error.message : "Pantry item failed.");
  }

  revalidatePath(pantryPath);
  pantryRedirect("Pantry item updated.");
}

export async function discardPantryItemAction(formData: FormData) {
  const household = await requireHousehold();
  const pantryItemId = textOrNull(formData.get("pantryItemId"));

  if (!pantryItemId) {
    pantryRedirect("Choose a pantry item to discard.");
  }

  try {
    await discardPantryItem({
      householdId: household.id,
      note: textOrNull(formData.get("eventNote")),
      pantryItemId
    });
  } catch (error) {
    pantryRedirect(
      error instanceof Error ? error.message : "Pantry item could not be discarded."
    );
  }

  revalidatePath(pantryPath);
  pantryRedirect("Pantry item discarded.");
}

async function resolvePantryFoodId({
  formData,
  householdId
}: {
  formData: FormData;
  householdId: string;
}) {
  const selectedFoodId = textOrNull(formData.get("foodId"));

  if (selectedFoodId) {
    return selectedFoodId;
  }

  const newFoodName = textOrNull(formData.get("newFoodName"));

  if (!newFoodName) {
    return null;
  }

  const supabase = await createClient();
  const { data: existingFoods, error: existingError } = await supabase
    .from("foods")
    .select("id, name")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .ilike("name", newFoodName);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingFood = (existingFoods ?? []).find(
    (food) => food.name.toLocaleLowerCase() === newFoodName.toLocaleLowerCase()
  );

  if (existingFood) {
    return existingFood.id;
  }

  const { data: insertedFood, error: insertError } = await supabase
    .from("foods")
    .insert({
      default_grocery_category_id: textOrNull(formData.get("groceryCategoryId")),
      default_unit: textOrNull(formData.get("unit")),
      household_id: householdId,
      name: newFoodName
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    throw new Error(insertError.message);
  }

  if (!insertedFood) {
    throw new Error("Household item could not be created.");
  }

  return insertedFood.id;
}

function buildPantryItemInput(
  formData: FormData,
  foodId: string | null
): PantryItemInput {
  return {
    displayName: textOrNull(formData.get("displayName")),
    expirationDate: textOrNull(formData.get("expirationDate")),
    foodId,
    groceryCategoryId: textOrNull(formData.get("groceryCategoryId")),
    isOpen: formData.get("isOpen") === "on",
    lowStockThresholdQuantity: textOrNull(
      formData.get("lowStockThresholdQuantity")
    ),
    lowStockThresholdUnit: textOrNull(formData.get("lowStockThresholdUnit")),
    mealProfileId: textOrNull(formData.get("mealProfileId")),
    notes: textOrNull(formData.get("notes")),
    openedAt: textOrNull(formData.get("openedAt")),
    packageDetail: textOrNull(formData.get("packageDetail")),
    quantity: textOrNull(formData.get("quantity")),
    quantityNote: textOrNull(formData.get("quantityNote")),
    stockStatus: textOrNull(formData.get("stockStatus")),
    storageLocation: textOrNull(formData.get("storageLocation")),
    unit: textOrNull(formData.get("unit"))
  };
}
