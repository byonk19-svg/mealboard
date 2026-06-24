import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/dashboard",
  "/recipes",
  "/recipes/import",
  "/recipes/import/review?source=e2e&draft=missing",
  "/plan-week",
  "/grocery-list",
  "/settings/household",
  "/settings/baby"
];

test.describe("protected route auth boundary", () => {
  for (const route of protectedRoutes) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL((url) => {
        return (
          url.pathname === "/login" && url.searchParams.get("returnTo") === route
        );
      });
      await expect(
        page.getByRole("heading", { name: "Sign in to MealBoard" })
      ).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });
  }
});
