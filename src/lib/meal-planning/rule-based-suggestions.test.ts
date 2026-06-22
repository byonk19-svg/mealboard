import { describe, expect, it } from "vitest";
import type { RecipeWithDetails } from "@/lib/recipes/types";
import type {
  WeeklyPlanItem,
  WeeklyPlanProfileDay
} from "@/lib/weekly-plans/types";
import {
  buildRuleBasedMealSuggestions,
  scoreRecipeForMealSlot
} from "./rule-based-suggestions";

describe("scoreRecipeForMealSlot", () => {
  it("blocks recipes that are not approved for the target profile", () => {
    const result = scoreRecipeForMealSlot({
      goals: [],
      profileId: "profile-brianna",
      recipe: recipe({
        approvals: [
          approval({
            approved_for_planning: false,
            meal_profile_id: "profile-brianna"
          })
        ]
      }),
      requestedMealType: "lunch"
    });

    if (result.eligible) {
      throw new Error("Expected recipe to be rejected.");
    }

    expect(result.rejectionReason).toBe("Recipe is not approved for this profile.");
  });

  it("blocks recipes with hard-no or allergy preference evaluations", () => {
    const result = scoreRecipeForMealSlot({
      goals: [],
      profileId: "profile-brianna",
      recipe: recipe({
        preferenceEvaluations: [
          {
            mealProfileId: "profile-brianna",
            mealProfileName: "Brianna",
            evaluation: {
              blocks: [
                {
                  foodId: "food-mushroom",
                  foodName: "Mushrooms",
                  preference: "hard_no"
                }
              ],
              status: "blocked",
              warnings: []
            }
          }
        ]
      }),
      requestedMealType: "lunch"
    });

    if (result.eligible) {
      throw new Error("Expected recipe to be rejected.");
    }

    expect(result.rejectionReason).toBe("Recipe conflicts with hard-no or allergy preferences.");
  });

  it("scores matching approved recipes with deterministic reason labels", () => {
    const result = scoreRecipeForMealSlot({
      adultDayType: "work_day",
      goals: ["high_protein", "low_prep_work_meals"],
      profileId: "profile-brianna",
      recipe: recipe({
        effort_level: "low",
        estimated_protein_grams_per_serving: 38,
        tags: [{ id: "tag-1", recipe_id: "recipe-1", tag: "work lunch" }]
      }),
      requestedMealType: "lunch"
    });

    expect(result).toMatchObject({
      eligible: true,
      reasonLabels: [
        "Approved for Brianna",
        "Fits lunch",
        "Work-day friendly",
        "High protein",
        "Low prep"
      ],
      score: 118
    });
  });

  it("allows warning recipes but scores them below clean matches", () => {
    const clean = scoreRecipeForMealSlot({
      goals: [],
      profileId: "profile-brianna",
      recipe: recipe({ id: "clean", name: "Clean" }),
      requestedMealType: "lunch"
    });
    const warning = scoreRecipeForMealSlot({
      goals: [],
      profileId: "profile-brianna",
      recipe: recipe({
        id: "warning",
        name: "Warning",
        preferenceEvaluations: [
          {
            mealProfileId: "profile-brianna",
            mealProfileName: "Brianna",
            evaluation: {
              blocks: [],
              status: "warning",
              warnings: [
                {
                  foodId: "food-onion",
                  foodName: "Onion",
                  preference: "dislike"
                }
              ]
            }
          }
        ]
      }),
      requestedMealType: "lunch"
    });

    expect(clean.eligible && warning.eligible && clean.score > warning.score).toBe(true);
    expect(warning.reasonLabels).toContain("Preference warning");
  });
});

describe("buildRuleBasedMealSuggestions", () => {
  it("creates draft suggestions only for open adult meal slots", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: ["high_protein"],
      planItems: [
        planItem({
          meal_profile_id: "profile-brianna",
          meal_type: "lunch",
          plan_date: "2026-06-22"
        })
      ],
      profileDays: [
        profileDay({
          adult_day_type: "work_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-22"
        }),
        profileDay({
          adult_day_type: "off_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-23"
        })
      ],
      profiles: [
        {
          id: "profile-brianna",
          name: "Brianna",
          profile_type: "adult"
        }
      ],
      recipes: [
        recipe({
          id: "protein",
          meal_type: "dinner",
          name: "Protein Bowl",
          estimated_protein_grams_per_serving: 42
        }),
        recipe({
          id: "alpha",
          meal_type: "dinner",
          name: "Alpha Salad",
          estimated_protein_grams_per_serving: 30
        })
      ],
      weekDateKeys: ["2026-06-22", "2026-06-23"]
    });

    expect(suggestions.map((suggestion) => ({
      date: suggestion.planDate,
      meal: suggestion.mealType,
      profile: suggestion.mealProfileId,
      recipe: suggestion.recipeId
    }))).toEqual([
      {
        date: "2026-06-22",
        meal: "dinner",
        profile: "profile-brianna",
        recipe: "protein"
      },
      {
        date: "2026-06-23",
        meal: "dinner",
        profile: "profile-brianna",
        recipe: "protein"
      }
    ]);
  });

  it("returns setup warnings when approved recipes are unavailable", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: [],
      planItems: [],
      profileDays: [],
      profiles: [
        {
          id: "profile-brianna",
          name: "Brianna",
          profile_type: "adult"
        }
      ],
      recipes: [
        recipe({
          approvals: [
            approval({
              approved_for_planning: false,
              meal_profile_id: "profile-brianna"
            })
          ]
        })
      ],
      weekDateKeys: ["2026-06-22"]
    });

    expect(suggestions).toEqual([]);
  });
});

function recipe(overrides: Partial<RecipeWithDetails> = {}): RecipeWithDetails {
  return {
    approvals: [approval()],
    cook_minutes: null,
    created_at: "2026-06-01T00:00:00.000Z",
    description: null,
    effort_level: null,
    estimated_calories_per_serving: 450,
    estimated_protein_grams_per_serving: 24,
    household_id: "household-1",
    id: "recipe-1",
    ingredients: [],
    instructions: null,
    meal_type: "lunch",
    name: "Turkey Wrap",
    notes: null,
    nutrition_confidence: "medium",
    preferenceEvaluations: [
      {
        mealProfileId: "profile-brianna",
        mealProfileName: "Brianna",
        evaluation: {
          blocks: [],
          status: "allowed",
          warnings: []
        }
      }
    ],
    prep_minutes: null,
    repeat_rule: null,
    servings: 1,
    status: "approved",
    tags: [],
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides
  };
}

function approval(
  overrides: Partial<RecipeWithDetails["approvals"][number]> = {}
): RecipeWithDetails["approvals"][number] {
  return {
    approved_for_planning: true,
    id: "approval-1",
    meal_profile_id: "profile-brianna",
    meal_profile_name: "Brianna",
    notes: null,
    rating: "like",
    recipe_id: "recipe-1",
    status: "approved",
    ...overrides
  };
}

function profileDay(
  overrides: Partial<WeeklyPlanProfileDay>
): WeeklyPlanProfileDay {
  return {
    adult_day_type: null,
    day_label: null,
    id: "profile-day-1",
    meal_profile_id: "profile-brianna",
    plan_date: "2026-06-22",
    weekly_plan_id: "weekly-plan-1",
    ...overrides
  };
}

function planItem(overrides: Partial<WeeklyPlanItem>): WeeklyPlanItem {
  return {
    component_type: "main",
    display_name: "Existing",
    estimated_calories: 400,
    estimated_protein_grams: 20,
    id: "plan-item-1",
    is_approved: false,
    is_backup: false,
    is_locked: false,
    is_try_this: false,
    meal_profile_id: "profile-brianna",
    meal_profile_name: "Brianna",
    meal_profile_type: "adult",
    meal_type: "lunch",
    notes: null,
    plan_date: "2026-06-22",
    reason_labels: [],
    recipe_id: "existing-recipe",
    recipe_name: "Existing",
    scale_factor: 1,
    sort_order: 0,
    weekly_plan_id: "weekly-plan-1",
    why_this: null,
    ...overrides
  };
}
