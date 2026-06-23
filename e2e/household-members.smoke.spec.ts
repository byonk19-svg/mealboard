import { expect, test } from "@playwright/test";

const ownerEmail = process.env.MEALBOARD_E2E_EMAIL;
const ownerPassword = process.env.MEALBOARD_E2E_PASSWORD;
const memberEmail =
  process.env.MEALBOARD_E2E_MEMBER_EMAIL ??
  "mealboard-e2e-member-local@example.test";
const memberPassword =
  process.env.MEALBOARD_E2E_MEMBER_PASSWORD ??
  "Mealboard-e2e-member-local-12345!";

test.describe("Household member linking", () => {
  test.skip(
    !ownerEmail || !ownerPassword,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("links an existing auth user and lets that member reach the app", async ({
    page
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ownerEmail ?? "");
    await page.getByLabel("Password").fill(ownerPassword ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/);

    await page.goto("/settings");
    await page.getByRole("link", { name: /Shared access Household/ }).click();
    await expect(page.getByRole("heading", { name: "Household" })).toBeVisible();
    await page.getByLabel("Existing auth user email").fill(memberEmail);
    await page.getByRole("button", { name: "Link member" }).click();
    await expect(page.getByText(`Linked ${memberEmail} to this household.`)).toBeVisible();
    await expect(page.getByRole("heading", { name: memberEmail })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/);
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(memberPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Current Week" })).toBeVisible();
    await expect(page.getByText("No household linked")).toHaveCount(0);
  });
});
