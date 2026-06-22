import { expect, test } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

test.describe("MealBoard core loop", () => {
  test.skip(
    !email || !password,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("creates planning inputs, generates groceries, shops, and reaches dashboard", async ({
    page
  }) => {
    const suffix = Date.now().toString();
    const recipeName = `E2E Turkey Wrap ${suffix}`;
    const stapleName = `E2E Crackers ${suffix}`;
    const manualItemName = `E2E Manual Apples ${suffix}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/);

    await page.goto("/settings/staples");
    await page.getByLabel("Name").fill(stapleName);
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Unit").fill("box");
    await page.getByRole("button", { name: "Create staple" }).click();
    await expect(page.getByText("Staple created.")).toBeVisible();

    await page.goto("/recipes/new");
    await page.getByLabel("Name").fill(recipeName);
    await page.getByLabel("Servings").fill("1");
    await page.getByLabel("Estimated calories").fill("420");
    await page.getByLabel("Estimated protein").fill("30");
    await page.getByLabel("Display name").first().fill("Tortillas");
    await page.getByLabel("Quantity").first().fill("2");
    await page.getByLabel("Unit").first().fill("count");
    await page.getByText("Approved for planning").locator("..").getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Create recipe" }).click();
    await expect(page.getByText("Recipe created.")).toBeVisible();

    await page.goto("/plan-week");
    await page.getByRole("button", { name: "Create or select week" }).click();
    await expect(page.getByText("Planning week ready.")).toBeVisible();
    await page.getByRole("button", { name: "Save weekly setup" }).click();
    await expect(page.getByText("Weekly planning setup saved.")).toBeVisible();

    const recipeSelect = page.getByLabel("Recipe").first();
    const recipeOptionValue = await recipeSelect
      .locator("option")
      .filter({ hasText: recipeName })
      .first()
      .getAttribute("value");
    expect(recipeOptionValue).toBeTruthy();
    await recipeSelect.selectOption(recipeOptionValue ?? "");
    await page.getByRole("button", { name: "Add recipe" }).first().click();
    await expect(page.getByText("Recipe added to the week.")).toBeVisible();
    await page.getByRole("button", { name: "Approve for groceries" }).first().click();
    await expect(page.getByText("Plan item approved.")).toBeVisible();
    await page.getByLabel(stapleName).check();
    await page.getByRole("button", { name: "Save selected staples" }).click();
    await expect(page.getByText("Weekly staples saved.")).toBeVisible();
    await page.getByRole("button", { name: "Generate grocery list" }).click();
    await expect(page).toHaveURL(/\/grocery-list/);
    await expect(page.getByText("Draft grocery list generated.")).toBeVisible();

    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page.getByText("Profile View is source context.")).toBeVisible();
    await page.getByRole("link", { name: "Meal" }).click();
    await expect(page.getByText("Meal View is source context.")).toBeVisible();
    await page.getByRole("link", { name: "Shopping" }).click();

    await page.getByText("Add grocery item").click();
    await page.getByLabel("Item").fill(manualItemName);
    await page.getByLabel("Quantity").last().fill("3");
    await page.getByLabel("Unit").last().fill("count");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Manual grocery item added.")).toBeVisible();

    await page.getByRole("button", { name: "Check off" }).first().click();
    await expect(page.getByText("Grocery item updated.")).toBeVisible();
    await page.getByRole("button", { name: "Finalize list" }).click();
    await page.getByRole("button", { name: "Start shopping" }).click();
    await page.getByRole("button", { name: "Complete shopping" }).click();
    await expect(page.getByText("This grocery list is completed.")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Planning status")).toBeVisible();
    await expect(page.getByText("Grocery status")).toBeVisible();
  });
});
