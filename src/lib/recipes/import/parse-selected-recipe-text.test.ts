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

  it("returns null for unstructured selected text", () => {
    expect(
      parseSelectedRecipeText(
        "This recipe was selected from the page, but without clear sections.",
        "Fallback Recipe"
      )
    ).toBeNull();
  });
});
