import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/dashboard",
  "/recipes",
  "/plan-week",
  "/grocery-list",
  "/settings/baby"
];

test.describe("protected route auth boundary", () => {
  for (const route of protectedRoutes) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "Sign in to MealBoard" })
      ).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });
  }
});
