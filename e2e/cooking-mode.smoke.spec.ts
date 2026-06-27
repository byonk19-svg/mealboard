import { expect, test, type Page } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

test.describe("Cooking Mode", () => {
  test.setTimeout(240_000);

  test.skip(
    !email || !password,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("reviews steps, cooks, persists progress, uses timers, and completes", async ({
    page
  }) => {
    const recipeName = `E2E Cooking Wrap ${Date.now()}`;
    const recipeUrl = await createRecipeWithReviewedSteps(page, recipeName);

    await page.goto(`${recipeUrl}/cook`);
    await page.getByRole("button", { name: "Start cooking" }).click();
    await expect(page.getByText("Cooking session ready.")).toBeVisible();

    await page.getByRole("button", { name: /Tortillas/ }).click();
    await expect(page.getByText("Ingredient marked ready.")).toBeVisible();

    const firstStep = page.getByText("Step 1").locator("xpath=ancestor::article[1]");
    await firstStep.getByRole("button", { name: "Complete" }).click();
    await expect(page.getByText("Step completed.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: /Tortillas/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(firstStep.getByRole("button", { name: "Uncheck" })).toBeVisible();

    await page.getByLabel("Label").fill("Rest timer");
    await page.getByLabel("Minutes").fill("1");
    await page.getByRole("button", { name: "Add timer" }).click();
    await expect(page.getByText("Timer added.")).toBeVisible();
    const timerCard = page.getByText("Rest timer").locator("xpath=ancestor::article[1]");
    await timerCard.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Timer started.")).toBeVisible();
    await timerCard.getByRole("button", { exact: true, name: "Pause" }).click();
    await expect(page.getByText("Timer paused.")).toBeVisible();
    await timerCard.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByText("Timer started.")).toBeVisible();
    await timerCard.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Timer canceled.")).toBeVisible();

    await page.getByLabel("Label").fill("Quick timer");
    await page.getByLabel("Minutes").fill("0.02");
    await page.getByRole("button", { name: "Add timer" }).click();
    await expect(page.getByText("Timer added.")).toBeVisible();
    const quickTimerCard = page
      .getByText("Quick timer")
      .locator("xpath=ancestor::article[1]");
    await quickTimerCard.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Timer started.")).toBeVisible();
    await page.waitForTimeout(1800);
    await page.reload();
    await expect(page.getByText(/Expired -/)).toBeVisible();
    await quickTimerCard.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Timer dismissed.")).toBeVisible();

    await page.getByRole("button", { name: "Pause session" }).click();
    await expect(page.getByText("Cooking session paused.")).toBeVisible();
    await page.getByRole("button", { name: "Resume session" }).click();
    await expect(page.getByText("Cooking session resumed.")).toBeVisible();
    await page.getByRole("button", { name: "Complete session" }).click();
    await expect(page.getByText("Cooking session completed.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Completed session" })
    ).toBeVisible();
    await expect(page.getByText("This historical session snapshot is read-only.")).toBeVisible();

    await page.goto(recipeUrl);
    await expect(page.getByLabel("Status")).toHaveValue("tried");
    await page.goto("/grocery-list");
    await expect(page.getByText(recipeName)).toHaveCount(0);
  });

  test("keeps the cooking checklist usable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const recipeName = `E2E Mobile Cooking ${Date.now()}`;
    const recipeUrl = await createRecipeWithReviewedSteps(page, recipeName);

    await page.goto(`${recipeUrl}/cook`);
    await page.getByRole("button", { name: "Start cooking" }).click();
    await expect(page.getByRole("heading", { name: recipeName })).toBeVisible();
    await page.keyboard.press("Tab");
    await page.getByRole("button", { name: /Tortillas/ }).click();
    await expect(page.getByText("Ingredient marked ready.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: /Tortillas/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete session" })).toBeVisible();
  });
});

async function createRecipeWithReviewedSteps(page: Page, recipeName: string) {
  await signIn(page);
  await page.goto("/recipes/new");
  await page.getByLabel("Recipe name").fill(recipeName);
  await page.getByLabel("Recipe servings").fill("2");
  await page
    .getByLabel("Instructions")
    .fill("1. Warm the tortillas.\n2. Fill and roll the wraps.");
  await page.getByLabel("Ingredient 1 display name").fill("Tortillas");
  await page.getByLabel("Ingredient 1 quantity").fill("2");
  await page.getByLabel("Ingredient 1 unit").fill("count");
  await page.getByRole("button", { name: "Create recipe" }).click();
  await page.waitForURL(/\/recipes\/[^/?]+\?message=/, { timeout: 30_000 });
  await expect(page.getByText("Recipe created.")).toBeVisible();

  const recipeUrl = page.url().split("?")[0] ?? "";
  await page.getByRole("button", { name: "Save cooking steps" }).click();
  await expect(page.getByText("Cooking steps saved.")).toBeVisible();

  return recipeUrl;
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email ?? "");
  await page.getByLabel("Password").fill(password ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/);
}
