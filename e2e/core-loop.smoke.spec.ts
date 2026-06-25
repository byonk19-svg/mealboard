import { expect, test } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

test.describe("MealBoard core loop", () => {
  test.setTimeout(300_000);

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
    const weekStartDate = getFutureSundayDateKey(Number(suffix));

    await page.goto("/login");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/);

    await page.goto("/settings/staples");
    await page.getByLabel("New staple name").fill(stapleName);
    await page.getByLabel("New staple default quantity").fill("1");
    await page.getByLabel("New staple default unit").fill("box");
    await page.getByRole("button", { name: "Create staple" }).click();
    await expect(page.getByText("Staple created.")).toBeVisible();

    await page.goto("/recipes/new");
    await page.getByLabel("Recipe name").fill(recipeName);
    await page.getByLabel("Recipe servings").fill("1");
    await page.getByLabel("Estimated recipe calories per serving").fill("420");
    await page.getByLabel("Estimated recipe protein grams per serving").fill("30");
    await page.getByLabel("Ingredient 1 display name").fill("Tortillas");
    await page.getByLabel("Ingredient 1 quantity").fill("2");
    await page.getByLabel("Ingredient 1 unit").fill("count");
    await page.getByText("Approved for planning").locator("..").getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Create recipe" }).click();
    await page.waitForURL(/\/recipes\/[^/?]+\?message=/, { timeout: 30_000 });
    await expect(page.getByText("Recipe created.")).toBeVisible();

    await page.goto(`/plan-week?weekStartDate=${weekStartDate}`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Week of").fill(weekStartDate);
    await page.getByRole("button", { name: "Create or select week" }).click();
    await expect(page.getByRole("button", { name: "Save weekly setup" })).toBeVisible({
      timeout: 45_000
    });
    await page.getByRole("button", { name: "Save weekly setup" }).click();
    await expect(page.getByLabel("Recipe for Sunday")).toBeVisible();
    const weeklyPlanId =
      (await page.locator('input[name="weeklyPlanId"]').first().getAttribute("value")) ??
      "";
    expect(weeklyPlanId).toBeTruthy();

    const recipeSelect = page.getByLabel("Recipe for Sunday");
    const recipeOptionValue = await recipeSelect
      .locator("option")
      .filter({ hasText: recipeName })
      .first()
      .getAttribute("value");
    expect(recipeOptionValue).toBeTruthy();
    await recipeSelect.selectOption(recipeOptionValue ?? "");
    await recipeSelect
      .locator("xpath=ancestor::form[1]")
      .getByRole("button", { name: "Add recipe" })
      .click();
    await page.waitForURL(/message=Recipe\+added\+to\+the\+week|message=Recipe%20added%20to%20the%20week/, {
      timeout: 45_000
    });
    const plannedMeal = page.getByRole("article", {
      name: `Planned meal ${recipeName}`
    });
    await expect(plannedMeal).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Profile view" }).click();
    await expect(page).toHaveURL(/view=profile/, { timeout: 45_000 });
    await expect(plannedMeal).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "Baby" })).toBeVisible();
    await plannedMeal.getByRole("button", { name: "Approve for groceries" }).click();
    await expect(page).toHaveURL(/view=profile/, { timeout: 45_000 });
    const approvedPlannedMeal = page.getByRole("article", {
      name: `Planned meal ${recipeName}`
    });
    await expect(
      approvedPlannedMeal.getByText("Approved for groceries")
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Day view" }).click();
    await expect(approvedPlannedMeal).toBeVisible();
    await page.getByLabel(stapleName).check();
    await page.getByRole("button", { name: "Save selected staples" }).click();
    await expect(page.getByRole("button", { name: "Generate grocery list" })).toBeVisible();
    await page.getByRole("button", { name: "Generate grocery list" }).click();
    await page.waitForURL(/\/grocery-list/, { timeout: 45_000 });
    await expect(page).toHaveURL(/\/grocery-list/);
    await expect(page.getByText("Draft grocery list generated.")).toBeVisible();

    await page.getByRole("link", { name: "Profile", exact: true }).click();
    await expect(page.getByText("Profile View is source context.")).toBeVisible();
    await page.getByRole("link", { name: "Meal", exact: true }).click();
    await expect(page.getByText("Meal View is source context.")).toBeVisible();
    await page.getByRole("link", { name: "Shopping", exact: true }).click();

    await page.getByText("Add grocery item").click();
    await page.getByLabel("Grocery item name").fill(manualItemName);
    await page.getByLabel("Grocery item quantity").fill("3");
    await page.getByLabel("Grocery item unit").fill("count");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Manual grocery item added.")).toBeVisible();

    await page.getByRole("button", { name: "Check off" }).first().click();
    await expect(
      page.getByRole("button", { name: /Uncheck/ }).first()
    ).toBeVisible();
    await page.getByRole("button", { name: "Finalize list" }).click();
    await page.goto(`/plan-week?weekStartDate=${weekStartDate}`);
    const mondayRecipeSelect = page.getByLabel("Recipe for Monday");
    await mondayRecipeSelect.selectOption(recipeOptionValue ?? "");
    await mondayRecipeSelect
      .locator("xpath=ancestor::form[1]")
      .getByRole("button", { name: "Add recipe" })
      .click();
    await page.waitForURL(/message=Recipe\+added\+to\+the\+week|message=Recipe%20added%20to%20the%20week/, {
      timeout: 45_000
    });
    const mondayPlannedMeal = page
      .getByRole("article", { name: `Planned meal ${recipeName}` })
      .nth(1);
    await page.waitForLoadState("networkidle");
    await mondayPlannedMeal
      .getByRole("button", { name: "Approve for groceries" })
      .click();
    await page.waitForURL(
      /message=Plan(\+|%20)item(\+|%20)approved\.?/,
      { timeout: 45_000 }
    );
    const approvedMondayPlannedMeal = page
      .getByRole("article", { name: `Planned meal ${recipeName}` })
      .nth(1);
    await expect(
      approvedMondayPlannedMeal.getByText("Approved for groceries")
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Protected grocery list: Finalized")).toBeVisible();
    await expect(
      page.getByText("MealBoard will not silently change this list")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Apply reviewed grocery updates" })
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Apply reviewed grocery updates" })
      .click();
    await page.waitForURL(/message=Applied(\+|%20)pending(\+|%20)grocery/, {
      timeout: 45_000
    });
    await expect(
      page.getByText("Applied pending grocery changes:")
    ).toBeVisible({ timeout: 45_000 });
    await page.goto("/grocery-list");
    await expect(page.getByText("Finalized")).toBeVisible();
    await page.getByRole("button", { name: "Start shopping" }).click();
    await page.getByRole("button", { name: "Complete shopping" }).click();
    await expect(page.getByText("This grocery list is completed.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent completed grocery lists" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View completed list/ }).first()
    ).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Current Week" })).toBeVisible();
    await expect(page.getByText("Planning status")).toBeVisible();
    await expect(page.getByText("Grocery status")).toBeVisible();
    await page.goto(`/weekly-wrap-up/${weeklyPlanId}`);
    await expect(
      page.getByRole("heading", { name: "Review what needs attention" })
    ).toBeVisible();
    const saveFeedback = page.getByRole("button", { name: "Save feedback" });

    if ((await saveFeedback.count()) > 0) {
      await saveFeedback.first().click();
      await expect(page.getByText("Recipe feedback saved.")).toBeVisible();
    }
  });
});

function getFutureSundayDateKey(seed: number) {
  const date = new Date();
  date.setDate(date.getDate() + 365 + (seed % 3650));
  const day = date.getDay();
  date.setDate(date.getDate() - day);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
