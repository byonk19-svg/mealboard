import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureScript = readFileSync(
  resolve(process.cwd(), "extension", "mealboard-recipe-capture", "src", "capture.js"),
  "utf8"
);

type CapturePayload = {
  blockedPage: boolean;
  jsonLd: string[];
  visibleRecipe: {
    ingredients: string[];
    instructions: string[];
    nutritionText: string;
    servingsText: string;
    title: string;
  } | null;
};

test.describe("Chrome recipe capture script", () => {
  test("captures visible recipe card text when JSON-LD is unavailable", async ({
    page
  }) => {
    await page.setContent(`
      <main>
        <article class="wprm-recipe">
          <h1 class="wprm-recipe-name">Fixture Sheet Pan Tacos</h1>
          <div class="wprm-recipe-servings">4 servings</div>
          <div class="wprm-recipe-prep_time">Prep Time 10 minutes</div>
          <div class="wprm-recipe-cook_time">Cook Time 20 minutes</div>
          <ul class="wprm-recipe-ingredients">
            <li class="wprm-recipe-ingredient">1 lb chicken thighs</li>
            <li class="wprm-recipe-ingredient">8 tortillas</li>
          </ul>
          <ol class="wprm-recipe-instructions">
            <li class="wprm-recipe-instruction">Season the chicken.</li>
            <li class="wprm-recipe-instruction">Serve in tortillas.</li>
          </ol>
          <div class="wprm-nutrition-label">
            Calories: 420 kcal Protein: 31g
          </div>
        </article>
      </main>
    `);
    await page.addScriptTag({ content: captureScript });

    const payload = await page.evaluate<CapturePayload>(() =>
      (
        globalThis as typeof globalThis & {
          __mealboardCaptureActiveRecipePage: () => CapturePayload;
        }
      ).__mealboardCaptureActiveRecipePage()
    );

    expect(payload.jsonLd).toEqual([]);
    expect(payload.visibleRecipe).toMatchObject({
      ingredients: ["1 lb chicken thighs", "8 tortillas"],
      instructions: ["Season the chicken.", "Serve in tortillas."],
      nutritionText: "Calories: 420 kcal Protein: 31g",
      servingsText: "4 servings",
      title: "Fixture Sheet Pan Tacos"
    });
  });

  test("captures ordered directions when recipe cards use generic list markup", async ({
    page
  }) => {
    await page.setContent(`
      <main>
        <article class="recipe-card">
          <h1>Fixture Generic Pancakes</h1>
          <section class="recipe-ingredients">
            <h2>Ingredients</h2>
            <ul>
              <li>1 cup flour</li>
            </ul>
          </section>
          <section>
            <h2>Directions</h2>
            <ol>
              <li>Whisk the batter.</li>
              <li>Cook until golden.</li>
            </ol>
          </section>
        </article>
      </main>
    `);
    await page.addScriptTag({ content: captureScript });

    const payload = await page.evaluate<CapturePayload>(() =>
      (
        globalThis as typeof globalThis & {
          __mealboardCaptureActiveRecipePage: () => CapturePayload;
        }
      ).__mealboardCaptureActiveRecipePage()
    );

    expect(payload.visibleRecipe).toMatchObject({
      ingredients: ["1 cup flour"],
      instructions: ["Whisk the batter.", "Cook until golden."],
      title: "Fixture Generic Pancakes"
    });
  });

  test("marks browser-check pages as blocked", async ({ page }) => {
    await page.setContent(`
      <title>Just a moment...</title>
      <main>Checking your browser before accessing this site.</main>
    `);
    await page.addScriptTag({ content: captureScript });

    const payload = await page.evaluate<CapturePayload>(() =>
      (
        globalThis as typeof globalThis & {
          __mealboardCaptureActiveRecipePage: () => CapturePayload;
        }
      ).__mealboardCaptureActiveRecipePage()
    );

    expect(payload.blockedPage).toBe(true);
    expect(payload.jsonLd).toEqual([]);
    expect(payload.visibleRecipe).toBeNull();
  });
});
