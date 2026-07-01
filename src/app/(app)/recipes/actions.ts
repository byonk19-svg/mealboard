"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  estimateConfidences,
  mealTypes,
  recipeRepeatRules,
  recipeStatuses,
  type EstimateConfidence,
  type MealType,
  type RecipeRepeatRule,
  type RecipeStatus
} from "@/lib/recipes/types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  buildRecipeMessagePath,
  resolveRecipeFormReturnPath
} from "@/lib/recipes/recipe-form-path";
import {
  persistCreatedRecipeWithChildren,
  replaceRecipeChildren,
  type PersistedIngredientInput,
  type RecipePersistenceClient
} from "@/lib/recipes/persist-recipe";
import { replaceRecipeSteps } from "@/lib/cooking-mode/data";

type ParsedNumber =
  | {
      value: number | null;
    }
  | {
      error: string;
    };

type IngredientInput = {
  display_name: string;
  food_id: string | null;
  new_food_name: string | null;
  quantity: number | null;
  unit: string | null;
  grocery_category_id: string | null;
  preparation: string | null;
  notes: string | null;
  optional: boolean;
  sort_order: number;
};

function recipeRedirect(path: string, message: string): never {
  redirect(buildRecipeMessagePath(path, message));
}

function textOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function parseOptionalNumber(
  value: FormDataEntryValue | null,
  label: string,
  options: { integer?: boolean; min?: number } = {}
): ParsedNumber {
  const text = String(value ?? "").trim();

  if (!text) {
    return { value: null };
  }

  const parsed = Number(text);
  const min = options.min ?? 0;

  if (!Number.isFinite(parsed) || parsed < min) {
    return { error: `${label} must be ${min > 0 ? "positive" : "zero or more"}.` };
  }

  if (options.integer && !Number.isInteger(parsed)) {
    return { error: `${label} must be a whole number.` };
  }

  return { value: parsed };
}

function isRecipeStatus(value: string): value is RecipeStatus {
  return recipeStatuses.includes(value as RecipeStatus);
}

function isMealType(value: string): value is MealType {
  return mealTypes.includes(value as MealType);
}

function isEstimateConfidence(value: string): value is EstimateConfidence {
  return estimateConfidences.includes(value as EstimateConfidence);
}

function isRecipeRepeatRule(value: string): value is RecipeRepeatRule {
  return recipeRepeatRules.includes(value as RecipeRepeatRule);
}

async function requireHousehold(path: string) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    recipeRedirect(path, "Link your user to a household before editing recipes.");
  }

  return householdContext.household;
}

function resolveRecipeFormPath(formData: FormData, fallback: string) {
  return resolveRecipeFormReturnPath(
    textOrNull(formData.get("recipeFormPath")),
    fallback
  );
}

function requireImportReviewAcknowledgement(formData: FormData, path: string) {
  const isRequired =
    String(formData.get("importReviewAcknowledgementRequired") ?? "") === "true";
  const isAcknowledged =
    String(formData.get("importReviewAcknowledged") ?? "") === "yes";

  if (isRequired && !isAcknowledged) {
    recipeRedirect(path, "Review the import issues before saving this recipe.");
  }
}

function parseRecipePayload(formData: FormData, path: string) {
  const name = textOrNull(formData.get("name"));
  const status = String(formData.get("status") ?? "");
  const mealType = String(formData.get("mealType") ?? "");
  const nutritionConfidence = textOrNull(formData.get("nutritionConfidence"));
  const repeatRule = textOrNull(formData.get("repeatRule"));
  const sourceUrl = textOrNull(formData.get("sourceUrl"));

  if (!name) {
    recipeRedirect(path, "Recipe name is required.");
  }

  if (!isRecipeStatus(status) || !isMealType(mealType)) {
    recipeRedirect(path, "Choose a valid recipe status and meal type.");
  }

  if (nutritionConfidence && !isEstimateConfidence(nutritionConfidence)) {
    recipeRedirect(path, "Choose a valid nutrition confidence.");
  }

  if (repeatRule && !isRecipeRepeatRule(repeatRule)) {
    recipeRedirect(path, "Choose a valid repeat rule.");
  }

  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    recipeRedirect(path, "Recipe source URL must start with http:// or https://.");
  }

  const parsedNutritionConfidence: EstimateConfidence | null =
    nutritionConfidence && isEstimateConfidence(nutritionConfidence)
      ? nutritionConfidence
      : null;
  const parsedRepeatRule: RecipeRepeatRule | null =
    repeatRule && isRecipeRepeatRule(repeatRule) ? repeatRule : null;

  const servings = parseOptionalNumber(formData.get("servings"), "Servings", {
    min: 0.01
  });
  const prepMinutes = parseOptionalNumber(
    formData.get("prepMinutes"),
    "Prep minutes",
    { integer: true }
  );
  const cookMinutes = parseOptionalNumber(
    formData.get("cookMinutes"),
    "Cook minutes",
    { integer: true }
  );
  const calories = parseOptionalNumber(
    formData.get("estimatedCaloriesPerServing"),
    "Calories per serving",
    { integer: true, min: 1 }
  );
  const protein = parseOptionalNumber(
    formData.get("estimatedProteinGramsPerServing"),
    "Protein grams per serving",
    { integer: true }
  );

  if ("error" in servings) {
    recipeRedirect(path, servings.error);
  }

  if ("error" in prepMinutes) {
    recipeRedirect(path, prepMinutes.error);
  }

  if ("error" in cookMinutes) {
    recipeRedirect(path, cookMinutes.error);
  }

  if ("error" in calories) {
    recipeRedirect(path, calories.error);
  }

  if ("error" in protein) {
    recipeRedirect(path, protein.error);
  }

  return {
    name,
    description: textOrNull(formData.get("description")),
    status,
    meal_type: mealType,
    servings: servings.value,
    prep_minutes: prepMinutes.value,
    cook_minutes: cookMinutes.value,
    effort_level: textOrNull(formData.get("effortLevel")),
    repeat_rule: parsedRepeatRule,
    instructions: textOrNull(formData.get("instructions")),
    notes: textOrNull(formData.get("notes")),
    source_title: textOrNull(formData.get("sourceTitle")),
    source_url: sourceUrl,
    estimated_calories_per_serving: calories.value,
    estimated_protein_grams_per_serving: protein.value,
    nutrition_confidence: parsedNutritionConfidence
  };
}

function parseIngredients(formData: FormData, path: string): IngredientInput[] {
  const displayNames = formData.getAll("ingredientDisplayName");
  const foodIds = formData.getAll("ingredientFoodId");
  const quantities = formData.getAll("ingredientQuantity");
  const units = formData.getAll("ingredientUnit");
  const categoryIds = formData.getAll("ingredientCategoryId");
  const newFoodNames = formData.getAll("ingredientNewFoodName");
  const preparations = formData.getAll("ingredientPreparation");
  const notes = formData.getAll("ingredientNotes");
  const needsReviewValues = formData.getAll("ingredientNeedsReview");
  const reviewedRows = new Set(
    formData.getAll("ingredientReviewed").map((value) => String(value))
  );
  const optionalRows = new Set(
    formData.getAll("ingredientOptional").map((value) => String(value))
  );

  const ingredients = displayNames
    .map((displayName, index) => {
      const name = textOrNull(displayName);

      if (!name) {
        return null;
      }

      const quantity = parseOptionalNumber(
        quantities[index] ?? null,
        `Ingredient ${index + 1} quantity`,
        { min: 0.01 }
      );

      if ("error" in quantity) {
        recipeRedirect(path, quantity.error);
      }

      const needsReview = String(needsReviewValues[index] ?? "false") === "true";

      if (needsReview && !reviewedRows.has(String(index))) {
        recipeRedirect(path, `Review ingredient ${index + 1} before saving.`);
      }

      return {
        display_name: name,
        food_id: textOrNull(foodIds[index] ?? null),
        new_food_name: textOrNull(newFoodNames[index] ?? null),
        quantity: quantity.value,
        unit: textOrNull(units[index] ?? null),
        grocery_category_id: textOrNull(categoryIds[index] ?? null),
        preparation: textOrNull(preparations[index] ?? null),
        notes: textOrNull(notes[index] ?? null),
        optional: optionalRows.has(String(index)),
        sort_order: index
      };
    })
    .filter((ingredient): ingredient is IngredientInput => ingredient !== null);

  if (ingredients.length === 0) {
    recipeRedirect(path, "Add at least one structured ingredient row.");
  }

  return ingredients;
}

function parseTags(formData: FormData) {
  const tagText = String(formData.get("tags") ?? "");

  return Array.from(
    new Set(
      tagText
        .split(",")
        .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "_"))
        .filter(Boolean)
    )
  );
}

function parseApprovedProfileIds(formData: FormData) {
  return formData.getAll("approvedProfileIds").map((value) => String(value));
}

export async function createRecipe(formData: FormData) {
  const path = resolveRecipeFormPath(formData, "/recipes/new");
  requireImportReviewAcknowledgement(formData, path);
  const household = await requireHousehold(path);
  const recipePayload = parseRecipePayload(formData, path);
  const parsedIngredients = parseIngredients(formData, path);
  const tags = parseTags(formData);
  const approvedProfileIds = parseApprovedProfileIds(formData);
  const supabase = await createClient();
  const persistenceClient = supabase as unknown as RecipePersistenceClient;
  const ingredients = await resolveIngredientFoodIds({
    householdId: household.id,
    ingredients: parsedIngredients,
    path,
    supabase
  });

  const result = await persistCreatedRecipeWithChildren({
    approvedProfileIds,
    householdId: household.id,
    ingredients,
    recipePayload,
    status: recipePayload.status,
    supabase: persistenceClient,
    tags
  });

  if (!result.ok) {
    recipeRedirect(path, result.error);
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${result.recipeId}?message=${encodeURIComponent("Recipe created.")}`);
}

export async function updateRecipe(formData: FormData) {
  const recipeId = textOrNull(formData.get("recipeId"));
  const path = recipeId ? `/recipes/${recipeId}` : "/recipes";

  if (!recipeId) {
    recipeRedirect("/recipes", "Recipe is required.");
  }

  const household = await requireHousehold(path);
  const recipePayload = parseRecipePayload(formData, path);
  const parsedIngredients = parseIngredients(formData, path);
  const tags = parseTags(formData);
  const approvedProfileIds = parseApprovedProfileIds(formData);
  const supabase = await createClient();
  const persistenceClient = supabase as unknown as RecipePersistenceClient;
  const ingredients = await resolveIngredientFoodIds({
    householdId: household.id,
    ingredients: parsedIngredients,
    path,
    supabase
  });

  const { error } = await supabase
    .from("recipes")
    .update(recipePayload)
    .eq("household_id", household.id)
    .eq("id", recipeId);

  if (error) {
    recipeRedirect(path, error.message);
  }

  const childError = await replaceRecipeChildren({
    approvedProfileIds,
    householdId: household.id,
    ingredients,
    recipeId,
    status: recipePayload.status,
    supabase: persistenceClient,
    tags
  });

  if (childError) {
    recipeRedirect(path, childError);
  }

  revalidatePath("/recipes");
  revalidatePath(path);
  recipeRedirect(path, "Recipe updated.");
}

export async function saveRecipeSteps(formData: FormData) {
  const recipeId = textOrNull(formData.get("recipeId"));
  const path = recipeId ? `/recipes/${recipeId}` : "/recipes";

  if (!recipeId) {
    recipeRedirect("/recipes", "Recipe is required.");
  }

  const household = await requireHousehold(path);
  const instructions = formData.getAll("stepInstruction");
  const sectionLabels = formData.getAll("stepSectionLabel");
  const stepIds = formData.getAll("stepId");
  const steps = instructions
    .map((instruction, index) => ({
      id: textOrNull(stepIds[index] ?? null) ?? undefined,
      instruction: String(instruction ?? "").trim(),
      sectionLabel: textOrNull(sectionLabels[index] ?? null)
    }))
    .filter((step) => step.instruction.length > 0);

  if (steps.length === 0) {
    recipeRedirect(path, "Add at least one reviewed cooking step.");
  }

  await replaceRecipeSteps({
    householdId: household.id,
    recipeId,
    steps
  });

  revalidatePath("/recipes");
  revalidatePath(path);
  recipeRedirect(path, "Cooking steps saved.");
}

async function resolveIngredientFoodIds({
  householdId,
  ingredients,
  path,
  supabase
}: {
  householdId: string;
  ingredients: IngredientInput[];
  path: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const resolvedIngredients: PersistedIngredientInput[] = [];

  for (const ingredient of ingredients) {
    const { new_food_name: newFoodName, ...ingredientPayload } = ingredient;

    if (!newFoodName) {
      resolvedIngredients.push(ingredientPayload);
      continue;
    }

    const foodId = await findOrCreateFood({
      categoryId: ingredient.grocery_category_id,
      householdId,
      name: newFoodName,
      path,
      unit: ingredient.unit,
      supabase
    });

    resolvedIngredients.push({
      ...ingredientPayload,
      food_id: foodId
    });
  }

  return resolvedIngredients;
}

async function findOrCreateFood({
  categoryId,
  householdId,
  name,
  path,
  unit,
  supabase
}: {
  categoryId: string | null;
  householdId: string;
  name: string;
  path: string;
  unit: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const normalizedName = name.trim();
  const { data: existingFood, error: existingError } = await supabase
    .from("foods")
    .select("id")
    .eq("household_id", householdId)
    .ilike("name", normalizedName)
    .maybeSingle();

  if (existingError) {
    recipeRedirect(path, existingError.message);
  }

  if (existingFood) {
    return existingFood.id;
  }

  const { data: createdFood, error: createError } = await supabase
    .from("foods")
    .insert({
      default_grocery_category_id: categoryId,
      default_unit: unit,
      household_id: householdId,
      name: normalizedName
    })
    .select("id")
    .single();

  if (createError) {
    const { data: fallbackFood, error: fallbackError } = await supabase
      .from("foods")
      .select("id")
      .eq("household_id", householdId)
      .ilike("name", normalizedName)
      .maybeSingle();

    if (fallbackError || !fallbackFood) {
      recipeRedirect(path, createError.message);
    }

    return fallbackFood.id;
  }

  return createdFood.id;
}
