import type { RecipeStatus } from "./types";

export type PersistedIngredientInput = {
  display_name: string;
  food_id: string | null;
  grocery_category_id: string | null;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | null;
  sort_order: number;
  unit: string | null;
};

export type RecipePersistenceClient = {
  from(table: string): {
    delete: () => RecipeDeleteQuery;
    insert: (payload: unknown) => unknown;
  };
};

type RecipeDeleteQuery = PromiseLike<SupabaseErrorResult> & {
  eq: (field: string, value: string) => RecipeDeleteQuery;
};

type ReplaceRecipeChildrenInput = {
  approvedProfileIds: string[];
  householdId: string;
  ingredients: PersistedIngredientInput[];
  recipeId: string;
  status: RecipeStatus;
  supabase: RecipePersistenceClient;
  tags: string[];
};

type PersistCreatedRecipeInput = Omit<ReplaceRecipeChildrenInput, "recipeId"> & {
  recipePayload: Record<string, unknown>;
};

export type PersistCreatedRecipeResult =
  | {
      ok: true;
      recipeId: string;
    }
  | {
      error: string;
      ok: false;
    };

type SupabaseErrorResult = {
  error: {
    message: string;
  } | null;
};

export async function persistCreatedRecipeWithChildren({
  approvedProfileIds,
  householdId,
  ingredients,
  recipePayload,
  status,
  supabase,
  tags
}: PersistCreatedRecipeInput): Promise<PersistCreatedRecipeResult> {
  const { data: recipe, error } = await (
    supabase.from("recipes").insert({
      ...recipePayload,
      household_id: householdId
    }) as {
      select: (columns: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    }
  )
    .select("id")
    .single();

  if (error) {
    return { error: error.message, ok: false };
  }

  if (!recipe) {
    return { error: "Recipe could not be created.", ok: false };
  }

  const childError = await replaceRecipeChildren({
    approvedProfileIds,
    householdId,
    ingredients,
    recipeId: recipe.id,
    status,
    supabase,
    tags
  });

  if (!childError) {
    return { ok: true, recipeId: recipe.id };
  }

  const cleanupError = await deleteCreatedRecipe({
    householdId,
    recipeId: recipe.id,
    supabase
  });

  if (cleanupError) {
    return {
      error:
        "Recipe could not be saved completely, and the incomplete recipe could not be cleaned up automatically.",
      ok: false
    };
  }

  return { error: childError, ok: false };
}

export async function replaceRecipeChildren({
  approvedProfileIds,
  householdId,
  ingredients,
  recipeId,
  status,
  supabase,
  tags
}: ReplaceRecipeChildrenInput) {
  for (const table of [
    "recipe_ingredients",
    "recipe_tags",
    "recipe_profile_approvals"
  ] as const) {
    const result = await queryResult(
      supabase
        .from(table)
        .delete()
        .eq("household_id", householdId)
        .eq("recipe_id", recipeId)
    );

    if (result.error) {
      return result.error.message;
    }
  }

  const ingredientResult = await queryResult(
    supabase.from("recipe_ingredients").insert(
      ingredients.map((ingredient) => ({
        ...ingredient,
        household_id: householdId,
        recipe_id: recipeId
      }))
    )
  );

  if (ingredientResult.error) {
    return ingredientResult.error.message;
  }

  if (tags.length > 0) {
    const tagResult = await queryResult(
      supabase.from("recipe_tags").insert(
        tags.map((tag) => ({
          household_id: householdId,
          recipe_id: recipeId,
          tag
        }))
      )
    );

    if (tagResult.error) {
      return tagResult.error.message;
    }
  }

  if (approvedProfileIds.length > 0) {
    const approvalResult = await queryResult(
      supabase.from("recipe_profile_approvals").insert(
        approvedProfileIds.map((profileId) => ({
          approved_for_planning: true,
          household_id: householdId,
          meal_profile_id: profileId,
          recipe_id: recipeId,
          status
        }))
      )
    );

    if (approvalResult.error) {
      return approvalResult.error.message;
    }
  }

  return null;
}

async function deleteCreatedRecipe({
  householdId,
  recipeId,
  supabase
}: {
  householdId: string;
  recipeId: string;
  supabase: RecipePersistenceClient;
}) {
  const result = await queryResult(
    supabase
      .from("recipes")
      .delete()
      .eq("household_id", householdId)
      .eq("id", recipeId)
  );

  return result.error?.message ?? null;
}

async function queryResult(value: unknown): Promise<SupabaseErrorResult> {
  return (await value) as SupabaseErrorResult;
}
