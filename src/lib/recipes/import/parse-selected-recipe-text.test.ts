import { describe, expect, it } from "vitest";
import { parseSelectedRecipeText } from "./parse-selected-recipe-text";

describe("parseSelectedRecipeText", () => {
  it("splits selected recipe sections into a raw recipe candidate", () => {
    expect(
      parseSelectedRecipeText(
        `Skillet Beans
Servings: 4
Prep Time: 10 minutes
Cook Time: 25 minutes
Ingredients
- 1 cup beans
- 2 tbsp olive oil
Instructions
1. Warm the oil.
2. Simmer the beans.`,
        "Fallback Title"
      )
    ).toMatchObject({
      cookMinutes: 25,
      ingredients: ["1 cup beans", "2 tbsp olive oil"],
      instructions: ["Warm the oil.", "Simmer the beans."],
      name: "Skillet Beans",
      prepMinutes: 10,
      servings: 4
    });
  });

  it("extracts calories and protein from selected nutrition text", () => {
    expect(
      parseSelectedRecipeText(
        `Skillet Beans
Ingredients
- 1 cup beans
Instructions
Simmer the beans.
Nutrition
Calories: 320 kcal
Protein: 18g`,
        "Fallback Title"
      )
    ).toMatchObject({
      caloriesPerServing: 320,
      instructions: ["Simmer the beans."],
      proteinGramsPerServing: 18
    });
  });

  it("handles inline ingredient and instruction labels from short selections", () => {
    expect(
      parseSelectedRecipeText(
        "Ingredients: 1 cup beans. Instructions: Simmer until warm.",
        "Fallback Recipe"
      )
    ).toMatchObject({
      ingredients: ["1 cup beans"],
      instructions: ["Simmer until warm."],
      name: "Fallback Recipe"
    });
  });

  it("recognizes preparation and steps headings as instructions", () => {
    expect(
      parseSelectedRecipeText(
        `Fixture Pancakes
Ingredients
1 cup flour
Preparation
Whisk the batter.
Cook until golden.`,
        "Fallback Recipe"
      )
    ).toMatchObject({
      ingredients: ["1 cup flour"],
      instructions: ["Whisk the batter.", "Cook until golden."],
      name: "Fixture Pancakes"
    });

    expect(
      parseSelectedRecipeText(
        `Ingredients
1 cup flour
Steps
1. Whisk the batter.
2. Cook until golden.`,
        "Fallback Recipe"
      )
    ).toMatchObject({
      ingredients: ["1 cup flour"],
      instructions: ["Whisk the batter.", "Cook until golden."]
    });
  });

  it("drops common page chrome from selected recipe text", () => {
    expect(
      parseSelectedRecipeText(
        `Jump to Recipe
5 from 12 votes
Fixture Chili
Subscribe for weekly recipes
Ingredients
1 lb ground beef
Advertisement
Directions
Brown the beef.
Simmer for 20 minutes.
Leave a Comment`,
        "Fallback Recipe"
      )
    ).toMatchObject({
      ingredients: ["1 lb ground beef"],
      instructions: ["Brown the beef.", "Simmer for 20 minutes."],
      name: "Fixture Chili"
    });
  });

  it("returns null for unstructured selected text", () => {
    expect(
      parseSelectedRecipeText(
        "This recipe was selected from the page, but without clear sections.",
        "Fallback Recipe"
      )
    ).toBeNull();
  });
});
