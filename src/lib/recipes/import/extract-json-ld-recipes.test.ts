import { describe, expect, it } from "vitest";
import { extractJsonLdRecipeCandidates } from "./extract-json-ld-recipes";

describe("extractJsonLdRecipeCandidates", () => {
  it("extracts a complete single Recipe with durations and explicit nutrition", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Skillet Rice Bowls",
          "description": "Weeknight rice bowls.",
          "recipeYield": "4 servings",
          "prepTime": "PT15M",
          "cookTime": "PT25M",
          "recipeIngredient": [
            "1 cup rice",
            "2 cups chicken broth",
            "1 lb chicken breast, diced"
          ],
          "recipeInstructions": [
            {"@type": "HowToStep", "text": "Cook the rice."},
            {"@type": "HowToStep", "name": "Finish", "text": "Top with chicken."}
          ],
          "nutrition": {
            "@type": "NutritionInformation",
            "calories": "520 calories",
            "proteinContent": "38 g"
          }
        }
      </script>
    `;

    expect(extractJsonLdRecipeCandidates(html)).toEqual([
      {
        name: "Skillet Rice Bowls",
        description: "Weeknight rice bowls.",
        servings: 4,
        prepMinutes: 15,
        cookMinutes: 25,
        ingredients: [
          "1 cup rice",
          "2 cups chicken broth",
          "1 lb chicken breast, diced"
        ],
        instructions: ["Cook the rice.", "Top with chicken."],
        caloriesPerServing: 520,
        proteinGramsPerServing: 38,
        extractionWarnings: []
      }
    ]);
  });

  it("returns no candidates when JSON-LD is malformed", () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Recipe","name":"Broken"
      </script>
    `;

    expect(extractJsonLdRecipeCandidates(html)).toEqual([]);
  });

  it("flattens sectioned HowTo instructions in source order", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@graph": [
            {
              "@type": "Recipe",
              "name": "Sheet Pan Dinner",
              "recipeIngredient": ["1 lb potatoes"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "Prep",
                  "itemListElement": [
                    {"@type": "HowToStep", "text": "Heat the oven."},
                    {"@type": "HowToStep", "text": "Cut the potatoes."}
                  ]
                },
                {
                  "@type": "HowToSection",
                  "name": "Bake",
                  "itemListElement": [
                    {"@type": "HowToStep", "name": "Roast until tender."}
                  ]
                }
              ]
            }
          ]
        }
      </script>
    `;

    expect(extractJsonLdRecipeCandidates(html)[0]?.instructions).toEqual([
      "Prep",
      "Heat the oven.",
      "Cut the potatoes.",
      "Bake",
      "Roast until tender."
    ]);
  });

  it("ranks multiple candidates deterministically by completeness and document order", () => {
    const html = `
      <script type="application/ld+json">
        [
          {
            "@type": "Recipe",
            "name": "Ingredients Only",
            "recipeIngredient": ["1 cup beans"]
          },
          {
            "@type": "Recipe",
            "name": "Complete Candidate",
            "recipeIngredient": ["1 cup beans"],
            "recipeInstructions": ["Simmer beans."]
          },
          {
            "@type": "Recipe",
            "name": "Also Complete",
            "recipeIngredient": ["1 cup lentils"],
            "recipeInstructions": ["Simmer lentils."]
          }
        ]
      </script>
    `;

    expect(
      extractJsonLdRecipeCandidates(html).map((candidate) => candidate.name)
    ).toEqual(["Complete Candidate", "Also Complete", "Ingredients Only"]);
  });
});
