export type FoodPreferenceLevel =
  | "love"
  | "like"
  | "okay"
  | "dislike"
  | "hard_no"
  | "allergy";

export type RecipeIngredientForPreference = {
  foodId?: string | null;
  displayName: string;
};

export type ProfileFoodPreference = {
  foodId: string;
  foodName: string;
  preference: FoodPreferenceLevel;
  notes?: string | null;
  prepNotes?: string | null;
};

type PreferenceMatch = {
  foodId: string;
  foodName: string;
  preference: "dislike" | "hard_no" | "allergy";
  notes?: string;
  prepNotes?: string;
};

export type RecipePreferenceEvaluation = {
  status: "allowed" | "warning" | "blocked";
  blocks: PreferenceMatch[];
  warnings: PreferenceMatch[];
};

type EvaluateRecipeForProfileInput = {
  ingredients: RecipeIngredientForPreference[];
  preferences: ProfileFoodPreference[];
};

export function evaluateRecipeForProfile({
  ingredients,
  preferences
}: EvaluateRecipeForProfileInput): RecipePreferenceEvaluation {
  const ingredientFoodIds = new Set(
    ingredients
      .map((ingredient) => ingredient.foodId)
      .filter((foodId): foodId is string => Boolean(foodId))
  );

  const relevantPreferences = preferences.filter((preference) =>
    ingredientFoodIds.has(preference.foodId)
  );

  const blocks = relevantPreferences
    .filter(
      (preference) =>
        preference.preference === "hard_no" ||
        preference.preference === "allergy"
    )
    .map(toPreferenceMatch);

  const warnings = relevantPreferences
    .filter((preference) => preference.preference === "dislike")
    .map(toPreferenceMatch);

  return {
    status: blocks.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "allowed",
    blocks,
    warnings
  };
}

function toPreferenceMatch(preference: ProfileFoodPreference): PreferenceMatch {
  return {
    foodId: preference.foodId,
    foodName: preference.foodName,
    preference: preference.preference as PreferenceMatch["preference"],
    ...(preference.notes ? { notes: preference.notes } : {}),
    ...(preference.prepNotes ? { prepNotes: preference.prepNotes } : {})
  };
}
