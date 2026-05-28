import { describe, expect, it } from "vitest";
import { evaluateRecipeForProfile } from "./evaluate-recipe-for-profile";

const baseIngredient = {
  foodId: "food-1",
  displayName: "Eggs"
};

describe("evaluateRecipeForProfile", () => {
  it("allows recipes when ingredients have no blocking preferences", () => {
    const result = evaluateRecipeForProfile({
      ingredients: [baseIngredient],
      preferences: [
        {
          foodId: "food-1",
          foodName: "Eggs",
          preference: "like"
        }
      ]
    });

    expect(result.status).toBe("allowed");
    expect(result.blocks).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("warns for disliked ingredients without blocking the recipe", () => {
    const result = evaluateRecipeForProfile({
      ingredients: [baseIngredient],
      preferences: [
        {
          foodId: "food-1",
          foodName: "Eggs",
          preference: "dislike",
          notes: "Only okay in breakfast burritos."
        }
      ]
    });

    expect(result.status).toBe("warning");
    expect(result.blocks).toEqual([]);
    expect(result.warnings).toEqual([
      {
        foodId: "food-1",
        foodName: "Eggs",
        preference: "dislike",
        notes: "Only okay in breakfast burritos."
      }
    ]);
  });

  it("blocks recipes with hard-no ingredients", () => {
    const result = evaluateRecipeForProfile({
      ingredients: [baseIngredient],
      preferences: [
        {
          foodId: "food-1",
          foodName: "Eggs",
          preference: "hard_no"
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.blocks).toEqual([
      {
        foodId: "food-1",
        foodName: "Eggs",
        preference: "hard_no"
      }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("blocks recipes with allergy ingredients", () => {
    const result = evaluateRecipeForProfile({
      ingredients: [baseIngredient],
      preferences: [
        {
          foodId: "food-1",
          foodName: "Eggs",
          preference: "allergy"
        }
      ]
    });

    expect(result.status).toBe("blocked");
    expect(result.blocks).toEqual([
      {
        foodId: "food-1",
        foodName: "Eggs",
        preference: "allergy"
      }
    ]);
  });
});
