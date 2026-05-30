import type { WeeklyPlanItem } from "@/lib/weekly-plans/types";

export type DailyNutritionSummary = {
  calories: number | null;
  date: string;
  itemCount: number;
  knownCalorieItems: number;
  knownProteinItems: number;
  mealProfileId: string;
  mealProfileName: string | null;
  proteinGrams: number | null;
  unknownCalorieItems: number;
  unknownProteinItems: number;
};

type MutableDailyNutritionSummary = Omit<
  DailyNutritionSummary,
  "calories" | "proteinGrams"
> & {
  calories: number;
  proteinGrams: number;
};

export function calculateDailyNutritionTotals(
  items: WeeklyPlanItem[]
): DailyNutritionSummary[] {
  const summariesByProfileDay = new Map<string, MutableDailyNutritionSummary>();

  for (const item of items) {
    if (!item.meal_profile_id) {
      continue;
    }

    const key = `${item.meal_profile_id}:${item.plan_date}`;
    const summary =
      summariesByProfileDay.get(key) ??
      createSummary(item.meal_profile_id, item.meal_profile_name, item.plan_date);
    const scaleFactor = item.scale_factor > 0 ? item.scale_factor : 1;

    summary.itemCount += 1;

    if (item.estimated_calories === null) {
      summary.unknownCalorieItems += 1;
    } else {
      summary.calories += item.estimated_calories * scaleFactor;
      summary.knownCalorieItems += 1;
    }

    if (item.estimated_protein_grams === null) {
      summary.unknownProteinItems += 1;
    } else {
      summary.proteinGrams += item.estimated_protein_grams * scaleFactor;
      summary.knownProteinItems += 1;
    }

    summariesByProfileDay.set(key, summary);
  }

  return Array.from(summariesByProfileDay.values())
    .sort(compareSummaries)
    .map((summary) => ({
      ...summary,
      calories:
        summary.knownCalorieItems > 0 ? roundEstimate(summary.calories) : null,
      proteinGrams:
        summary.knownProteinItems > 0
          ? roundEstimate(summary.proteinGrams)
          : null
    }));
}

function createSummary(
  mealProfileId: string,
  mealProfileName: string | null,
  date: string
): MutableDailyNutritionSummary {
  return {
    calories: 0,
    date,
    itemCount: 0,
    knownCalorieItems: 0,
    knownProteinItems: 0,
    mealProfileId,
    mealProfileName,
    proteinGrams: 0,
    unknownCalorieItems: 0,
    unknownProteinItems: 0
  };
}

function compareSummaries(
  left: MutableDailyNutritionSummary,
  right: MutableDailyNutritionSummary
) {
  return (
    left.date.localeCompare(right.date) ||
    (left.mealProfileName ?? "").localeCompare(right.mealProfileName ?? "") ||
    left.mealProfileId.localeCompare(right.mealProfileId)
  );
}

function roundEstimate(value: number) {
  return Number(value.toFixed(1));
}
