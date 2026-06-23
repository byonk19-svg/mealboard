import { devices, expect, test } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;
const iphone13ChromiumSettings = (() => {
  const settings = { ...devices["iPhone 13"] };
  delete (settings as { defaultBrowserType?: unknown }).defaultBrowserType;
  return settings;
})();

test.use(iphone13ChromiumSettings);

test.describe("Mobile grocery list", () => {
  test.setTimeout(90_000);

  test.skip(
    !email || !password,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("opens the grocery list and exercises mobile controls", async ({
    page
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email ?? "");
    await page.getByLabel("Password").fill(password ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      /\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/
    );

    await page.goto("/grocery-list");
    await expect(
      page.getByRole("heading", { name: "Current Grocery List" })
    ).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(430);

    const emptyState = page.getByRole("heading", { name: "No grocery list yet" });
    if (await emptyState.isVisible()) {
      await expect(page.getByRole("link", { name: "Open Plan Week" })).toBeVisible();
      await page.keyboard.press("Tab");
      return;
    }

    await expect(page.getByText("Total items")).toBeVisible();
    await page.getByRole("link", { name: "Profile", exact: true }).click();
    await expect(page.getByText("Profile View is source context.")).toBeVisible();
    await page.getByRole("link", { name: "Meal", exact: true }).click();
    await expect(page.getByText("Meal View is source context.")).toBeVisible();
    await page.getByRole("link", { name: "Shopping", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Grocery list view" })).toBeVisible();

    await page.getByText("Add grocery item").click();
    await expect(page.getByLabel("Grocery item name")).toBeVisible();
    await page.keyboard.press("Tab");

    const checkButton = page.getByRole("button", {
      name: /Check off|Uncheck/
    }).first();

    if ((await checkButton.count()) > 0 && (await checkButton.isEnabled())) {
      const stateRoutePattern = "**/api/grocery-list/items/**/state";
      let failedOnce = false;

      await page.route(stateRoutePattern, async (route) => {
        if (!failedOnce) {
          failedOnce = true;
          await route.abort();
          return;
        }

        await route.continue();
      });

      await checkButton.click();
      await expect(
        page.getByText("Saved locally. Retry when service returns.").first()
      ).toBeVisible();
      await page.unroute(stateRoutePattern);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await expect(page.getByText("Grocery item updated.").first()).toBeVisible();
    }

    const sourceDetails = page.getByText("Why is this on the list?").first();
    if ((await sourceDetails.count()) > 0) {
      await sourceDetails.click();
      await expect(page.getByText("Source amount").first()).toBeVisible();
    }
  });
});
