import { expect, test } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

test.describe("Saved foods settings", () => {
  test.setTimeout(90_000);

  test.skip(
    !email || !password,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("creates, archives, and restores a household food", async ({ page }) => {
    const foodName = `E2E Saved Food ${Date.now()}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      /\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/
    );

    await page.goto("/settings");
    await page.getByRole("link", { name: /Saved Foods/ }).click();
    await expect(
      page.getByRole("heading", { name: "Saved Foods" })
    ).toBeVisible();

    await page.getByLabel("New food name").fill(foodName);
    await page.getByLabel("New food default unit").fill("each");
    const categorySelect = page.getByLabel("New food grocery category");

    if ((await categorySelect.locator("option").count()) > 1) {
      await categorySelect.selectOption({ index: 1 });
    }

    await page.getByRole("button", { name: "Create food" }).click();
    await expect(page.getByText("Food created.")).toBeVisible();
    const foodHeading = page.getByRole("heading", { name: foodName });
    await expect(foodHeading).toBeVisible();

    const activeCard = foodHeading.locator("xpath=ancestor::article[1]");
    await activeCard.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Food archived.")).toBeVisible();
    await expect(foodHeading).toBeVisible();

    const archivedCard = foodHeading.locator("xpath=ancestor::article[1]");
    await archivedCard.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Food restored.")).toBeVisible();
    await expect(page.getByRole("heading", { name: foodName })).toBeVisible();
  });
});
