import { expect, test } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

test.describe("Baby settings", () => {
  test.setTimeout(90_000);

  test.skip(
    !email || !password,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("opens baby settings and tracks a Try This food when available", async ({
    page
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      /\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/
    );

    await page.goto("/settings/baby");
    await expect(
      page.getByRole("heading", { name: "Baby Settings" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "One new food idea at a time" })
    ).toBeVisible();

    const trackButton = page.getByRole("button", {
      name: "Track Try This food"
    });

    if ((await trackButton.count()) === 0) {
      await expect(page.getByText(/Add more foods|Add baby's stage setup/)).toBeVisible();
      return;
    }

    await page.getByLabel("Try This status").selectOption("tried");
    await trackButton.click();
    await expect(page.getByText("Baby food status saved.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tried, liked, and disliked foods" })).toBeVisible();
  });
});
