import {
  evaluateRecipeForProfile,
  type ProfileFoodPreference
} from "@/lib/preferences/evaluate-recipe-for-profile";
import {
  getFoodPreferences,
  getMealProfiles
} from "@/lib/settings/data";
import { createClient } from "@/lib/supabase/server";
import type {
  GroceryCategory,
  Recipe,
  RecipeFoodPreference,
  RecipeIngredient,
  RecipeProfileApproval,
  RecipeTag,
  RecipeWithDetails
} from "@/lib/recipes/types";

type RecipeIngredientRow = Omit<
  RecipeIngredient,
  "food_name" | "grocery_category_name"
> & {
  foods: { name: string } | { name: string }[] | null;
  grocery_categories: { name: string } | { name: string }[] | null;
};

type RecipeApprovalRow = Omit<
  RecipeProfileApproval,
  "meal_profile_name"
> & {
  meal_profiles: { name: string } | { name: string }[] | null;
};

export async function getGroceryCategories(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grocery_categories")
    .select("id, household_id, name")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GroceryCategory[];
}

export async function getRecipes(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, household_id, name, description, status, meal_type, servings, prep_minutes, cook_minutes, effort_level, repeat_rule, instructions, notes, source_title, source_url, estimated_calories_per_serving, estimated_protein_grams_per_serving, nutrition_confidence, created_at, updated_at"
    )
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const recipes = (data ?? []) as Recipe[];
  const details = await Promise.all(
    recipes.map((recipe) => getRecipeDetails(householdId, recipe.id, recipe))
  );

  return details;
}

export async function getRecipe(householdId: string, recipeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, household_id, name, description, status, meal_type, servings, prep_minutes, cook_minutes, effort_level, repeat_rule, instructions, notes, source_title, source_url, estimated_calories_per_serving, estimated_protein_grams_per_serving, nutrition_confidence, created_at, updated_at"
    )
    .eq("household_id", householdId)
    .eq("id", recipeId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return getRecipeDetails(householdId, recipeId, data as Recipe);
}

async function getRecipeDetails(
  householdId: string,
  recipeId: string,
  recipe: Recipe
): Promise<RecipeWithDetails> {
  const [ingredients, tags, approvals, profiles, preferences] =
    await Promise.all([
      getRecipeIngredients(householdId, recipeId),
      getRecipeTags(householdId, recipeId),
      getRecipeProfileApprovals(householdId, recipeId),
      getMealProfiles(householdId),
      getRecipeFoodPreferences(householdId)
    ]);

  const preferenceEvaluations = profiles.map((profile) => {
    const profilePreferences = preferences
      .filter((preference) => preference.meal_profile_id === profile.id)
      .map(
        (preference): ProfileFoodPreference => ({
          foodId: preference.food_id,
          foodName: preference.food_name,
          preference: preference.preference,
          notes: preference.notes,
          prepNotes: preference.prep_notes
        })
      );

    return {
      mealProfileId: profile.id,
      mealProfileName: profile.name,
      evaluation: evaluateRecipeForProfile({
        ingredients: ingredients.map((ingredient) => ({
          foodId: ingredient.food_id,
          displayName: ingredient.display_name
        })),
        preferences: profilePreferences
      })
    };
  });

  return {
    ...recipe,
    ingredients,
    tags,
    approvals,
    preferenceEvaluations
  };
}

async function getRecipeIngredients(householdId: string, recipeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select(
      "id, household_id, recipe_id, food_id, display_name, quantity, unit, grocery_category_id, preparation, notes, optional, sort_order, foods(name), grocery_categories(name)"
    )
    .eq("household_id", householdId)
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RecipeIngredientRow[]).map((row) => ({
    id: row.id,
    household_id: row.household_id,
    recipe_id: row.recipe_id,
    food_id: row.food_id,
    food_name: getJoinedName(row.foods),
    display_name: row.display_name,
    quantity: row.quantity,
    unit: row.unit,
    grocery_category_id: row.grocery_category_id,
    grocery_category_name: getJoinedName(row.grocery_categories),
    preparation: row.preparation,
    notes: row.notes,
    optional: row.optional,
    sort_order: row.sort_order
  }));
}

async function getRecipeTags(householdId: string, recipeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_tags")
    .select("id, recipe_id, tag")
    .eq("household_id", householdId)
    .eq("recipe_id", recipeId)
    .order("tag", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RecipeTag[];
}

async function getRecipeProfileApprovals(
  householdId: string,
  recipeId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_profile_approvals")
    .select(
      "id, recipe_id, meal_profile_id, status, rating, approved_for_planning, notes, meal_profiles(name)"
    )
    .eq("household_id", householdId)
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RecipeApprovalRow[]).map((row) => ({
    id: row.id,
    recipe_id: row.recipe_id,
    meal_profile_id: row.meal_profile_id,
    meal_profile_name: getJoinedName(row.meal_profiles) ?? "Unknown",
    status: row.status,
    rating: row.rating,
    approved_for_planning: row.approved_for_planning,
    notes: row.notes
  }));
}

async function getRecipeFoodPreferences(householdId: string) {
  const preferences = await getFoodPreferences(householdId);

  return preferences.map(
    (preference): RecipeFoodPreference => ({
      meal_profile_id: preference.meal_profile_id,
      meal_profile_name: preference.meal_profile_name,
      food_id: preference.food_id,
      food_name: preference.food_name,
      preference: preference.preference,
      notes: preference.notes,
      prep_notes: preference.prep_notes
    })
  );
}

function getJoinedName(value: { name: string } | { name: string }[] | null) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value?.name ?? null;
}
