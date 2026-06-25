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

  it("does not corrupt valid JSON-LD that contains HTML entities in text", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Recipe",
              "name": "Banana &amp; Walnut Bread",
              "description": "Use the &quot;ripe&quot; bananas.",
              "recipeYield": ["8"],
              "recipeIngredient": ["2 cups mashed banana", "1&#xBD; cups flour"],
              "recipeInstructions": [
                {"@type": "HowToStep", "text": "Bake until golden &amp; set."}
              ]
            }
          ]
        }
      </script>
    `;

    expect(extractJsonLdRecipeCandidates(html)[0]).toMatchObject({
      name: "Banana & Walnut Bread",
      description: 'Use the "ripe" bananas.',
      servings: 8,
      ingredients: ["2 cups mashed banana", "1½ cups flour"],
      instructions: ["Bake until golden & set."]
    });
  });

  it("accepts unquoted JSON-LD script type attributes", () => {
    const html = `
      <script type=application/ld+json class=schema-graph>
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Banana Bread",
          "recipeIngredient": ["2 bananas"],
          "recipeInstructions": ["Bake."]
        }
      </script>
    `;

    expect(extractJsonLdRecipeCandidates(html)[0]?.name).toBe("Banana Bread");
  });

  it("leaves invalid numeric HTML entities untouched", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Entity Test",
          "recipeIngredient": ["1 pinch &#9999999999; salt"],
          "recipeInstructions": ["Stir."]
        }
      </script>
    `;

    expect(extractJsonLdRecipeCandidates(html)[0]?.ingredients).toEqual([
      "1 pinch &#9999999999; salt"
    ]);
  });

  it("formats sectioned HowTo instructions as readable method blocks", () => {
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
      "Prep:\nHeat the oven.\nCut the potatoes.",
      "Bake:\nRoast until tender."
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
