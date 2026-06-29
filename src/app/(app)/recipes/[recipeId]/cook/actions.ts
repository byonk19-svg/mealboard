"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  abandonCookingSession,
  cancelCookingTimer,
  completeCookingSession,
  createCookingTimer,
  dismissCookingTimer,
  pauseCookingSession,
  pauseCookingTimer,
  resumeCookingSession,
  setCookingSessionIngredientReadiness,
  setCookingSessionStepChecked,
  startCookingSession,
  startCookingTimer,
  updateCookingSessionCurrentStep,
  updateCookingSessionNotes
} from "@/lib/cooking-mode/data";
import {
  confirmPantryConsumptionCandidate,
  skipPantryConsumptionCandidate
} from "@/lib/pantry/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function cookPath(recipeId: string, plannedMealId?: string | null) {
  const path = `/recipes/${encodeURIComponent(recipeId)}/cook`;

  return plannedMealId
    ? `${path}?plannedMealId=${encodeURIComponent(plannedMealId)}`
    : path;
}

function cookRedirect(
  recipeId: string,
  message: string,
  plannedMealId?: string | null,
  sessionId?: string | null
): never {
  const params = new URLSearchParams({ message });

  if (plannedMealId) {
    params.set("plannedMealId", plannedMealId);
  }

  if (sessionId) {
    params.set("sessionId", sessionId);
  }

  redirect(`/recipes/${encodeURIComponent(recipeId)}/cook?${params.toString()}`);
}

async function requireHousehold(recipeId: string, plannedMealId?: string | null) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    cookRedirect(recipeId, "Link your user to a household before cooking.", plannedMealId);
  }

  return householdContext.household;
}

function parseCommon(formData: FormData) {
  const recipeId = textOrNull(formData.get("recipeId"));
  const sessionId = textOrNull(formData.get("sessionId"));
  const plannedMealId = textOrNull(formData.get("plannedMealId"));

  if (!recipeId) {
    redirect("/recipes");
  }

  return {
    plannedMealId,
    recipeId,
    sessionId
  };
}

export async function startCookingSessionAction(formData: FormData) {
  const { plannedMealId, recipeId } = parseCommon(formData);
  const household = await requireHousehold(recipeId, plannedMealId);

  await startCookingSession({
    householdId: household.id,
    plannedMealId,
    recipeId
  });

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Cooking session ready.", plannedMealId);
}

export async function setIngredientReadyAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);
  const ingredientId = textOrNull(formData.get("ingredientId"));
  const checked = String(formData.get("checked") ?? "") === "true";

  if (!sessionId || !ingredientId) {
    cookRedirect(recipeId, "Choose an ingredient first.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);

  await setCookingSessionIngredientReadiness({
    checked,
    householdId: household.id,
    ingredientId,
    sessionId
  });

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, checked ? "Ingredient marked ready." : "Ingredient unchecked.", plannedMealId);
}

export async function setStepCheckedAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);
  const stepId = textOrNull(formData.get("stepId"));
  const sortOrder = Number(formData.get("sortOrder"));
  const checked = String(formData.get("checked") ?? "") === "true";

  if (!sessionId || !stepId || !Number.isInteger(sortOrder)) {
    cookRedirect(recipeId, "Choose a cooking step first.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);

  await setCookingSessionStepChecked({
    checked,
    householdId: household.id,
    sessionId,
    stepId
  });
  await updateCookingSessionCurrentStep({
    householdId: household.id,
    sessionId,
    sortOrder
  });

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, checked ? "Step completed." : "Step unchecked.", plannedMealId);
}

export async function setCurrentStepAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);
  const sortOrder = Number(formData.get("sortOrder"));

  if (!sessionId || !Number.isInteger(sortOrder)) {
    cookRedirect(recipeId, "Choose a cooking step first.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);

  await updateCookingSessionCurrentStep({
    householdId: household.id,
    sessionId,
    sortOrder
  });

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Current step updated.", plannedMealId);
}

export async function saveCookingNotesAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);

  if (!sessionId) {
    cookRedirect(recipeId, "Start cooking before saving notes.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);

  await updateCookingSessionNotes({
    householdId: household.id,
    notes: textOrNull(formData.get("notes")),
    sessionId,
    substitutions: textOrNull(formData.get("substitutions"))
  });

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Cooking notes saved.", plannedMealId);
}

export async function pauseCookingSessionAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);

  if (!sessionId) {
    cookRedirect(recipeId, "Start cooking before pausing.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);
  await pauseCookingSession({ householdId: household.id, sessionId });
  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Cooking session paused.", plannedMealId);
}

export async function resumeCookingSessionAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);

  if (!sessionId) {
    cookRedirect(recipeId, "Start cooking before resuming.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);
  await resumeCookingSession({ householdId: household.id, sessionId });
  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Cooking session resumed.", plannedMealId);
}

export async function completeCookingSessionAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);

  if (!sessionId) {
    cookRedirect(recipeId, "Start cooking before completing.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);
  await completeCookingSession({ householdId: household.id, sessionId });
  revalidatePath(cookPath(recipeId, plannedMealId));
  revalidatePath(`/recipes/${recipeId}`);
  cookRedirect(recipeId, "Cooking session completed.", plannedMealId, sessionId);
}

export async function abandonCookingSessionAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);

  if (!sessionId) {
    cookRedirect(recipeId, "Start cooking before abandoning.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);
  await abandonCookingSession({ householdId: household.id, sessionId });
  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Cooking session abandoned.", plannedMealId, sessionId);
}

export async function confirmPantryConsumptionCandidateAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);
  const cookingSessionIngredientId = textOrNull(
    formData.get("cookingSessionIngredientId")
  );

  if (!sessionId || !cookingSessionIngredientId) {
    cookRedirect(recipeId, "Choose a cooking ingredient first.", plannedMealId, sessionId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);

  try {
    await confirmPantryConsumptionCandidate({
      cookingSessionIngredientId,
      householdId: household.id,
      note: textOrNull(formData.get("note"))
    });
  } catch (error) {
    cookRedirect(
      recipeId,
      error instanceof Error ? error.message : "Consumption review failed.",
      plannedMealId,
      sessionId
    );
  }

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Consumption confirmed.", plannedMealId, sessionId);
}

export async function skipPantryConsumptionCandidateAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);
  const cookingSessionIngredientId = textOrNull(
    formData.get("cookingSessionIngredientId")
  );

  if (!sessionId || !cookingSessionIngredientId) {
    cookRedirect(recipeId, "Choose a cooking ingredient first.", plannedMealId, sessionId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);

  try {
    await skipPantryConsumptionCandidate({
      cookingSessionIngredientId,
      householdId: household.id,
      note: textOrNull(formData.get("note"))
    });
  } catch (error) {
    cookRedirect(
      recipeId,
      error instanceof Error ? error.message : "Consumption review failed.",
      plannedMealId,
      sessionId
    );
  }

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Consumption skipped.", plannedMealId, sessionId);
}

export async function createCookingTimerAction(formData: FormData) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);
  const minutes = Number(formData.get("durationMinutes"));

  if (!sessionId || !Number.isFinite(minutes) || minutes <= 0) {
    cookRedirect(recipeId, "Timer duration must be positive.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);
  await createCookingTimer({
    durationSeconds: Math.round(minutes * 60),
    householdId: household.id,
    label: textOrNull(formData.get("label")),
    sessionId,
    stepId: textOrNull(formData.get("stepId"))
  });

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, "Timer added.", plannedMealId);
}

export async function startCookingTimerAction(formData: FormData) {
  return transitionTimer(formData, startCookingTimer, "Timer started.");
}

export async function pauseCookingTimerAction(formData: FormData) {
  return transitionTimer(formData, pauseCookingTimer, "Timer paused.");
}

export async function dismissCookingTimerAction(formData: FormData) {
  return transitionTimer(formData, dismissCookingTimer, "Timer dismissed.");
}

export async function cancelCookingTimerAction(formData: FormData) {
  return transitionTimer(formData, cancelCookingTimer, "Timer canceled.");
}

async function transitionTimer(
  formData: FormData,
  transition: (input: {
    householdId: string;
    sessionId: string;
    timerId: string;
  }) => Promise<unknown>,
  message: string
) {
  const { plannedMealId, recipeId, sessionId } = parseCommon(formData);
  const timerId = textOrNull(formData.get("timerId"));

  if (!sessionId || !timerId) {
    cookRedirect(recipeId, "Choose a timer first.", plannedMealId);
  }

  const household = await requireHousehold(recipeId, plannedMealId);

  await transition({
    householdId: household.id,
    sessionId,
    timerId
  });

  revalidatePath(cookPath(recipeId, plannedMealId));
  cookRedirect(recipeId, message, plannedMealId);
}
