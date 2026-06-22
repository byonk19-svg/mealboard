import { expect, test } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

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
    await page.getByLabel("Ingredient 2 quantity").fill("1");
    await page.getByLabel("Ingredient 2 unit").fill("pinch");
    await page
      .getByRole("checkbox", { name: "I reviewed this row" })
      .check();
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
});
