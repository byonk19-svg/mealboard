"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addManualGroceryItem,
  advanceGroceryListLifecycle,
  applyPendingGroceryChangesForWeeklyPlan,
  generateAndPersistGroceryList,
  updateGroceryListItemState
} from "@/lib/grocery/data";
import { normalizeManualGroceryItemInput } from "@/lib/grocery/manual-grocery-item";
import {
  confirmPantryIntakeCandidate,
  skipPantryIntakeCandidate
} from "@/lib/pantry/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import { getWeekStartDate } from "@/lib/weekly-plans/week-dates";

function groceryListRedirect(
  message: string,
  view?: string,
  listId?: string | null
): never {
  const params = new URLSearchParams({ message });
  const groceryListView = normalizeGroceryListView(view);

  if (groceryListView !== "shopping") {
    params.set("view", groceryListView);
  }

  if (listId) {
    params.set("listId", listId);
  }

  redirect(`/grocery-list?${params.toString()}`);
}

function planWeekRedirect(weekStartDate: string, message: string): never {
  redirect(
    `/plan-week?weekStartDate=${encodeURIComponent(weekStartDate)}&message=${encodeURIComponent(message)}`
  );
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function booleanFromForm(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true";
}

function normalizeGroceryListView(value: FormDataEntryValue | string | null | undefined) {
  const view = String(value ?? "").trim();

  if (view === "profile" || view === "meal") {
    return view;
  }

  return "shopping";
}

export async function generateGroceryListForWeek(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));

  if (!weeklyPlanId) {
    planWeekRedirect(weekStartDate, "Create a planning week first.");
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    planWeekRedirect(weekStartDate, "Link your user to a household first.");
  }

  try {
    await generateAndPersistGroceryList({
      householdId: householdContext.household.id,
      weeklyPlanId
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Grocery generation failed.";
    planWeekRedirect(weekStartDate, message);
  }

  revalidatePath("/plan-week");
  revalidatePath("/grocery-list");
  groceryListRedirect("Draft grocery list generated.");
}

export async function applyPendingGroceryChangesForWeek(formData: FormData) {
  const weekStartDate =
    textOrNull(formData.get("weekStartDate")) ?? getWeekStartDate(new Date());
  const weeklyPlanId = textOrNull(formData.get("weeklyPlanId"));

  if (!weeklyPlanId) {
    planWeekRedirect(weekStartDate, "Create a planning week first.");
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    planWeekRedirect(weekStartDate, "Link your user to a household first.");
  }

  let result;

  try {
    result = await applyPendingGroceryChangesForWeeklyPlan({
      householdId: householdContext.household.id,
      weeklyPlanId
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Pending grocery changes could not be applied.";
    planWeekRedirect(weekStartDate, message);
  }

  revalidatePath("/plan-week");
  revalidatePath("/grocery-list");
  planWeekRedirect(
    weekStartDate,
    `Applied pending grocery changes: added ${result.addedCount}, removed ${result.removedCount}, kept ${result.keptCount}.`
  );
}

export async function updateGroceryItemChecked(formData: FormData) {
  const itemId = textOrNull(formData.get("itemId"));
  const view = normalizeGroceryListView(formData.get("view"));

  if (!itemId) {
    groceryListRedirect("Choose a grocery item first.", view);
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    groceryListRedirect("Link your user to a household first.", view);
  }

  try {
    await updateGroceryListItemState({
      checked: booleanFromForm(formData.get("checked")),
      householdId: householdContext.household.id,
      itemId
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Grocery item update failed.";
    groceryListRedirect(message, view);
  }

  revalidatePath("/grocery-list");
  groceryListRedirect("Grocery item updated.", view);
}

export async function addManualGroceryItemAction(formData: FormData) {
  const groceryListId = textOrNull(formData.get("groceryListId"));
  const view = normalizeGroceryListView(formData.get("view"));

  if (!groceryListId) {
    groceryListRedirect("Choose a grocery list first.", view);
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    groceryListRedirect("Link your user to a household first.", view);
  }

  try {
    const item = normalizeManualGroceryItemInput({
      displayName: textOrNull(formData.get("displayName")),
      note: textOrNull(formData.get("note")),
      quantity: textOrNull(formData.get("quantity")),
      unit: textOrNull(formData.get("unit"))
    });

    await addManualGroceryItem({
      groceryCategoryId: textOrNull(formData.get("groceryCategoryId")),
      groceryListId,
      householdId: householdContext.household.id,
      item,
      mealProfileId: textOrNull(formData.get("mealProfileId"))
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Manual grocery item failed.";
    groceryListRedirect(message, view);
  }

  revalidatePath("/grocery-list");
  groceryListRedirect("Manual grocery item added.", view);
}

export async function updateGroceryItemAlreadyHave(formData: FormData) {
  const itemId = textOrNull(formData.get("itemId"));
  const view = normalizeGroceryListView(formData.get("view"));

  if (!itemId) {
    groceryListRedirect("Choose a grocery item first.", view);
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    groceryListRedirect("Link your user to a household first.", view);
  }

  try {
    await updateGroceryListItemState({
      alreadyHave: booleanFromForm(formData.get("alreadyHave")),
      householdId: householdContext.household.id,
      itemId
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Grocery item update failed.";
    groceryListRedirect(message, view);
  }

  revalidatePath("/grocery-list");
  groceryListRedirect("Grocery item updated.", view);
}

export async function advanceGroceryListLifecycleAction(formData: FormData) {
  const groceryListId = textOrNull(formData.get("groceryListId"));
  const view = normalizeGroceryListView(formData.get("view"));

  if (!groceryListId) {
    groceryListRedirect("Choose a grocery list first.", view);
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    groceryListRedirect("Link your user to a household first.", view);
  }

  try {
    await advanceGroceryListLifecycle({
      groceryListId,
      householdId: householdContext.household.id
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Grocery lifecycle update failed.";
    groceryListRedirect(message, view);
  }

  revalidatePath("/grocery-list");
  groceryListRedirect("Grocery list status updated.", view);
}

export async function confirmPantryIntakeCandidateAction(formData: FormData) {
  const groceryListItemId = textOrNull(formData.get("groceryListItemId"));
  const listId = textOrNull(formData.get("listId"));
  const view = normalizeGroceryListView(formData.get("view"));

  if (!groceryListItemId) {
    groceryListRedirect("Choose a pantry intake item first.", view, listId);
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    groceryListRedirect("Link your user to a household first.", view, listId);
  }

  try {
    await confirmPantryIntakeCandidate({
      groceryListItemId,
      householdId: householdContext.household.id,
      input: {
        displayName: textOrNull(formData.get("displayName")),
        expirationDate: textOrNull(formData.get("expirationDate")),
        groceryCategoryId: textOrNull(formData.get("groceryCategoryId")),
        isOpen: false,
        lowStockThresholdQuantity: null,
        lowStockThresholdUnit: null,
        mealProfileId: null,
        notes: textOrNull(formData.get("note")),
        openedAt: null,
        packageDetail: null,
        quantity: textOrNull(formData.get("quantity")),
        quantityNote: null,
        stockStatus: "in_stock",
        storageLocation: textOrNull(formData.get("storageLocation")),
        unit: textOrNull(formData.get("unit"))
      },
      note: textOrNull(formData.get("note"))
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pantry intake confirm failed.";
    groceryListRedirect(message, view, listId);
  }

  revalidatePath("/grocery-list");
  revalidatePath("/pantry");
  groceryListRedirect("Pantry item created.", view, listId);
}

export async function skipPantryIntakeCandidateAction(formData: FormData) {
  const groceryListItemId = textOrNull(formData.get("groceryListItemId"));
  const listId = textOrNull(formData.get("listId"));
  const view = normalizeGroceryListView(formData.get("view"));

  if (!groceryListItemId) {
    groceryListRedirect("Choose a pantry intake item first.", view, listId);
  }

  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    groceryListRedirect("Link your user to a household first.", view, listId);
  }

  try {
    await skipPantryIntakeCandidate({
      groceryListItemId,
      householdId: householdContext.household.id,
      note: textOrNull(formData.get("note"))
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pantry intake skip failed.";
    groceryListRedirect(message, view, listId);
  }

  revalidatePath("/grocery-list");
  groceryListRedirect("Item skipped.", view, listId);
}
