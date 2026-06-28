import { expect, test, type Page } from "@playwright/test";

const email = process.env.MEALBOARD_E2E_EMAIL;
const password = process.env.MEALBOARD_E2E_PASSWORD;

test.describe("Smart Pantry", () => {
  test.setTimeout(180_000);

  test.skip(
    !email || !password,
    "Set MEALBOARD_E2E_EMAIL and MEALBOARD_E2E_PASSWORD for authenticated smoke."
  );

  test("adds, edits, searches, reviews events, and discards pantry stock", async ({
    page
  }) => {
    const suffix = Date.now();
    const foodName = `E2E Pantry Yogurt ${suffix}`;
    const displayName = `${foodName} cups`;

    await signIn(page);
    await page.goto("/pantry");
    await expect(
      page.getByRole("heading", { exact: true, name: "Pantry" })
    ).toBeVisible();

    const addSection = page
      .getByRole("heading", { name: "Add pantry item" })
      .locator("xpath=ancestor::section[1]");
    await addSection.getByLabel("Or create household item").fill(foodName);
    await addSection.getByLabel("Pantry display name").fill(displayName);
    await addSection.getByLabel("Package detail").fill("4 count cups");
    await addSection.getByRole("spinbutton", { name: "Quantity" }).fill("2");
    await addSection
      .getByRole("textbox", { exact: true, name: "Unit" })
      .fill("count");
    await addSection.getByLabel("Low threshold", { exact: true }).fill("3");
    await addSection.getByLabel("Threshold unit", { exact: true }).fill("count");
    await addSection.getByLabel("Expiration").fill(getDateOffset(3));
    await addSection.getByLabel("Storage").fill("Fridge");
    const categorySelects = addSection.getByLabel("Category");

    if ((await categorySelects.locator("option").count()) > 1) {
      await categorySelects.selectOption({ index: 1 });
    }

    await addSection.getByRole("button", { name: "Add pantry item" }).click();
    await expect(page.getByText("Pantry item created.")).toBeVisible();
    await expect(
      page.getByRole("heading", { exact: true, name: foodName })
    ).toBeVisible();
    const rollupCard = page
      .getByRole("heading", { exact: true, name: foodName })
      .locator("xpath=ancestor::article[1]");
    await expect(rollupCard.getByText("Low", { exact: true }).first()).toBeVisible();

    await openItemDetails(page, displayName);
    const itemDetails = page
      .getByRole("heading", { exact: true, name: displayName })
      .locator("xpath=ancestor::details[1]");
    await itemDetails.getByLabel("Status").selectOption("low");
    await itemDetails.getByLabel("Event note").fill("Marked low during smoke.");
    await itemDetails.getByRole("button", { name: "Save pantry item" }).click();
    await expect(page.getByText("Pantry item updated.")).toBeVisible();
    await openItemDetails(page, displayName);
    const updatedItemDetails = page
      .getByRole("heading", { exact: true, name: displayName })
      .locator("xpath=ancestor::details[1]");
    await expect(
      updatedItemDetails.getByText("Status changed").first()
    ).toBeVisible();

    await page.goto("/pantry?view=low");
    await expect(
      page.getByRole("heading", { name: "Restock candidates" })
    ).toBeVisible();
    const restockSection = page
      .getByRole("heading", { name: "Restock candidates" })
      .locator("xpath=ancestor::section[1]");
    const restockCandidate = restockSection
      .getByRole("heading", { exact: true, name: displayName })
      .locator("xpath=ancestor::article[1]");
    await expect(restockCandidate).toBeVisible();
    const addRestock = restockCandidate.getByRole("button", {
      name: "Add to grocery list"
    });
    const canAddRestock = (await addRestock.count()) > 0;

    if (canAddRestock) {
      await addRestock.click();
      await expect(
        page.getByText("Restock item added to grocery list.")
      ).toBeVisible();
      await expect(
        restockCandidate.getByText("Already on grocery list")
      ).toBeVisible();
    } else {
      await expect(
        restockCandidate.getByText("No editable grocery list")
      ).toBeVisible();
    }

    await page.getByLabel("Search pantry").fill("fridge");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: foodName })
    ).toBeVisible();

    await page.getByRole("link", { name: "Expiring soon" }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: foodName })
    ).toBeVisible();
    const expiringCard = page
      .getByRole("heading", { exact: true, name: foodName })
      .locator("xpath=ancestor::article[1]");
    await expect(
      expiringCard.getByText(/Expiring soon|Expires today/).first()
    ).toBeVisible();

    await openItemDetails(page, displayName);
    const expiringDetails = page
      .getByRole("heading", { exact: true, name: displayName })
      .locator("xpath=ancestor::details[1]");
    await expiringDetails.getByLabel("Discard note").fill("Discarded by smoke.");
    await expiringDetails
      .getByRole("button", { name: "Discard from active pantry" })
      .click();
    await expect(page.getByText("Pantry item discarded.")).toBeVisible();
    await expect(
      page.getByRole("heading", { exact: true, name: foodName })
    ).toHaveCount(0);
    await expect(page.getByText("Discarded").first()).toBeVisible();

    await page.goto("/grocery-list");
    if (canAddRestock) {
      await expect(
        page.getByRole("heading", { exact: true, level: 3, name: displayName })
      ).toBeVisible();
    } else {
      await expect(page.getByText(foodName)).toHaveCount(0);
    }
  });

  test("keeps the pantry route usable at mobile width", async ({ page }) => {
    const suffix = Date.now();
    const foodName = `E2E Mobile Pantry ${suffix}`;
    const displayName = `${foodName} pouch`;

    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto("/pantry");
    await expect(
      page.getByRole("heading", { exact: true, name: "Pantry" })
    ).toBeVisible();
    await expect(page.getByLabel("Search pantry")).toBeVisible();

    const addSection = page
      .getByRole("heading", { name: "Add pantry item" })
      .locator("xpath=ancestor::section[1]");
    await addSection.getByLabel("Or create household item").fill(foodName);
    await addSection.getByLabel("Pantry display name").fill(displayName);
    await addSection.getByRole("spinbutton", { name: "Quantity" }).fill("1");
    await addSection
      .getByRole("textbox", { exact: true, name: "Unit" })
      .fill("count");
    await addSection.getByLabel("Low threshold", { exact: true }).fill("2");
    await addSection.getByLabel("Threshold unit", { exact: true }).fill("count");
    await addSection.getByLabel("Expiration").fill(getDateOffset(2));
    await addSection.getByLabel("Storage").fill("Kitchen drawer");
    await addSection.getByRole("button", { name: "Add pantry item" }).click();
    await expect(page.getByText("Pantry item created.")).toBeVisible();

    await page.getByLabel("Search pantry").fill("drawer");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: foodName })
    ).toBeVisible();

    await openItemDetails(page, displayName);
    const itemDetails = page
      .getByRole("heading", { exact: true, name: displayName })
      .locator("xpath=ancestor::details[1]");
    await itemDetails.getByLabel("Status").selectOption("low");
    await itemDetails.getByRole("button", { name: "Save pantry item" }).click();
    await expect(page.getByText("Pantry item updated.")).toBeVisible();

    await page.getByRole("link", { name: "Low & out" }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: foodName })
    ).toBeVisible();

    await page.getByRole("link", { name: "Expiring soon" }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: foodName })
    ).toBeVisible();
  });
});

async function openItemDetails(page: Page, displayName: string) {
  const itemHeading = page.getByRole("heading", {
    exact: true,
    level: 4,
    name: displayName
  });
  const details = itemHeading.locator("xpath=ancestor::details[1]");

  if ((await details.getAttribute("open")) === null) {
    await itemHeading.click();
  }

  await expect(details).toHaveAttribute("open", "");
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email ?? "");
  await page.getByLabel("Password").fill(password ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(
    /\/dashboard|\/plan-week|\/recipes|\/pantry|\/grocery-list|\/settings/
  );
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
