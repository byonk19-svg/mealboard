import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;
const fixturesDir = resolve(process.cwd(), "e2e", "fixtures");
const completeRecipeFixture = readFixture("recipe-jsonld-complete.html");
const sectionedRecipeFixture = readFixture("recipe-jsonld-sectioned.html");
const malformedRecipeFixture = readFixture("recipe-jsonld-malformed.html");

test.describe("Recipe import fixtures", () => {
  test("keeps synthetic JSON-LD fixture pages available for import coverage", () => {
    expect(completeRecipeFixture).toContain('"@type": "Recipe"');
    expect(completeRecipeFixture).toContain("Synthetic Citrus Grain Bowl");
    expect(completeRecipeFixture).toContain("salt to taste");
    expect(sectionedRecipeFixture).toContain('"@graph"');
    expect(sectionedRecipeFixture).toContain('"@type": "HowToSection"');
    expect(malformedRecipeFixture).toContain("intentionally invalid JSON-LD");
  });
});

test.describe("Recipe import and filters", () => {
  test.setTimeout(90_000);

  test.skip(
    !email || !password,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("pastes ingredients, creates a recipe, and filters the library", async ({
    page
  }) => {
    const suffix = Date.now().toString();
    const recipeName = `E2E Import Bowl ${suffix}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      /\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/
    );

    await page.goto("/recipes/new");
    await page.getByLabel("Recipe name").fill(recipeName);
    await page.getByLabel("Recipe servings").fill("1");
    await page.getByLabel("Estimated recipe calories per serving").fill("450");
    await page.getByLabel("Estimated recipe protein grams per serving").fill("28");
    await page
      .getByLabel("Paste ingredients")
      .fill(`1 cup E2E Rice ${suffix}\nsalt to taste`);
    await page.getByRole("button", { name: "Parse ingredients" }).click();

    await expect(page.getByLabel("Ingredient 1 display name")).toHaveValue(
      new RegExp(`E2E Rice ${suffix}`, "i")
    );
    await expect(page.getByLabel("Ingredient 2 display name")).toHaveValue(
      /salt/i
    );
    const secondIngredient = page
      .getByLabel("Ingredient 2 display name")
      .locator("xpath=ancestor::div[contains(@class, 'rounded-md')][1]");
    await secondIngredient
      .getByRole("button", { name: "Merge with previous" })
      .click();
    await expect(page.getByLabel("Ingredient 1 display name")).toHaveValue(
      /salt/i
    );
    await page.getByRole("button", { name: "Split" }).first().click();
    await page.getByLabel("Ingredient 2 display name").fill(`E2E Pepper ${suffix}`);
    await page.getByLabel("Ingredient 2 quantity").fill("1");
    await page.getByLabel("Ingredient 2 unit").fill("pinch");
    for (const checkbox of await page
      .getByRole("checkbox", { name: "I reviewed this row" })
      .all()) {
      await checkbox.check();
    }
    await page
      .getByText("Approved for planning")
      .locator("..")
      .getByRole("checkbox")
      .first()
      .check();
    await page.getByRole("button", { name: "Create recipe" }).click();
    await page.waitForURL(/\/recipes\/[^/?]+\?message=/, { timeout: 30_000 });
    await expect(page.getByText("Recipe created.")).toBeVisible();

    await page.goto("/recipes");
    await page.getByLabel("Search recipes").fill(recipeName);
    await page
      .getByRole("button", { name: "Apply filters" })
      .click();
    await expect(page.getByRole("heading", { name: recipeName })).toBeVisible();
    await page.getByLabel("Planning").selectOption("approved");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByRole("heading", { name: recipeName })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" }).first()).toBeVisible();
  });

  test("imports a synthetic JSON-LD draft through review, correction, save, and source attribution", async ({
    page
  }, testInfo) => {
    const suffix = Date.now().toString();
    const draftKey = `mealboard-recipe-import-e2e-${suffix}`;
    const importedRecipeName = `E2E Synthetic Citrus Bowl ${suffix}`;
    const draft = buildSyntheticImportDraft({
      recipeName: importedRecipeName,
      sourceUrl: buildFixtureSourceUrl(testInfo)
    });

    await signIn(page);

    const importResponse = await page.goto("/recipes/import");
    test.skip(
      importResponse?.status() === 404,
      "/recipes/import is not implemented yet; keep this smoke ready for the app-route lane."
    );

    await expect(page.getByRole("heading", { name: "Import recipe" })).toBeVisible();
    await expect(page.getByLabel("Recipe URL")).toBeVisible();
    await page.getByLabel("Recipe URL").fill(draft.sourceUrl);
    await expect(
      page.getByRole("button", { name: "Load recipe for review" })
    ).toBeVisible();

    await page.evaluate(
      ({ key, value }) => {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      },
      { key: draftKey, value: draft }
    );

    const reviewResponse = await page.goto(
      `/recipes/import/review?source=e2e&draft=${encodeURIComponent(draftKey)}`
    );
    test.skip(
      reviewResponse?.status() === 404,
      "/recipes/import/review is not implemented yet; keep this smoke ready for the app-route lane."
    );

    await expect(
      page.getByRole("heading", { name: "Review imported recipe" })
    ).toBeVisible();
    await expect(page.getByLabel("Recipe name")).toHaveValue(importedRecipeName);
    await expect(page.getByLabel("Recipe servings")).toHaveValue("2");
    await expect(page.getByLabel("Prep minutes")).toHaveValue("15");
    await expect(page.getByLabel("Cook minutes")).toHaveValue("20");
    await expect(page.getByLabel("Instructions")).toHaveValue(
      /Warm the farro and chickpeas/
    );
    await expect(
      page.getByLabel("Estimated recipe calories per serving")
    ).toHaveValue("410");
    await expect(
      page.getByLabel("Estimated recipe protein grams per serving")
    ).toHaveValue("18");
    await expect(page.getByLabel("Estimate confidence")).toHaveValue("medium");
    await expect(page.getByLabel("Source title")).toHaveValue(draft.sourceTitle);
    await expect(page.getByLabel("Source URL")).toHaveValue(draft.sourceUrl);

    await expect(page.getByLabel("Ingredient 1 display name")).toHaveValue(/farro/i);
    await expect(page.getByLabel("Ingredient 2 display name")).toHaveValue(
      /chickpeas/i
    );
    await page
      .getByLabel("Ingredient 4 display name")
      .fill(`E2E Fixture Salt ${suffix}`);
    await page.getByLabel("Ingredient 4 quantity").fill("1");
    await page.getByLabel("Ingredient 4 unit").fill("tsp");

    for (const checkbox of await page
      .getByRole("checkbox", { name: "I reviewed this row" })
      .all()) {
      await checkbox.check();
    }

    await page
      .getByText("Approved for planning")
      .locator("..")
      .getByRole("checkbox")
      .first()
      .check();
    await page.getByRole("button", { name: "Save imported recipe" }).click();
    await page.waitForURL(/\/recipes\?/, { timeout: 30_000 });
    await expect(page.getByText("Recipe created.")).toBeVisible();
    await expect(page.getByLabel("Search recipes")).toHaveValue(importedRecipeName);
    await expect(page.getByRole("heading", { name: importedRecipeName })).toBeVisible();
    await page.getByRole("link", { name: "View and edit" }).first().click();
    await expect(page.getByText("Recipe source")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "MealBoard Synthetic Recipe Fixture" })
    ).toHaveAttribute("href", draft.sourceUrl);
  });

  test("loads an extension selected-text fallback draft into review", async ({
    page
  }) => {
    const draftKey = `mealboard-recipe-draft:e2e-${Date.now()}`;

    await signIn(page);
    await page.goto(
      `/recipes/import/review?source=extension&draft=${encodeURIComponent(draftKey)}`
    );
    await expect(page.getByText("Waiting for the recipe capture extension")).toBeVisible();

    await page.evaluate((key) => {
      window.postMessage(
        {
          draftKey: key,
          payload: {
            jsonLd: [],
            selectedText:
              "Ingredients: 1 cup beans. Instructions: Simmer until warm. Nutrition: Calories: 320 kcal Protein: 18g",
            sourceTitle: "Fallback Recipe | Example Site",
            sourceUrl:
              "https://example.test/fallback-recipe?utm_source=extension#comments"
          },
          source: "mealboard-recipe-capture-extension",
          type: "MEALBOARD_RECIPE_CAPTURE_DRAFT"
        },
        window.location.origin
      );
    }, draftKey);

    await expect(
      page.getByRole("heading", { name: "Review imported recipe" })
    ).toBeVisible();
    await expect(page.getByLabel("Recipe name")).toHaveValue("Fallback Recipe");
    await expect(page.getByLabel("Ingredient 1 display name")).toHaveValue(
      /beans/i
    );
    await expect(page.getByLabel("Ingredient 1 quantity")).toHaveValue("1");
    await expect(page.getByLabel("Ingredient 1 unit")).toHaveValue("cup");
    await expect(page.getByLabel("Instructions")).toHaveValue("Simmer until warm.");
    await expect(
      page.getByLabel("Estimated recipe calories per serving")
    ).toHaveValue("320");
    await expect(
      page.getByLabel("Estimated recipe protein grams per serving")
    ).toHaveValue("18");
    await expect(page.getByLabel("Estimate confidence")).toHaveValue("medium");
    await expect(page.getByLabel("Source title")).toHaveValue("Fallback Recipe");
    await expect(page.getByLabel("Source URL")).toHaveValue(
      "https://example.test/fallback-recipe"
    );
    await expect(
      page.getByText(
        "Selected page text was split into ingredients and instructions. Review imported fields before saving."
      )
    ).toBeVisible();
  });

  test("shows cleanup warnings for messy extension selected text", async ({
    page
  }) => {
    const draftKey = `mealboard-recipe-draft:e2e-messy-${Date.now()}`;

    await signIn(page);
    await page.goto(
      `/recipes/import/review?source=extension&draft=${encodeURIComponent(draftKey)}`
    );
    await expect(page.getByText("Waiting for the recipe capture extension")).toBeVisible();

    await page.evaluate((key) => {
      window.postMessage(
        {
          draftKey: key,
          payload: {
            jsonLd: [],
            selectedText:
              "Jump to Recipe\n5 from 12 votes\nMessy Beans\nIngredients\n\u2610 1 yellow onion, diced ($0.32)\nInstructions\nStir.\nSubscribe for weekly recipes",
            sourceTitle: "Messy Beans | Example Site",
            sourceUrl: "https://example.test/messy-beans"
          },
          source: "mealboard-recipe-capture-extension",
          type: "MEALBOARD_RECIPE_CAPTURE_DRAFT"
        },
        window.location.origin
      );
    }, draftKey);

    await expect(
      page.getByRole("heading", { name: "Review imported recipe" })
    ).toBeVisible();
    await expect(page.getByLabel("Recipe name")).toHaveValue("Messy Beans");
    await expect(page.getByLabel("Ingredient 1 display name")).toHaveValue(
      "yellow onion"
    );
    await expect(page.getByLabel("Ingredient 1 quantity")).toHaveValue("1");
    await expect(page.getByLabel("Ingredient 1 unit")).toHaveValue("count");
    await expect(page.getByLabel("Ingredient 1 preparation")).toHaveValue("diced");
    await expect(page.getByLabel("Instructions")).toHaveValue("Stir.");
    await expect(
      page.getByText(
        "Common page text was removed from the selected recipe capture."
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        "Imported instructions look short. Confirm the full method was captured before saving."
      )
    ).toBeVisible();
  });

  test("loads an extension visible-recipe draft into review", async ({
    page
  }) => {
    const draftKey = `mealboard-recipe-draft:e2e-visible-${Date.now()}`;

    await signIn(page);
    await page.goto(
      `/recipes/import/review?source=extension&draft=${encodeURIComponent(draftKey)}`
    );
    await expect(page.getByText("Waiting for the recipe capture extension")).toBeVisible();

    await page.evaluate((key) => {
      window.postMessage(
        {
          draftKey: key,
          payload: {
            jsonLd: [],
            sourceTitle: "Visible Chicken Tacos - Example",
            sourceUrl: "https://example.test/tacos?utm_medium=social#recipe",
            visibleRecipe: {
              cookTimeText: "20 minutes",
              ingredients: ["1 lb chicken thighs", "8 tortillas"],
              instructions: ["Season the chicken.", "Serve in tortillas."],
              nutritionText: "Calories: 420 kcal Protein: 31g",
              prepTimeText: "10 minutes",
              servingsText: "4 servings",
              title: "Visible Chicken Tacos"
            }
          },
          source: "mealboard-recipe-capture-extension",
          type: "MEALBOARD_RECIPE_CAPTURE_DRAFT"
        },
        window.location.origin
      );
    }, draftKey);

    await expect(
      page.getByRole("heading", { name: "Review imported recipe" })
    ).toBeVisible();
    await expect(page.getByLabel("Recipe name")).toHaveValue(
      "Visible Chicken Tacos"
    );
    await expect(page.getByLabel("Recipe servings")).toHaveValue("4");
    await expect(page.getByLabel("Prep minutes")).toHaveValue("10");
    await expect(page.getByLabel("Cook minutes")).toHaveValue("20");
    await expect(
      page.getByLabel("Estimated recipe calories per serving")
    ).toHaveValue("420");
    await expect(
      page.getByLabel("Estimated recipe protein grams per serving")
    ).toHaveValue("31");
    await expect(page.getByLabel("Estimate confidence")).toHaveValue("medium");
    await expect(page.getByLabel("Ingredient 1 display name")).toHaveValue(
      /chicken thighs/i
    );
    await expect(page.getByLabel("Instructions")).toHaveValue(
      /Serve in tortillas/
    );
    await expect(page.getByLabel("Source URL")).toHaveValue(
      "https://example.test/tacos"
    );
    await expect(
      page.getByText(
        "The extension captured visible recipe text instead of structured recipe data. Review imported fields before saving."
      )
    ).toBeVisible();
  });
});

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email ?? "");
  await page.getByLabel("Password").fill(password ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(
    /\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/
  );
}

function buildSyntheticImportDraft({
  recipeName,
  sourceUrl
}: {
  recipeName: string;
  sourceUrl: string;
}) {
  return {
    schemaVersion: 1,
    source: "e2e-fixture",
    sourceTitle: "MealBoard Synthetic Recipe Fixture",
    sourceUrl,
    fields: {
      cookMinutes: { confidence: "high", value: 20 },
      description: {
        confidence: "high",
        value: "A synthetic fixture recipe for MealBoard import tests."
      },
      instructions: {
        confidence: "high",
        value:
          "Warm the farro and chickpeas in a skillet.\nFold in citrus vinaigrette and season after tasting."
      },
      mealType: { confidence: "low", value: "dinner" },
      name: { confidence: "high", value: recipeName },
      nutritionConfidence: { confidence: "medium", value: "medium" },
      prepMinutes: { confidence: "high", value: 15 },
      servings: { confidence: "high", value: 2 },
      estimatedCaloriesPerServing: { confidence: "medium", value: 410 },
      estimatedProteinGramsPerServing: { confidence: "medium", value: 18 }
    },
    ingredients: [
      {
        display_name: "cooked farro",
        grocery_category_id: null,
        food_id: null,
        needsReview: false,
        notes: null,
        optional: false,
        preparation: "cooked",
        quantity: 1,
        rawLine: "1 cup cooked farro",
        reviewReason: null,
        unit: "cup"
      },
      {
        display_name: "chickpeas",
        grocery_category_id: null,
        food_id: null,
        needsReview: false,
        notes: null,
        optional: false,
        preparation: null,
        quantity: 1,
        rawLine: "1 cup chickpeas",
        reviewReason: null,
        unit: "cup"
      },
      {
        display_name: "citrus vinaigrette",
        grocery_category_id: null,
        food_id: null,
        needsReview: false,
        notes: null,
        optional: false,
        preparation: null,
        quantity: 2,
        rawLine: "2 tbsp citrus vinaigrette",
        reviewReason: null,
        unit: "tbsp"
      },
      {
        display_name: "salt",
        grocery_category_id: null,
        food_id: null,
        needsReview: true,
        notes: "to taste",
        optional: false,
        preparation: null,
        quantity: null,
        rawLine: "salt to taste",
        reviewReason: "Quantity or unit needs review.",
        unit: null
      }
    ],
    warnings: ["Ingredient 4 needs quantity and unit review before saving."]
  };
}

function buildFixtureSourceUrl(testInfo: TestInfo) {
  return `https://fixtures.mealboard.test/${testInfo.project.name}/recipe-jsonld-complete.html`;
}

function readFixture(fileName: string) {
  return readFileSync(resolve(fixturesDir, fileName), "utf8");
}
