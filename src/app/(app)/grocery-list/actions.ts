"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateAndPersistGroceryList } from "@/lib/grocery/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import { getWeekStartDate } from "@/lib/weekly-plans/week-dates";

function groceryListRedirect(message: string): never {
  redirect(`/grocery-list?message=${encodeURIComponent(message)}`);
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
