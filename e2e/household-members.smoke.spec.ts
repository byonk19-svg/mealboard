import { expect, test } from "@playwright/test";

const ownerEmail = process.env.MEALBOARD_E2E_EMAIL;
const ownerPassword = process.env.MEALBOARD_E2E_PASSWORD;
const memberEmail =
  process.env.MEALBOARD_E2E_MEMBER_EMAIL ??
  "mealboard-e2e-member-local@example.test";
const memberPassword =
  process.env.MEALBOARD_E2E_MEMBER_PASSWORD ??
  "Mealboard-e2e-member-local-12345!";

test.describe("Household member lifecycle", () => {
  test.skip(
    !ownerEmail || !ownerPassword,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("links an existing auth user, transfers ownership, and removes access", async ({
    page
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ownerEmail ?? "");
    await page.getByLabel("Password").fill(ownerPassword ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/);

    await page.goto("/settings");
    await page.getByRole("link", { name: /Shared access Household/ }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: "Household" })
    ).toBeVisible();
    const memberHeading = page.getByRole("heading", { name: memberEmail });

    if ((await memberHeading.count()) === 0) {
      await page.getByLabel("Existing auth user email").fill(memberEmail);
      await page.getByRole("button", { name: "Link member" }).click();
      await expect(
        page.getByText(
          new RegExp(
            `Linked ${escapeRegExp(memberEmail)} to this household\\.|That user is already linked to this household\\.`
          )
        )
      ).toBeVisible();
    }

    await expect(memberHeading).toBeVisible();
    await memberHeading
      .locator("xpath=ancestor::article[1]")
      .getByRole("button", { name: "Make owner" })
      .click();
    await expect(page.getByText("Household ownership transferred.")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/);
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(memberPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Current Week" })).toBeVisible();
    await expect(page.getByText("No household linked")).toHaveCount(0);
    await page.goto("/settings/household");
    await expect(
      page.getByRole("heading", { exact: true, name: "Household" })
    ).toBeVisible();
    await page
      .getByRole("heading", { name: ownerEmail ?? "" })
      .locator("xpath=ancestor::article[1]")
      .getByRole("button", { name: "Make owner" })
      .click();
    await expect(page.getByText("Household ownership transferred.")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/);
    await page.getByLabel("Email").fill(ownerEmail ?? "");
    await page.getByLabel("Password").fill(ownerPassword ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/);

    await page.goto("/settings/household");
    await expect(memberHeading).toBeVisible();
    await memberHeading
      .locator("xpath=ancestor::article[1]")
      .getByRole("button", { name: "Remove member" })
      .click();
    await expect(page.getByText("Household member removed.")).toBeVisible();
    await expect(memberHeading).toHaveCount(0);

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/);
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(memberPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("heading", {
        name: "This user is not linked to a MealBoard household yet."
      })
    ).toBeVisible();
  });
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
