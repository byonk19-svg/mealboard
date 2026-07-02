import { expect, test, type Page } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

test.describe("MealBoard core loop", () => {
  test.setTimeout(420_000);

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
    const addRecipeButton = recipeSelect
      .locator("xpath=ancestor::form[1]")
      .getByRole("button", { name: "Add recipe" });
    await expect(addRecipeButton).toBeEnabled();
    await addRecipeButton.click();
    await waitForPlannedMeal(page, recipeName);

    const suggestionsSection = page
      .getByRole("heading", { name: "Rule-based suggestions" })
      .locator("xpath=ancestor::section[1]");
    const firstSuggestionName = await suggestionsSection
      .getByRole("article")
      .first()
      .getByRole("heading", { level: 3 })
      .textContent();
    const suggestionName = firstSuggestionName?.trim() ?? "";
    expect(suggestionName).toBeTruthy();
    const addSuggestedMeals = page.getByRole("button", {
      name: "Add suggested meals"
    });
    await expect(addSuggestedMeals).toBeEnabled();
    await addSuggestedMeals.focus();
    await addSuggestedMeals.press("Enter");
    await waitForPlannedMeal(page, suggestionName);
    const suggestedPlannedMeal = page
      .getByRole("article", { name: `Planned meal ${suggestionName}` })
      .first();
    await expect(
      suggestedPlannedMeal.getByText("Needs approval").first()
    ).toBeVisible();
    await page.getByRole("link", { name: "Profile view" }).click();
    await expect(page).toHaveURL(/view=profile/, { timeout: 45_000 });
    await expect(page.getByRole("heading", { exact: true, name: "Baby" })).toBeVisible();
    const profilePlannedMeal = page
      .getByRole("article", {
        name: `Planned meal ${recipeName}`
      })
      .first();
    await expect(profilePlannedMeal.getByText("Needs approval").first()).toBeVisible();
    await profilePlannedMeal
      .getByRole("button", { name: "Approve for groceries" })
      .click();
    await expect(page).toHaveURL(/view=profile/, { timeout: 45_000 });
    const approvedPlannedMeal = page
      .getByRole("article", {
        name: `Planned meal ${recipeName}`
      })
      .first();
    await expect(
      approvedPlannedMeal.getByText("Approved for groceries").first()
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Day view" }).click();
    await expect(approvedPlannedMeal).toBeVisible();
    await page.getByLabel(stapleName).check();
    await page.getByRole("button", { name: "Save selected staples" }).click();
    const generateGroceryList = page.getByRole("button", {
      name: "Generate grocery list"
    });
    await expect(generateGroceryList).toBeEnabled();
    await generateGroceryList.focus();
    await generateGroceryList.press("Enter");
    await expect(page).toHaveURL(/\/grocery-list/, { timeout: 20_000 }).catch(
      async () => {
        await generateGroceryList.click({ force: true });
        await expect(page).toHaveURL(/\/grocery-list/, { timeout: 60_000 });
      }
    );
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
    const approvedDayMeal = page.getByRole("article", {
      name: new RegExp(
        `^Planned meal ${escapeRegExp(recipeName)} - Brianna, .*, Lunch$`
      )
    }).first();
    await expect(
      approvedDayMeal.getByText("Approved for groceries")
    ).toBeVisible();
    await approvedDayMeal
      .getByRole("button", { name: new RegExp(`^Remove ${escapeRegExp(recipeName)} `) })
      .click();
    await expect(
      page.getByText("Plan item removed.")
    ).toBeVisible({ timeout: 45_000 });
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
    await page.goto("/grocery-list?listId=00000000-0000-0000-0000-000000000000");
    await expect(
      page.getByRole("heading", {
        name: "Completed grocery list unavailable"
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open current grocery list" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent completed grocery lists" })
    ).toBeVisible();
    await page.getByRole("link", { name: "Open current grocery list" }).click();
    await expect(page).toHaveURL(/\/grocery-list$/);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Current Week" })).toBeVisible();
    await expect(page.getByText("Planning status")).toBeVisible();
    await expect(page.getByText("Grocery status").first()).toBeVisible();
    await page.goto(`/weekly-wrap-up/${weeklyPlanId}`);
    await expect(
      page.getByRole("heading", { name: "Review what needs attention" })
    ).toBeVisible();
  });
});

function getFutureSundayDateKey(seed: number) {
  const date = new Date(Date.UTC(2040, 0, 1));
  const weekOffset = Math.floor(seed / 1000) % 200_000;
  date.setUTCDate(date.getUTCDate() + weekOffset * 7);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

async function waitForPlannedMeal(page: Page, recipeName: string) {
  const plannedMeal = page.getByRole("article", {
    name: `Planned meal ${recipeName}`
  }).first();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await expect(plannedMeal).toBeVisible({ timeout: 10_000 });
      return;
    } catch (error) {
      if (attempt === 5) {
        throw error;
      }

      await page.reload();
    }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
