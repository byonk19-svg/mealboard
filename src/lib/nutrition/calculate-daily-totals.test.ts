import { describe, expect, it } from "vitest";
import { calculateDailyNutritionTotals } from "./calculate-daily-totals";
import type { WeeklyPlanItem } from "@/lib/weekly-plans/types";

describe("calculateDailyNutritionTotals", () => {
  it("summarizes calories and protein by assigned profile and day", () => {
    const summaries = calculateDailyNutritionTotals([
      planItem({
        estimated_calories: 420,
        estimated_protein_grams: 35,
        meal_profile_id: "profile-brianna",
        meal_profile_name: "Brianna",
        meal_type: "lunch",
        plan_date: "2026-05-24"
      }),
      planItem({
        estimated_calories: 160,
        estimated_protein_grams: 8,
        meal_profile_id: "profile-brianna",
        meal_profile_name: "Brianna",
        meal_type: "snack",
        plan_date: "2026-05-24"
      }),
      planItem({
        estimated_calories: 510,
        estimated_protein_grams: 28,
        meal_profile_id: "profile-elaine",
        meal_profile_name: "Elaine",
        meal_type: "dinner",
        plan_date: "2026-05-24"
      })
    ]);

    expect(summaries).toEqual([
      {
        calories: 580,
        date: "2026-05-24",
        itemCount: 2,
        knownCalorieItems: 2,
        knownProteinItems: 2,
        mealProfileId: "profile-brianna",
        mealProfileName: "Brianna",
        proteinGrams: 43,
        unknownCalorieItems: 0,
        unknownProteinItems: 0
      },
      {
        calories: 510,
        date: "2026-05-24",
        itemCount: 1,
        knownCalorieItems: 1,
        knownProteinItems: 1,
        mealProfileId: "profile-elaine",
        mealProfileName: "Elaine",
        proteinGrams: 28,
        unknownCalorieItems: 0,
        unknownProteinItems: 0
      }
    ]);
  });

  it("keeps missing estimates unknown instead of treating them as zero", () => {
    const [summary] = calculateDailyNutritionTotals([
      planItem({
        estimated_calories: null,
        estimated_protein_grams: 20,
        meal_profile_id: "profile-brianna",
        plan_date: "2026-05-24"
      }),
      planItem({
        estimated_calories: 300,
        estimated_protein_grams: null,
        meal_profile_id: "profile-brianna",
        plan_date: "2026-05-24"
      })
    ]);

    expect(summary).toMatchObject({
      calories: 300,
      knownCalorieItems: 1,
      knownProteinItems: 1,
      proteinGrams: 20,
      unknownCalorieItems: 1,
      unknownProteinItems: 1
    });
  });

  it("applies weekly plan item scale factors to known estimates", () => {
    const [summary] = calculateDailyNutritionTotals([
      planItem({
        estimated_calories: 200,
        estimated_protein_grams: 10,
        meal_profile_id: "profile-brianna",
        plan_date: "2026-05-24",
        scale_factor: 1.5
      })
    ]);

    expect(summary).toMatchObject({
      calories: 300,
      knownCalorieItems: 1,
      knownProteinItems: 1,
      proteinGrams: 15
    });
  });

  it("returns null totals when every item is missing that estimate", () => {
    const [summary] = calculateDailyNutritionTotals([
      planItem({
        estimated_calories: null,
        estimated_protein_grams: null,
        meal_profile_id: "profile-brianna",
        plan_date: "2026-05-24"
      })
    ]);

    expect(summary).toMatchObject({
      calories: null,
      knownCalorieItems: 0,
      knownProteinItems: 0,
      proteinGrams: null,
      unknownCalorieItems: 1,
      unknownProteinItems: 1
    });
  });

  it("ignores unassigned household rows because nutrition is profile/day based", () => {
    const summaries = calculateDailyNutritionTotals([
      planItem({
        estimated_calories: 100,
        estimated_protein_grams: 5,
        meal_profile_id: null,
        meal_profile_name: null,
        plan_date: "2026-05-24"
      }),
      planItem({
        estimated_calories: 250,
        estimated_protein_grams: 12,
        meal_profile_id: "profile-brianna",
        plan_date: "2026-05-24"
      })
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      calories: 250,
      mealProfileId: "profile-brianna",
      proteinGrams: 12
    });
  });
});

function planItem(overrides: Partial<WeeklyPlanItem>): WeeklyPlanItem {
  return {
    component_type: "main",
    display_name: "Planned item",
    estimated_calories: 100,
    estimated_protein_grams: 10,
    id: `item-${Math.random()}`,
    is_approved: false,
    is_backup: false,
    is_locked: false,
    is_try_this: false,
    meal_profile_id: "profile-brianna",
    meal_profile_name: "Brianna",
    meal_profile_type: "adult",
    meal_type: "dinner",
    notes: null,
    plan_date: "2026-05-24",
    reason_labels: [],
    recipe_id: "recipe-1",
    recipe_name: "Recipe",
    scale_factor: 1,
    sort_order: 0,
    weekly_plan_id: "week-1",
    ...overrides
  };
}
