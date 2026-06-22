import type { RecipeWithDetails, MealType } from "@/lib/recipes/types";
import type {
  AdultDayType,
  WeeklyGoalType,
  WeeklyPlanItem,
  WeeklyPlanProfileDay
} from "@/lib/weekly-plans/types";
import type { ProfileType } from "@/lib/settings/types";

type SuggestionProfile = {
  id: string;
  name: string;
  profile_type: ProfileType;
};

export type MealSuggestionScore =
  | {
      eligible: true;
      reasonLabels: string[];
      score: number;
      warningCount: number;
    }
  | {
      eligible: false;
      rejectionReason: string;
      reasonLabels: string[];
      score: number;
      warningCount: number;
    };

export type RuleBasedMealSuggestion = {
  estimatedCalories: number | null;
  estimatedProteinGrams: number | null;
  mealProfileId: string;
  mealProfileName: string;
  mealType: MealType;
  notes: string;
  planDate: string;
  reasonLabels: string[];
  recipeId: string;
  recipeName: string;
  score: number;
};

type ScoreRecipeInput = {
  adultDayType?: AdultDayType | null;
  goals: WeeklyGoalType[];
  profileId: string;
  recipe: RecipeWithDetails;
  requestedMealType: MealType;
};

type BuildSuggestionsInput = {
  goals: WeeklyGoalType[];
  planItems: WeeklyPlanItem[];
  profileDays: WeeklyPlanProfileDay[];
  profiles: SuggestionProfile[];
  recipes: RecipeWithDetails[];
  weekDateKeys: string[];
};

const mealTypeRank: Record<MealType, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
  side: 4,
  drink: 5,
  baby_meal: 6,
  other: 7
};

export function scoreRecipeForMealSlot({
  adultDayType,
  goals,
  profileId,
  recipe,
  requestedMealType
}: ScoreRecipeInput): MealSuggestionScore {
  if (recipe.status === "retired") {
    return rejected("Recipe is retired.");
  }

  if (!doesRecipeFitMealType(recipe.meal_type, requestedMealType)) {
    return rejected(`Recipe is not a ${formatMealTypeForReason(requestedMealType)}.`);
  }

  const approval = recipe.approvals.find(
    (candidate) => candidate.meal_profile_id === profileId
  );

  if (!approval?.approved_for_planning) {
    return rejected("Recipe is not approved for this profile.");
  }

  const preferenceEvaluation = recipe.preferenceEvaluations.find(
    (evaluation) => evaluation.mealProfileId === profileId
  )?.evaluation;

  if (preferenceEvaluation?.status === "blocked") {
    return rejected("Recipe conflicts with hard-no or allergy preferences.");
  }

  const reasonLabels = [
    `Approved for ${approval.meal_profile_name}`,
    `Fits ${formatMealTypeForReason(requestedMealType)}`
  ];
  let score = 80;

  if (adultDayType === "work_day" && requestedMealType === "lunch") {
    score += 8;
    reasonLabels.push("Work-day friendly");
  }

  if (
    goals.includes("high_protein") &&
    (recipe.estimated_protein_grams_per_serving ?? 0) >= 30
  ) {
    score += 15;
    reasonLabels.push("High protein");
  }

  if (
    (goals.includes("low_prep_work_meals") || goals.includes("low_effort")) &&
    isLowPrepRecipe(recipe)
  ) {
    score += 15;
    reasonLabels.push("Low prep");
  }

  if (
    goals.includes("weight_loss") &&
    (recipe.estimated_calories_per_serving ?? Number.MAX_SAFE_INTEGER) <= 550
  ) {
    score += 8;
    reasonLabels.push("Calorie-aware");
  }

  if (
    goals.includes("family_favorites") &&
    (recipe.status === "favorite" || approval.rating === "love")
  ) {
    score += 10;
    reasonLabels.push("Family favorite");
  }

  const warningCount = preferenceEvaluation?.warnings.length ?? 0;

  if (warningCount > 0) {
    score -= 20;
    reasonLabels.push("Preference warning");
  }

  return {
    eligible: true,
    reasonLabels,
    score,
    warningCount
  };
}

export function buildRuleBasedMealSuggestions({
  goals,
  planItems,
  profileDays,
  profiles,
  recipes,
  weekDateKeys
}: BuildSuggestionsInput): RuleBasedMealSuggestion[] {
  const profileDayByKey = new Map(
    profileDays.map((day) => [
      `${day.meal_profile_id}:${day.plan_date}`,
      day.adult_day_type
    ])
  );
  const occupiedSlots = new Set(
    planItems
      .filter((item) => item.meal_profile_id)
      .map((item) => `${item.meal_profile_id}:${item.plan_date}:${item.meal_type}`)
  );
  const adultProfiles = profiles
    .filter((profile) => profile.profile_type === "adult")
    .sort((a, b) => a.name.localeCompare(b.name));
  const suggestions: RuleBasedMealSuggestion[] = [];

  for (const dateKey of weekDateKeys) {
    for (const profile of adultProfiles) {
      const adultDayType =
        profileDayByKey.get(`${profile.id}:${dateKey}`) ?? null;

      for (const mealType of getSuggestionMealTypes(adultDayType)) {
        if (occupiedSlots.has(`${profile.id}:${dateKey}:${mealType}`)) {
          continue;
        }

        const suggestion = getBestSuggestionForSlot({
          adultDayType,
          dateKey,
          goals,
          mealType,
          profile,
          recipes
        });

        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
  }

  return suggestions;
}

function getBestSuggestionForSlot({
  adultDayType,
  dateKey,
  goals,
  mealType,
  profile,
  recipes
}: {
  adultDayType: AdultDayType | null;
  dateKey: string;
  goals: WeeklyGoalType[];
  mealType: MealType;
  profile: SuggestionProfile;
  recipes: RecipeWithDetails[];
}) {
  const scored = recipes
    .map((recipe) => ({
      recipe,
      score: scoreRecipeForMealSlot({
        adultDayType,
        goals,
        profileId: profile.id,
        recipe,
        requestedMealType: mealType
      })
    }))
    .filter(
      (entry): entry is { recipe: RecipeWithDetails; score: Extract<MealSuggestionScore, { eligible: true }> } =>
        entry.score.eligible
    )
    .sort((a, b) => {
      if (a.score.score !== b.score.score) {
        return b.score.score - a.score.score;
      }

      if (a.score.warningCount !== b.score.warningCount) {
        return a.score.warningCount - b.score.warningCount;
      }

      if (
        (a.recipe.estimated_protein_grams_per_serving ?? 0) !==
        (b.recipe.estimated_protein_grams_per_serving ?? 0)
      ) {
        return (
          (b.recipe.estimated_protein_grams_per_serving ?? 0) -
          (a.recipe.estimated_protein_grams_per_serving ?? 0)
        );
      }

      return (
        a.recipe.name.localeCompare(b.recipe.name) ||
        a.recipe.id.localeCompare(b.recipe.id)
      );
    });

  const best = scored[0];

  if (!best) {
    return null;
  }

  return {
    estimatedCalories: best.recipe.estimated_calories_per_serving,
    estimatedProteinGrams: best.recipe.estimated_protein_grams_per_serving,
    mealProfileId: profile.id,
    mealProfileName: profile.name,
    mealType,
    notes: `Suggested by rule-based planning: ${best.score.reasonLabels.join(", ")}.`,
    planDate: dateKey,
    reasonLabels: best.score.reasonLabels,
    recipeId: best.recipe.id,
    recipeName: best.recipe.name,
    score: best.score.score
  } satisfies RuleBasedMealSuggestion;
}

function getSuggestionMealTypes(
  adultDayType: AdultDayType | null
): MealType[] {
  return adultDayType === "work_day" ? ["lunch", "dinner"] : ["dinner"];
}

function doesRecipeFitMealType(recipeMealType: MealType, requestedMealType: MealType) {
  return recipeMealType === requestedMealType || recipeMealType === "other";
}

function isLowPrepRecipe(recipe: RecipeWithDetails) {
  const effort = recipe.effort_level?.toLowerCase() ?? "";
  const tags = recipe.tags.map((tag) => tag.tag.toLowerCase());

  return (
    ["low", "easy", "quick"].some((token) => effort.includes(token)) ||
    tags.some((tag) =>
      ["low prep", "low-prep", "easy", "quick", "work lunch"].some((token) =>
        tag.includes(token)
      )
    )
  );
}

function rejected(rejectionReason: string): MealSuggestionScore {
  return {
    eligible: false,
    rejectionReason,
    reasonLabels: [],
    score: 0,
    warningCount: 0
  };
}

function formatMealTypeForReason(mealType: MealType) {
  if (mealType === "baby_meal") {
    return "baby meal";
  }

  return mealType.replace("_", " ");
}

export function compareSuggestedPlanItems(
  a: Pick<RuleBasedMealSuggestion, "mealType" | "planDate" | "mealProfileName">,
  b: Pick<RuleBasedMealSuggestion, "mealType" | "planDate" | "mealProfileName">
) {
  return (
    a.planDate.localeCompare(b.planDate) ||
    a.mealProfileName.localeCompare(b.mealProfileName) ||
    mealTypeRank[a.mealType] - mealTypeRank[b.mealType]
  );
}
