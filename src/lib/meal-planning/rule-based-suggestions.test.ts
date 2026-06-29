import { describe, expect, it } from "vitest";
import type { RecipeWithDetails } from "@/lib/recipes/types";
import type { PantryUseSoonSignal } from "@/lib/pantry/use-soon-signals";
import type {
  WeeklyPlanItem,
  WeeklyPlanProfileDay
} from "@/lib/weekly-plans/types";
import {
  buildRuleBasedMealSuggestions,
  buildRuleBasedSwapSuggestions,
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

  it("boosts recently loved recipes and labels the review signal", () => {
    const result = scoreRecipeForMealSlot({
      goals: [],
      profileId: "profile-brianna",
      recipe: recipe(),
      requestedMealType: "lunch",
      reviewSignal: {
        leftoverCount: 1,
        mealProfileId: "profile-brianna",
        rating: "love",
        recipeId: "recipe-1",
        skippedCount: 0
      }
    });

    expect(result).toMatchObject({
      eligible: true,
      reasonLabels: expect.arrayContaining(["Loved before", "Leftover-friendly"]),
      score: 94
    });
  });

  it("penalizes meals that recently had too much left over", () => {
    const result = scoreRecipeForMealSlot({
      goals: [],
      profileId: "profile-brianna",
      recipe: recipe(),
      requestedMealType: "lunch",
      reviewSignal: {
        leftoverCount: 0,
        mealProfileId: "profile-brianna",
        rating: "like",
        recipeId: "recipe-1",
        skippedCount: 0,
        tooMuchCount: 2
      }
    });

    expect(result).toMatchObject({
      eligible: true,
      reasonLabels: expect.arrayContaining([
        "Liked before",
        "Too much last time"
      ]),
      score: 73
    });
  });

  it("boosts matching pantry use-soon food ids with an explainable label", () => {
    const result = scoreRecipeForMealSlot({
      goals: [],
      pantryUseSoonSignals: [pantryUseSoonSignal({ foodId: "food-tortillas" })],
      planDate: "2026-06-29",
      profileId: "profile-brianna",
      recipe: recipe({
        ingredients: [
          recipeIngredient({
            display_name: "Tortillas",
            food_id: "food-tortillas"
          })
        ]
      }),
      requestedMealType: "lunch"
    });

    expect(result).toMatchObject({
      eligible: true,
      reasonLabels: expect.arrayContaining(["Uses pantry soon"]),
      score: 92
    });
  });

  it("does not match pantry signals by ingredient display name", () => {
    const result = scoreRecipeForMealSlot({
      goals: [],
      pantryUseSoonSignals: [
        pantryUseSoonSignal({
          foodId: "food-pantry-tortillas",
          foodName: "Tortillas"
        })
      ],
      planDate: "2026-06-29",
      profileId: "profile-brianna",
      recipe: recipe({
        ingredients: [
          recipeIngredient({
            display_name: "Tortillas",
            food_id: "food-recipe-tortillas",
            food_name: "Tortillas"
          })
        ]
      }),
      requestedMealType: "lunch"
    });

    expect(result).toMatchObject({
      eligible: true,
      reasonLabels: expect.not.arrayContaining(["Uses pantry soon"]),
      score: 80
    });
  });

  it("does not let pantry use-soon signals bypass blockers", () => {
    const pantryUseSoonSignals = [pantryUseSoonSignal({ foodId: "food-tortillas" })];
    const matchingIngredient = recipeIngredient({ food_id: "food-tortillas" });

    for (const blockedRecipe of [
      recipe({
        ingredients: [matchingIngredient],
        status: "retired"
      }),
      recipe({
        approvals: [
          approval({
            approved_for_planning: false,
            meal_profile_id: "profile-brianna"
          })
        ],
        ingredients: [matchingIngredient]
      }),
      recipe({
        ingredients: [matchingIngredient],
        meal_type: "dinner"
      }),
      recipe({
        ingredients: [matchingIngredient],
        preferenceEvaluations: [
          {
            mealProfileId: "profile-brianna",
            mealProfileName: "Brianna",
            evaluation: {
              blocks: [
                {
                  foodId: "food-tortillas",
                  foodName: "Tortillas",
                  preference: "hard_no"
                }
              ],
              status: "blocked",
              warnings: []
            }
          }
        ]
      })
    ]) {
      const result = scoreRecipeForMealSlot({
        goals: [],
        pantryUseSoonSignals,
        planDate: "2026-06-29",
        profileId: "profile-brianna",
        recipe: blockedRecipe,
        requestedMealType: "lunch"
      });

      expect(result.eligible).toBe(false);
      expect(result.reasonLabels).not.toContain("Uses pantry soon");
    }
  });

  it("does not boost pantry use-soon recipes after the signal use-by date", () => {
    const result = scoreRecipeForMealSlot({
      goals: [],
      pantryUseSoonSignals: [
        pantryUseSoonSignal({
          foodId: "food-tortillas",
          useByDate: "2026-06-30"
        })
      ],
      planDate: "2026-07-07",
      profileId: "profile-brianna",
      recipe: recipe({
        ingredients: [recipeIngredient({ food_id: "food-tortillas" })]
      }),
      requestedMealType: "lunch"
    });

    expect(result).toMatchObject({
      eligible: true,
      reasonLabels: expect.not.arrayContaining(["Uses pantry soon"]),
      score: 80
    });
  });
});

describe("buildRuleBasedSwapSuggestions", () => {
  it("returns ranked alternatives for the selected unlocked adult item", () => {
    const target = planItem({
      id: "target",
      recipe_id: "current-recipe"
    });
    const suggestions = buildRuleBasedSwapSuggestions({
      goals: ["high_protein"],
      planItems: [target],
      profileDays: [
        profileDay({
          adult_day_type: "work_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-22"
        })
      ],
      recipes: [
        recipe({ id: "current-recipe", name: "Current Wrap" }),
        recipe({
          id: "protein",
          name: "Protein Bowl",
          estimated_protein_grams_per_serving: 40
        }),
        recipe({
          id: "alpha",
          name: "Alpha Wrap",
          estimated_protein_grams_per_serving: 25
        })
      ],
      targetItem: target
    });

    expect(suggestions.map((suggestion) => suggestion.recipeId)).toEqual([
      "protein",
      "alpha"
    ]);
    expect(suggestions[0]?.reasonLabels).toContain("High protein");
  });

  it("uses pantry use-soon signals when ranking swaps", () => {
    const target = planItem({
      id: "target",
      recipe_id: "current-recipe"
    });
    const suggestions = buildRuleBasedSwapSuggestions({
      goals: [],
      pantryUseSoonSignals: [pantryUseSoonSignal({ foodId: "food-beans" })],
      planItems: [target],
      profileDays: [],
      recipes: [
        recipe({ id: "current-recipe", name: "Current Wrap" }),
        recipe({
          id: "alpha",
          ingredients: [recipeIngredient({ food_id: "food-other" })],
          name: "Alpha Wrap"
        }),
        recipe({
          id: "beans",
          ingredients: [recipeIngredient({ food_id: "food-beans" })],
          name: "Bean Wrap"
        })
      ],
      targetItem: target
    });

    expect(suggestions.map((suggestion) => suggestion.recipeId)).toEqual([
      "beans",
      "alpha"
    ]);
    expect(suggestions[0]?.reasonLabels).toContain("Uses pantry soon");
    expect(suggestions[0]?.whyThis).toContain("Uses pantry soon");
  });

  it("returns no suggestions for locked, try-this, baby, or recipe-less items", () => {
    const recipes = [recipe({ id: "alternative" })];

    for (const targetItem of [
      planItem({ is_locked: true }),
      planItem({ is_try_this: true }),
      planItem({ meal_profile_type: "baby" }),
      planItem({ recipe_id: null })
    ]) {
      expect(
        buildRuleBasedSwapSuggestions({
          goals: [],
          planItems: [targetItem],
          profileDays: [],
          recipes,
          targetItem
        })
      ).toEqual([]);
    }
  });

  it("excludes the current recipe and sibling duplicate recipes for the same slot", () => {
    const target = planItem({
      id: "target",
      recipe_id: "current-recipe"
    });
    const suggestions = buildRuleBasedSwapSuggestions({
      goals: [],
      planItems: [
        target,
        planItem({
          id: "sibling",
          recipe_id: "sibling-recipe"
        })
      ],
      profileDays: [],
      recipes: [
        recipe({ id: "current-recipe", name: "Current" }),
        recipe({ id: "sibling-recipe", name: "Sibling" }),
        recipe({ id: "other-recipe", name: "Other" })
      ],
      targetItem: target
    });

    expect(suggestions.map((suggestion) => suggestion.recipeId)).toEqual([
      "other-recipe"
    ]);
  });
});

describe("buildRuleBasedMealSuggestions", () => {
  it("creates draft suggestions only for open adult meal slots without repeating a non-weekly favorite", () => {
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
          estimated_protein_grams_per_serving: 42,
          repeat_rule: "monthly"
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
        recipe: "alpha"
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

  it("ranks skipped or disliked review signals below clean alternatives", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: [],
      planItems: [],
      profileDays: [
        profileDay({
          adult_day_type: "off_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-22"
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
        recipe({ id: "alpha", meal_type: "dinner", name: "Alpha Dinner" }),
        recipe({ id: "beta", meal_type: "dinner", name: "Beta Dinner" })
      ],
      reviewSignals: [
        {
          leftoverCount: 0,
          mealProfileId: "profile-brianna",
          rating: "dislike",
          recipeId: "alpha",
          skippedCount: 1
        }
      ],
      weekDateKeys: ["2026-06-22"]
    });

    expect(suggestions[0]?.recipeId).toBe("beta");
    expect(suggestions[0]?.reasonLabels).not.toContain("Skipped recently");
  });

  it("does not pick the same non-weekly recipe repeatedly in the same week when a clean alternative is available", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: [],
      planItems: [
        planItem({
          meal_profile_id: "profile-brianna",
          meal_type: "dinner",
          plan_date: "2026-06-21",
          recipe_id: "monthly-recipe"
        })
      ],
      profileDays: [
        profileDay({
          adult_day_type: "off_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-22"
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
          id: "monthly-recipe",
          meal_type: "dinner",
          name: "Monthly Dinner",
          repeat_rule: "monthly"
        }),
        recipe({ id: "clean-recipe", meal_type: "dinner", name: "Clean Dinner" })
      ],
      weekDateKeys: ["2026-06-22"]
    });

    expect(suggestions[0]?.recipeId).toBe("clean-recipe");
  });

  it("ranks matching pantry use-soon recipes above otherwise equal alternatives", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: [],
      pantryUseSoonSignals: [
        pantryUseSoonSignal({
          foodId: "food-beans",
          useByDate: "2026-06-23"
        })
      ],
      planItems: [],
      profileDays: [
        profileDay({
          adult_day_type: "off_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-22"
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
          id: "alpha",
          ingredients: [recipeIngredient({ food_id: "food-other" })],
          meal_type: "dinner",
          name: "Alpha Dinner"
        }),
        recipe({
          id: "beans",
          ingredients: [recipeIngredient({ food_id: "food-beans" })],
          meal_type: "dinner",
          name: "Bean Dinner"
        })
      ],
      weekDateKeys: ["2026-06-22"]
    });

    expect(suggestions[0]).toMatchObject({
      reasonLabels: expect.arrayContaining(["Uses pantry soon"]),
      recipeId: "beans",
      score: 92
    });
  });

  it("does not rank pantry use-soon recipes above ties for later plan dates", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: [],
      pantryUseSoonSignals: [
        pantryUseSoonSignal({
          foodId: "food-beans",
          useByDate: "2026-06-30"
        })
      ],
      planItems: [],
      profileDays: [
        profileDay({
          adult_day_type: "off_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-07-07"
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
          id: "alpha",
          ingredients: [recipeIngredient({ food_id: "food-other" })],
          meal_type: "dinner",
          name: "Alpha Dinner"
        }),
        recipe({
          id: "beans",
          ingredients: [recipeIngredient({ food_id: "food-beans" })],
          meal_type: "dinner",
          name: "Bean Dinner"
        })
      ],
      weekDateKeys: ["2026-07-07"]
    });

    expect(suggestions[0]?.recipeId).toBe("alpha");
    expect(suggestions[0]?.reasonLabels).not.toContain("Uses pantry soon");
  });

  it("keeps stable recipe ordering when pantry signals are absent", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: [],
      planItems: [],
      profileDays: [
        profileDay({
          adult_day_type: "off_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-22"
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
          id: "zeta",
          meal_type: "dinner",
          name: "Zeta Dinner"
        }),
        recipe({
          id: "alpha",
          meal_type: "dinner",
          name: "Alpha Dinner"
        })
      ],
      weekDateKeys: ["2026-06-22"]
    });

    expect(suggestions[0]?.recipeId).toBe("alpha");
    expect(suggestions[0]?.reasonLabels).not.toContain("Uses pantry soon");
  });

  it("keeps stable tie ordering when pantry signals boost multiple recipes", () => {
    const suggestions = buildRuleBasedMealSuggestions({
      goals: [],
      pantryUseSoonSignals: [pantryUseSoonSignal({ foodId: "food-beans" })],
      planItems: [],
      profileDays: [
        profileDay({
          adult_day_type: "off_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-06-22"
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
          id: "zeta",
          ingredients: [recipeIngredient({ food_id: "food-beans" })],
          meal_type: "dinner",
          name: "Zeta Dinner"
        }),
        recipe({
          id: "alpha",
          ingredients: [recipeIngredient({ food_id: "food-beans" })],
          meal_type: "dinner",
          name: "Alpha Dinner"
        })
      ],
      weekDateKeys: ["2026-06-22"]
    });

    expect(suggestions[0]?.recipeId).toBe("alpha");
    expect(suggestions[0]?.reasonLabels).toContain("Uses pantry soon");
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
    source_title: null,
    source_url: null,
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

function recipeIngredient(
  overrides: Partial<RecipeWithDetails["ingredients"][number]> = {}
): RecipeWithDetails["ingredients"][number] {
  return {
    display_name: "Tortillas",
    food_id: "food-tortillas",
    food_name: "Tortillas",
    grocery_category_id: null,
    grocery_category_name: null,
    household_id: "household-1",
    id: "ingredient-1",
    notes: null,
    optional: false,
    preparation: null,
    quantity: null,
    recipe_id: "recipe-1",
    sort_order: 0,
    unit: null,
    ...overrides
  };
}

function pantryUseSoonSignal(
  overrides: Partial<PantryUseSoonSignal> = {}
): PantryUseSoonSignal {
  return {
    daysUntilExpiration: 1,
    expirationStatus: "expiring_soon",
    foodId: "food-tortillas",
    foodName: "Tortillas",
    groceryCategoryId: null,
    groceryCategoryName: null,
    itemDisplayNames: ["Tortillas"],
    lotCount: 1,
    mealProfileContexts: [
      {
        mealProfileId: null,
        mealProfileName: null
      }
    ],
    pantryItemIds: ["pantry-item-1"],
    reasonLabels: ["Use soon"],
    urgency: "soon",
    useByDate: "2026-06-30",
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
    baby_plan_slot: null,
    component_type: "main",
    display_name: "Existing",
    estimated_calories: 400,
    estimated_protein_grams: 20,
    id: "plan-item-1",
    is_approved: false,
    is_backup: false,
    is_locked: false,
    is_try_this: false,
    food_id: null,
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
