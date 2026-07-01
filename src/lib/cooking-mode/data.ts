import {
  assertCookingSessionCanBeEdited,
  buildCookingTimerCancelPatch,
  buildCookingTimerDismissPatch,
  buildCookingTimerPausePatch,
  buildCookingTimerStartPatch,
  buildCookingSessionLifecyclePatch,
  buildCookingSessionSnapshot,
  buildRecipeStepDraftsFromInstructions,
  getCookingSessionCompletionWarnings,
  resolveCookingTimerStatus,
  validateCurrentStepSortOrder,
  type CookingTimerShape,
  type CookingSessionLifecycleAction,
  type CookingSessionStatus,
  type SnapshotPlannedMeal,
  type SnapshotRecipe
} from "@/lib/cooking-mode/domain";
import type {
  CookingModeRecipe,
  CookingModeRecipeIngredient,
  CookingModeRecipeStep,
  CookingSession,
  CookingSessionIngredient,
  CookingSessionStep,
  CookingTimer,
  CookingTimerStatus
} from "@/lib/cooking-mode/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type CookingTimerUpdate =
  Database["public"]["Tables"]["cooking_timers"]["Update"];

type RecipeRow = {
  id: string;
  instructions: string | null;
  name: string;
  servings: number | string | null;
  updated_at: string;
};

type RecipeIngredientRow = {
  display_name: string;
  food_id: string | null;
  id: string;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | string | null;
  sort_order: number;
  unit: string | null;
};

type RecipeStepRow = {
  id: string;
  instruction: string;
  section_label: string | null;
  sort_order: number;
};

type WeeklyPlanItemRow = {
  id: string;
  recipe_id: string | null;
  scale_factor: number | string | null;
};

type CookingSessionRow = {
  abandoned_at: string | null;
  completed_at: string | null;
  created_at: string;
  current_step_sort_order: number | null;
  household_id: string;
  id: string;
  notes: string | null;
  paused_at: string | null;
  recipe_id: string;
  recipe_name_snapshot: string;
  recipe_updated_at_snapshot: string | null;
  scale_factor_snapshot: number | string;
  servings_snapshot: number | string | null;
  started_at: string;
  status: CookingSessionStatus;
  substitutions: string | null;
  updated_at: string;
  weekly_plan_item_id: string | null;
};

type CookingSessionIngredientRow = {
  display_name: string;
  food_id: string | null;
  id: string;
  is_ready: boolean;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | string | null;
  ready_at: string | null;
  recipe_ingredient_id: string | null;
  sort_order: number;
  unit: string | null;
};

type CookingSessionStepRow = {
  completed_at: string | null;
  id: string;
  instruction: string;
  is_completed: boolean;
  recipe_step_id: string | null;
  section_label: string | null;
  sort_order: number;
};

type CookingTimerRow = {
  canceled_at: string | null;
  cooking_session_step_id: string | null;
  created_at: string;
  dismissed_at: string | null;
  duration_seconds: number;
  expired_at: string | null;
  expires_at: string | null;
  id: string;
  label: string | null;
  paused_at: string | null;
  remaining_seconds: number | null;
  started_at: string | null;
  status: CookingTimerStatus;
  updated_at: string;
};

type InsertedIdRow = {
  id: string;
};

export type RecipeStepInput = {
  id?: string;
  instruction: string;
  sectionLabel: string | null;
};

export function getRecipeStepDrafts(instructions: string | null) {
  return buildRecipeStepDraftsFromInstructions(instructions);
}

export async function getCookingModeRecipe({
  householdId,
  recipeId
}: {
  householdId: string;
  recipeId: string;
}): Promise<CookingModeRecipe | null> {
  const supabase = await createClient();

  return getCookingModeRecipeWithClient({
    householdId,
    recipeId,
    supabase
  });
}

export async function getActiveCookingSession({
  householdId,
  plannedMealId = null,
  recipeId
}: {
  householdId: string;
  plannedMealId?: string | null;
  recipeId: string;
}): Promise<CookingSession | null> {
  const supabase = await createClient();
  let query = supabase
    .from("cooking_sessions")
    .select(
      "id, household_id, recipe_id, weekly_plan_item_id, status, current_step_sort_order, recipe_name_snapshot, servings_snapshot, scale_factor_snapshot, recipe_updated_at_snapshot, started_at, paused_at, completed_at, abandoned_at, notes, created_at, updated_at"
    )
    .eq("household_id", householdId)
    .eq("recipe_id", recipeId)
    .in("status", ["active", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1);

  query = plannedMealId
    ? query.eq("weekly_plan_item_id", plannedMealId)
    : query.is("weekly_plan_item_id", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return getCookingSessionById({
    householdId,
    sessionId: (data as CookingSessionRow).id,
    supabase
  });
}

export async function startCookingSession({
  householdId,
  plannedMealId = null,
  recipeId
}: {
  householdId: string;
  plannedMealId?: string | null;
  recipeId: string;
}) {
  const activeSession = await getActiveCookingSession({
    householdId,
    plannedMealId,
    recipeId
  });

  if (activeSession) {
    return activeSession;
  }

  const supabase = await createClient();
  const [recipe, plannedMeal] = await Promise.all([
    getCookingModeRecipeWithClient({ householdId, recipeId, supabase }),
    plannedMealId
      ? getPlannedMealContext({ householdId, plannedMealId, recipeId, supabase })
      : Promise.resolve(null)
  ]);

  if (!recipe) {
    throw new Error("That recipe is no longer available.");
  }

  const snapshot = buildCookingSessionSnapshot({
    plannedMeal,
    recipe: toSnapshotRecipe(recipe)
  });

  const { data, error } = await supabase
    .from("cooking_sessions")
    .insert({
      current_step_sort_order: snapshot.session.currentStepSortOrder,
      household_id: householdId,
      recipe_id: snapshot.session.recipeId,
      recipe_name_snapshot: snapshot.session.recipeNameSnapshot,
      recipe_updated_at_snapshot: snapshot.session.recipeUpdatedAtSnapshot,
      scale_factor_snapshot: snapshot.session.scaleFactorSnapshot,
      servings_snapshot: snapshot.session.servingsSnapshot,
      weekly_plan_item_id: snapshot.session.weeklyPlanItemId
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const existingSession = await getActiveCookingSession({
        householdId,
        plannedMealId,
        recipeId
      });

      if (existingSession) {
        return existingSession;
      }
    }

    throw new Error(error.message);
  }

  const sessionId = (data as InsertedIdRow).id;

  try {
    await createCookingSessionSnapshots({
      householdId,
      ingredients: snapshot.ingredients,
      sessionId,
      steps: snapshot.steps,
      supabase
    });
  } catch (error) {
    await supabase
      .from("cooking_sessions")
      .delete()
      .eq("household_id", householdId)
      .eq("id", sessionId);
    throw error;
  }

  const session = await getCookingSessionById({
    householdId,
    sessionId,
    supabase
  });

  if (!session) {
    throw new Error("Cooking session could not be loaded.");
  }

  return session;
}

export async function replaceRecipeSteps({
  householdId,
  recipeId,
  steps
}: {
  householdId: string;
  recipeId: string;
  steps: RecipeStepInput[];
}) {
  const normalizedSteps = steps
    .map((step) => ({
      id: step.id,
      instruction: step.instruction.trim(),
      sectionLabel: step.sectionLabel?.trim() || null
    }))
    .filter((step) => step.instruction.length > 0);

  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_recipe_steps", {
    p_household_id: householdId,
    p_recipe_id: recipeId,
    p_steps: normalizedSteps
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateCookingSessionCurrentStep({
  householdId,
  sessionId,
  sortOrder
}: {
  householdId: string;
  sessionId: string;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  assertCookingSessionCanBeEdited(session.status);
  validateCurrentStepSortOrder(session.steps, sortOrder);

  const { error } = await supabase
    .from("cooking_sessions")
    .update({ current_step_sort_order: sortOrder })
    .eq("household_id", householdId)
    .eq("id", sessionId)
    .in("status", ["active", "paused"]);

  if (error) {
    throw new Error(error.message);
  }

  return requireCookingSession({ householdId, sessionId, supabase });
}

export async function getCookingSession({
  householdId,
  sessionId
}: {
  householdId: string;
  sessionId: string;
}) {
  const supabase = await createClient();

  return getCookingSessionById({
    householdId,
    sessionId,
    supabase
  });
}

export async function setCookingSessionIngredientReadiness({
  checked,
  householdId,
  ingredientId,
  sessionId
}: {
  checked: boolean;
  householdId: string;
  ingredientId: string;
  sessionId: string;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  assertCookingSessionCanBeEdited(session.status);

  const { data, error } = await supabase
    .from("cooking_session_ingredients")
    .update({
      is_ready: checked,
      ready_at: checked ? new Date().toISOString() : null
    })
    .eq("household_id", householdId)
    .eq("cooking_session_id", sessionId)
    .eq("id", ingredientId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("That cooking session ingredient is no longer available.");
  }

  return requireCookingSession({ householdId, sessionId, supabase });
}

export async function setCookingSessionStepChecked({
  checked,
  householdId,
  sessionId,
  stepId
}: {
  checked: boolean;
  householdId: string;
  sessionId: string;
  stepId: string;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  assertCookingSessionCanBeEdited(session.status);

  const { data, error } = await supabase
    .from("cooking_session_steps")
    .update({
      completed_at: checked ? new Date().toISOString() : null,
      is_completed: checked
    })
    .eq("household_id", householdId)
    .eq("cooking_session_id", sessionId)
    .eq("id", stepId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("That cooking session step is no longer available.");
  }

  return requireCookingSession({ householdId, sessionId, supabase });
}

export async function pauseCookingSession({
  householdId,
  sessionId
}: {
  householdId: string;
  sessionId: string;
}) {
  return transitionCookingSession({
    action: "pause",
    householdId,
    sessionId
  });
}

export async function resumeCookingSession({
  householdId,
  sessionId
}: {
  householdId: string;
  sessionId: string;
}) {
  return transitionCookingSession({
    action: "resume",
    householdId,
    sessionId
  });
}

export async function completeCookingSession({
  householdId,
  sessionId
}: {
  householdId: string;
  sessionId: string;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  if (session.status === "completed") {
    await recordCookingSessionCompletionEvidence({
      householdId,
      session,
      supabase
    });

    return requireCookingSession({ householdId, sessionId, supabase });
  }

  const patch = buildCookingSessionLifecyclePatch(
    session.status,
    "complete",
    new Date().toISOString()
  );
  const { data, error } = await supabase
    .from("cooking_sessions")
    .update(patch)
    .eq("household_id", householdId)
    .eq("id", sessionId)
    .eq("status", session.status)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("The cooking session changed. Reload and try again.");
  }

  const completedSession = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  await recordCookingSessionCompletionEvidence({
    householdId,
    session: completedSession,
    supabase
  });

  return requireCookingSession({ householdId, sessionId, supabase });
}

export async function abandonCookingSession({
  householdId,
  sessionId
}: {
  householdId: string;
  sessionId: string;
}) {
  return transitionCookingSession({
    action: "abandon",
    householdId,
    sessionId
  });
}

export async function getCookingSessionCompletionWarningsForSession({
  householdId,
  sessionId
}: {
  householdId: string;
  sessionId: string;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  return getCookingSessionCompletionWarnings({
    ingredients: session.ingredients,
    steps: session.steps
  });
}

export async function updateCookingSessionNotes({
  householdId,
  notes,
  sessionId,
  substitutions
}: {
  householdId: string;
  notes: string | null;
  sessionId: string;
  substitutions: string | null;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  assertCookingSessionCanBeEdited(session.status);

  const { data, error } = await supabase
    .from("cooking_sessions")
    .update({
      notes,
      substitutions
    })
    .eq("household_id", householdId)
    .eq("id", sessionId)
    .in("status", ["active", "paused"])
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("The cooking session changed. Reload and try again.");
  }

  return requireCookingSession({ householdId, sessionId, supabase });
}

export async function createCookingTimer({
  durationSeconds,
  householdId,
  label,
  sessionId,
  stepId = null
}: {
  durationSeconds: number;
  householdId: string;
  label: string | null;
  sessionId: string;
  stepId?: string | null;
}) {
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Timer duration must be a positive whole number of seconds.");
  }

  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  assertCookingSessionCanBeEdited(session.status);

  if (stepId && !session.steps.some((step) => step.id === stepId)) {
    throw new Error("That cooking step is no longer available.");
  }

  const { error } = await supabase.from("cooking_timers").insert({
    cooking_session_id: sessionId,
    cooking_session_step_id: stepId,
    duration_seconds: durationSeconds,
    household_id: householdId,
    label: label?.trim() || null
  });

  if (error) {
    throw new Error(error.message);
  }

  return requireCookingSession({ householdId, sessionId, supabase });
}

export async function startCookingTimer({
  householdId,
  sessionId,
  timerId
}: {
  householdId: string;
  sessionId: string;
  timerId: string;
}) {
  return transitionCookingTimer({
    householdId,
    sessionId,
    timerId,
    transition: (timer, now) => buildCookingTimerStartPatch({ now, timer })
  });
}

export async function pauseCookingTimer({
  householdId,
  sessionId,
  timerId
}: {
  householdId: string;
  sessionId: string;
  timerId: string;
}) {
  return transitionCookingTimer({
    householdId,
    sessionId,
    timerId,
    transition: (timer, now) => buildCookingTimerPausePatch({ now, timer })
  });
}

export async function dismissCookingTimer({
  householdId,
  sessionId,
  timerId
}: {
  householdId: string;
  sessionId: string;
  timerId: string;
}) {
  return transitionCookingTimer({
    householdId,
    sessionId,
    timerId,
    transition: (timer, now) => buildCookingTimerDismissPatch({ now, timer })
  });
}

export async function cancelCookingTimer({
  householdId,
  sessionId,
  timerId
}: {
  householdId: string;
  sessionId: string;
  timerId: string;
}) {
  return transitionCookingTimer({
    householdId,
    sessionId,
    timerId,
    transition: (_timer, now) => buildCookingTimerCancelPatch(now)
  });
}

async function transitionCookingSession({
  action,
  householdId,
  sessionId
}: {
  action: CookingSessionLifecycleAction;
  householdId: string;
  sessionId: string;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });
  const patch = buildCookingSessionLifecyclePatch(
    session.status,
    action,
    new Date().toISOString()
  );
  const { data, error } = await supabase
    .from("cooking_sessions")
    .update(patch)
    .eq("household_id", householdId)
    .eq("id", sessionId)
    .eq("status", session.status)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("The cooking session changed. Reload and try again.");
  }

  return requireCookingSession({ householdId, sessionId, supabase });
}

async function transitionCookingTimer({
  householdId,
  sessionId,
  timerId,
  transition
}: {
  householdId: string;
  sessionId: string;
  timerId: string;
  transition: (
    timer: CookingTimerShape,
    now: Date
  ) => CookingTimerUpdate;
}) {
  const supabase = await createClient();
  const session = await requireCookingSession({
    householdId,
    sessionId,
    supabase
  });

  assertCookingSessionCanBeEdited(session.status);

  const timer = session.timers.find((candidate) => candidate.id === timerId);

  if (!timer) {
    throw new Error("That cooking timer is no longer available.");
  }

  const patch = transition(timer, new Date());
  const { data, error } = await supabase
    .from("cooking_timers")
    .update(patch)
    .eq("household_id", householdId)
    .eq("cooking_session_id", sessionId)
    .eq("id", timerId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("That cooking timer changed. Reload and try again.");
  }

  return requireCookingSession({ householdId, sessionId, supabase });
}

async function recordCookingSessionCompletionEvidence({
  householdId,
  session,
  supabase
}: {
  householdId: string;
  session: CookingSession;
  supabase: SupabaseClient;
}) {
  if (session.status !== "completed") {
    return;
  }

  const madeOn = (session.completedAt ?? new Date().toISOString()).slice(0, 10);
  const { data: existingReview, error: existingReviewError } = await supabase
    .from("recipe_reviews")
    .select("id")
    .eq("household_id", householdId)
    .eq("cooking_session_id", session.id)
    .maybeSingle();

  if (existingReviewError) {
    throw new Error(existingReviewError.message);
  }

  if (!existingReview) {
    const quickTags = [
      "made",
      session.substitutions ? "substitutions" : null
    ].filter((tag): tag is string => Boolean(tag));
    const notes = [session.notes, session.substitutions
      ? `Substitutions: ${session.substitutions}`
      : null]
      .filter(Boolean)
      .join("\n\n") || null;
    const { error: reviewError } = await supabase.from("recipe_reviews").insert({
      cooking_session_id: session.id,
      household_id: householdId,
      made_on: madeOn,
      notes,
      quick_tags: quickTags,
      recipe_id: session.recipeId,
      weekly_plan_item_id: session.weeklyPlanItemId
    });

    if (reviewError) {
      throw new Error(reviewError.message);
    }
  }

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({
      last_made_at: madeOn,
      status: "tried"
    })
    .eq("household_id", householdId)
    .eq("id", session.recipeId)
    .eq("status", "idea");

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  const { error: madeAtError } = await supabase
    .from("recipes")
    .update({ last_made_at: madeOn })
    .eq("household_id", householdId)
    .eq("id", session.recipeId)
    .neq("status", "idea");

  if (madeAtError) {
    throw new Error(madeAtError.message);
  }
}

async function getCookingModeRecipeWithClient({
  householdId,
  recipeId,
  supabase
}: {
  householdId: string;
  recipeId: string;
  supabase: SupabaseClient;
}): Promise<CookingModeRecipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, servings, instructions, updated_at")
    .eq("household_id", householdId)
    .eq("id", recipeId)
    .is("archived_at", null)
    .neq("status", "retired")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [ingredients, steps] = await Promise.all([
    getRecipeIngredients({ householdId, recipeId, supabase }),
    getRecipeSteps({ householdId, recipeId, supabase })
  ]);
  const recipe = data as RecipeRow;

  return {
    canStartCooking: steps.length > 0,
    id: recipe.id,
    ingredients,
    instructions: recipe.instructions,
    name: recipe.name,
    servings: toNullableNumber(recipe.servings),
    stepReviewRequired: steps.length === 0,
    steps,
    updatedAt: recipe.updated_at
  };
}

async function getRecipeIngredients({
  householdId,
  recipeId,
  supabase
}: {
  householdId: string;
  recipeId: string;
  supabase: SupabaseClient;
}): Promise<CookingModeRecipeIngredient[]> {
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      "id, food_id, display_name, quantity, unit, preparation, notes, optional, sort_order"
    )
    .eq("household_id", householdId)
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RecipeIngredientRow[]).map((row) => ({
    displayName: row.display_name,
    foodId: row.food_id,
    id: row.id,
    notes: row.notes,
    optional: row.optional,
    preparation: row.preparation,
    quantity: toNullableNumber(row.quantity),
    sortOrder: row.sort_order,
    unit: row.unit
  }));
}

async function getRecipeSteps({
  householdId,
  recipeId,
  supabase
}: {
  householdId: string;
  recipeId: string;
  supabase: SupabaseClient;
}): Promise<CookingModeRecipeStep[]> {
  const { data, error } = await supabase
    .from("recipe_steps")
    .select("id, section_label, instruction, sort_order")
    .eq("household_id", householdId)
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RecipeStepRow[]).map((row) => ({
    id: row.id,
    instruction: row.instruction,
    sectionLabel: row.section_label,
    sortOrder: row.sort_order
  }));
}

async function getPlannedMealContext({
  householdId,
  plannedMealId,
  recipeId,
  supabase
}: {
  householdId: string;
  plannedMealId: string;
  recipeId: string;
  supabase: SupabaseClient;
}): Promise<SnapshotPlannedMeal> {
  const { data, error } = await supabase
    .from("weekly_plan_items")
    .select("id, recipe_id, scale_factor")
    .eq("household_id", householdId)
    .eq("id", plannedMealId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("That planned meal is no longer available.");
  }

  const row = data as WeeklyPlanItemRow;

  if (row.recipe_id !== recipeId) {
    throw new Error("That planned meal does not match this recipe.");
  }

  return {
    id: row.id,
    scaleFactor: toNullableNumber(row.scale_factor)
  };
}

async function createCookingSessionSnapshots({
  householdId,
  ingredients,
  sessionId,
  steps,
  supabase
}: {
  householdId: string;
  ingredients: ReturnType<typeof buildCookingSessionSnapshot>["ingredients"];
  sessionId: string;
  steps: ReturnType<typeof buildCookingSessionSnapshot>["steps"];
  supabase: SupabaseClient;
}) {
  if (ingredients.length > 0) {
    const { error } = await supabase.from("cooking_session_ingredients").insert(
      ingredients.map((ingredient) => ({
        cooking_session_id: sessionId,
        display_name: ingredient.displayName,
        food_id: ingredient.foodId,
        household_id: householdId,
        notes: ingredient.notes,
        optional: ingredient.optional,
        preparation: ingredient.preparation,
        quantity: ingredient.quantity,
        recipe_ingredient_id: ingredient.recipeIngredientId,
        sort_order: ingredient.sortOrder,
        unit: ingredient.unit
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  const { error } = await supabase.from("cooking_session_steps").insert(
    steps.map((step) => ({
      cooking_session_id: sessionId,
      household_id: householdId,
      instruction: step.instruction,
      recipe_step_id: step.recipeStepId,
      section_label: step.sectionLabel,
      sort_order: step.sortOrder
    }))
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function requireCookingSession({
  householdId,
  sessionId,
  supabase
}: {
  householdId: string;
  sessionId: string;
  supabase: SupabaseClient;
}) {
  const session = await getCookingSessionById({
    householdId,
    sessionId,
    supabase
  });

  if (!session) {
    throw new Error("That cooking session is no longer available.");
  }

  return session;
}

async function getCookingSessionById({
  householdId,
  sessionId,
  supabase
}: {
  householdId: string;
  sessionId: string;
  supabase: SupabaseClient;
}): Promise<CookingSession | null> {
  const { data, error } = await supabase
    .from("cooking_sessions")
    .select(
      "id, household_id, recipe_id, weekly_plan_item_id, status, current_step_sort_order, recipe_name_snapshot, servings_snapshot, scale_factor_snapshot, recipe_updated_at_snapshot, started_at, paused_at, completed_at, abandoned_at, notes, substitutions, created_at, updated_at"
    )
    .eq("household_id", householdId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [ingredients, steps, timers] = await Promise.all([
    getCookingSessionIngredients({ householdId, sessionId, supabase }),
    getCookingSessionSteps({ householdId, sessionId, supabase }),
    getCookingSessionTimers({ householdId, sessionId, supabase })
  ]);

  return toCookingSession(data as CookingSessionRow, ingredients, steps, timers);
}

async function getCookingSessionIngredients({
  householdId,
  sessionId,
  supabase
}: {
  householdId: string;
  sessionId: string;
  supabase: SupabaseClient;
}): Promise<CookingSessionIngredient[]> {
  const { data, error } = await supabase
    .from("cooking_session_ingredients")
    .select(
      "id, recipe_ingredient_id, food_id, display_name, quantity, unit, preparation, notes, optional, sort_order, is_ready, ready_at"
    )
    .eq("household_id", householdId)
    .eq("cooking_session_id", sessionId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CookingSessionIngredientRow[]).map((row) => ({
    displayName: row.display_name,
    foodId: row.food_id,
    id: row.id,
    isReady: row.is_ready,
    notes: row.notes,
    optional: row.optional,
    preparation: row.preparation,
    quantity: toNullableNumber(row.quantity),
    readyAt: row.ready_at,
    recipeIngredientId: row.recipe_ingredient_id,
    sortOrder: row.sort_order,
    unit: row.unit
  }));
}

async function getCookingSessionSteps({
  householdId,
  sessionId,
  supabase
}: {
  householdId: string;
  sessionId: string;
  supabase: SupabaseClient;
}): Promise<CookingSessionStep[]> {
  const { data, error } = await supabase
    .from("cooking_session_steps")
    .select(
      "id, recipe_step_id, section_label, instruction, sort_order, is_completed, completed_at"
    )
    .eq("household_id", householdId)
    .eq("cooking_session_id", sessionId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CookingSessionStepRow[]).map((row) => ({
    completedAt: row.completed_at,
    id: row.id,
    instruction: row.instruction,
    isCompleted: row.is_completed,
    recipeStepId: row.recipe_step_id,
    sectionLabel: row.section_label,
    sortOrder: row.sort_order
  }));
}

async function getCookingSessionTimers({
  householdId,
  sessionId,
  supabase
}: {
  householdId: string;
  sessionId: string;
  supabase: SupabaseClient;
}): Promise<CookingTimer[]> {
  const { data, error } = await supabase
    .from("cooking_timers")
    .select(
      "id, cooking_session_step_id, label, status, duration_seconds, remaining_seconds, started_at, paused_at, expires_at, expired_at, dismissed_at, canceled_at, created_at, updated_at"
    )
    .eq("household_id", householdId)
    .eq("cooking_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CookingTimerRow[]).map((row) => ({
    canceledAt: row.canceled_at,
    cookingSessionStepId: row.cooking_session_step_id,
    createdAt: row.created_at,
    dismissedAt: row.dismissed_at,
    durationSeconds: row.duration_seconds,
    expiredAt: row.expired_at,
    expiresAt: row.expires_at,
    id: row.id,
    label: row.label,
    pausedAt: row.paused_at,
    remainingSeconds: row.remaining_seconds,
    startedAt: row.started_at,
    status: resolveCookingTimerStatus(
      {
        durationSeconds: row.duration_seconds,
        expiresAt: row.expires_at,
        remainingSeconds: row.remaining_seconds,
        status: row.status
      },
      new Date()
    ).effectiveStatus,
    updatedAt: row.updated_at
  }));
}

function toCookingSession(
  row: CookingSessionRow,
  ingredients: CookingSessionIngredient[],
  steps: CookingSessionStep[],
  timers: CookingTimer[]
): CookingSession {
  return {
    abandonedAt: row.abandoned_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    currentStepSortOrder: row.current_step_sort_order,
    householdId: row.household_id,
    id: row.id,
    ingredients,
    notes: row.notes,
    pausedAt: row.paused_at,
    recipeId: row.recipe_id,
    recipeNameSnapshot: row.recipe_name_snapshot,
    recipeUpdatedAtSnapshot: row.recipe_updated_at_snapshot,
    scaleFactorSnapshot: toNumber(row.scale_factor_snapshot),
    servingsSnapshot: toNullableNumber(row.servings_snapshot),
    startedAt: row.started_at,
    status: row.status,
    steps,
    substitutions: row.substitutions,
    timers,
    updatedAt: row.updated_at,
    weeklyPlanItemId: row.weekly_plan_item_id
  };
}

function toSnapshotRecipe(recipe: CookingModeRecipe): SnapshotRecipe {
  return {
    id: recipe.id,
    ingredients: recipe.ingredients,
    name: recipe.name,
    servings: recipe.servings,
    steps: recipe.steps,
    updatedAt: recipe.updatedAt
  };
}

function toNullableNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  return toNumber(value);
}

function toNumber(value: number | string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error("Expected a numeric database value.");
  }

  return numberValue;
}
