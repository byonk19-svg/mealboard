import { describe, expect, it } from "vitest";
import { filterRecipes, type RecipeFilters } from "./filter-recipes";
import type { RecipeWithDetails } from "./types";

describe("filterRecipes", () => {
  it("matches query text against recipe names and tags", () => {
    expect(
      filterRecipes([recipe({ name: "Turkey Wrap", tags: ["lunchbox"] })], {
        q: "lunch"
      }).map((item) => item.name)
    ).toEqual(["Turkey Wrap"]);
  });

  it("filters by recipe status", () => {
    const filters: RecipeFilters = { status: "favorite" };

    expect(
      filterRecipes(
        [
          recipe({ name: "Favorite", status: "favorite" }),
          recipe({ name: "Idea", status: "idea" })
        ],
        filters
      ).map((item) => item.name)
    ).toEqual(["Favorite"]);
  });

  it("filters to recipes approved for planning", () => {
    expect(
      filterRecipes(
        [
          recipe({ approvedForPlanning: true, name: "Approved" }),
          recipe({ approvedForPlanning: false, name: "Not Approved" })
        ],
        { planning: "approved" }
      ).map((item) => item.name)
    ).toEqual(["Approved"]);
  });

  it("filters to recipes missing nutrition fields or confidence", () => {
    expect(
      filterRecipes(
        [
          recipe({ name: "Missing Calories", calories: null }),
          recipe({ name: "Low Confidence", nutritionConfidence: "low" }),
          recipe({ name: "Complete" })
        ],
        { nutrition: "needs_review" }
      ).map((item) => item.name)
    ).toEqual(["Missing Calories", "Low Confidence"]);
  });

  it("combines filters deterministically", () => {
    expect(
      filterRecipes(
        [
          recipe({
            approvedForPlanning: true,
            name: "Chicken Bowl",
            status: "approved",
            tags: ["work"]
          }),
          recipe({
            approvedForPlanning: true,
            name: "Chicken Soup",
            status: "idea",
            tags: ["work"]
          })
        ],
        { planning: "approved", q: "work", status: "approved" }
      ).map((item) => item.name)
    ).toEqual(["Chicken Bowl"]);
  });
});

function recipe({
  approvedForPlanning = false,
  calories = 400,
  name,
  nutritionConfidence = "medium",
  status = "approved",
  tags = []
}: {
  approvedForPlanning?: boolean;
  calories?: number | null;
  name: string;
  nutritionConfidence?: RecipeWithDetails["nutrition_confidence"];
  status?: RecipeWithDetails["status"];
  tags?: string[];
}): RecipeWithDetails {
  return {
    approvals: approvedForPlanning
      ? [
          {
            approved_for_planning: true,
            id: `${name}-approval`,
            meal_profile_id: "profile-1",
            meal_profile_name: "Brianna",
            notes: null,
            rating: null,
            recipe_id: `${name}-id`,
            status: "approved"
          }
        ]
      : [],
    cook_minutes: null,
    created_at: "2026-06-22T00:00:00Z",
    description: null,
    estimated_calories_per_serving: calories,
    estimated_protein_grams_per_serving: 25,
    evaluations: [],
    effort_level: null,
    household_id: "household-1",
    id: `${name}-id`,
    ingredients: [],
    instructions: null,
    meal_type: "lunch",
    name,
    notes: null,
    nutrition_confidence: nutritionConfidence,
    preferenceEvaluations: [],
    prep_minutes: null,
    repeat_rule: null,
    servings: 1,
    status,
    tags: tags.map((tag) => ({
      id: `${name}-${tag}`,
      recipe_id: `${name}-id`,
      tag
    })),
    updated_at: "2026-06-22T00:00:00Z"
  } as RecipeWithDetails;
}
