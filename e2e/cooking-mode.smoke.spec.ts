import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

const dbContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";
const fixture = {
  email: "mealboard-e2e-cooking-mode@example.test",
  householdId: "00000000-0000-4000-8000-000000011001",
  password: "Mealboard-e2e-cooking-mode-12345!"
};

test.describe("Cooking Mode", () => {
  test.setTimeout(240_000);

  test("reviews steps, cooks, persists progress, uses timers, and completes", async ({
    page
  }) => {
    seedCookingModeFixture();
    const recipeName = `E2E Cooking Wrap ${Date.now()}`;
    const recipeUrl = await createRecipeWithReviewedSteps(page, recipeName);
    const recipeId = getRecipeIdFromUrl(recipeUrl);

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
    expect(readCookingFixtureResult(recipeId)).toEqual({
      canceledTimerCount: "1",
      completedSessionCount: "1",
      completedStepCount: "1",
      dismissedTimerCount: "1",
      groceryItemSourceCount: "0",
      groceryListCount: "0",
      groceryListItemCount: "0",
      pantryConsumptionDecisionCount: "0",
      pantryIntakeDecisionCount: "0",
      pantryItemCount: "0",
      readyIngredientCount: "1",
      recipeReviewCount: "1",
      recipeTriedCount: "1"
    });
  });

  test("keeps the cooking checklist usable at mobile width", async ({ page }) => {
    seedCookingModeFixture();
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
  await page.getByLabel("Email").fill(fixture.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard|\/plan-week|\/recipes|\/grocery-list|\/settings/);
}

function seedCookingModeFixture() {
  runLocalSql(`
insert into public.households (id, name)
values (${sqlString(fixture.householdId)}, 'Cooking Mode E2E Household')
on conflict (id) do update set name = excluded.name;

delete from public.household_memberships
where user_id in (
  select id from auth.users where lower(email) = lower(${sqlString(fixture.email)})
);

delete from public.pantry_consumption_decisions
where household_id = ${sqlString(fixture.householdId)};

delete from public.pantry_intake_decisions
where household_id = ${sqlString(fixture.householdId)};

delete from public.pantry_events
where household_id = ${sqlString(fixture.householdId)};

delete from public.pantry_items
where household_id = ${sqlString(fixture.householdId)};

delete from public.grocery_item_sources
where household_id = ${sqlString(fixture.householdId)};

delete from public.grocery_list_items
where household_id = ${sqlString(fixture.householdId)};

delete from public.grocery_lists
where household_id = ${sqlString(fixture.householdId)};
`);

  execFileSync(process.execPath, ["scripts/bootstrap-local-e2e-user.mjs"], {
    env: {
      ...process.env,
      MEALBOARD_E2E_EMAIL: fixture.email,
      MEALBOARD_E2E_HOUSEHOLD_ID: fixture.householdId,
      MEALBOARD_E2E_PASSWORD: fixture.password
    },
    stdio: "inherit"
  });
}

function readCookingFixtureResult(recipeId: string) {
  const output = execFileSync(
    "docker",
    [
      "exec",
      "-i",
      dbContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-t",
      "-A",
      "-F",
      ","
    ],
    {
      input: `
with target_sessions as (
  select id
  from public.cooking_sessions
  where household_id = ${sqlString(fixture.householdId)}
    and recipe_id = ${sqlString(recipeId)}
)
select
  (
    select count(*)
    from public.cooking_sessions
    where household_id = ${sqlString(fixture.householdId)}
      and recipe_id = ${sqlString(recipeId)}
      and status = 'completed'
  ) as completed_session_count,
  (
    select count(*)
    from public.cooking_session_ingredients
    where household_id = ${sqlString(fixture.householdId)}
      and cooking_session_id in (select id from target_sessions)
      and is_ready = true
  ) as ready_ingredient_count,
  (
    select count(*)
    from public.cooking_session_steps
    where household_id = ${sqlString(fixture.householdId)}
      and cooking_session_id in (select id from target_sessions)
      and is_completed = true
  ) as completed_step_count,
  (
    select count(*)
    from public.cooking_timers
    where household_id = ${sqlString(fixture.householdId)}
      and cooking_session_id in (select id from target_sessions)
      and status = 'canceled'
  ) as canceled_timer_count,
  (
    select count(*)
    from public.cooking_timers
    where household_id = ${sqlString(fixture.householdId)}
      and cooking_session_id in (select id from target_sessions)
      and status = 'dismissed'
  ) as dismissed_timer_count,
  (
    select count(*)
    from public.recipe_reviews
    where household_id = ${sqlString(fixture.householdId)}
      and recipe_id = ${sqlString(recipeId)}
      and cooking_session_id in (select id from target_sessions)
  ) as recipe_review_count,
  (
    select count(*)
    from public.recipes
    where household_id = ${sqlString(fixture.householdId)}
      and id = ${sqlString(recipeId)}
      and status = 'tried'
  ) as recipe_tried_count,
  (
    select count(*)
    from public.pantry_items
    where household_id = ${sqlString(fixture.householdId)}
  ) as pantry_item_count,
  (
    select count(*)
    from public.pantry_intake_decisions
    where household_id = ${sqlString(fixture.householdId)}
  ) as pantry_intake_decision_count,
  (
    select count(*)
    from public.pantry_consumption_decisions
    where household_id = ${sqlString(fixture.householdId)}
  ) as pantry_consumption_decision_count,
  (
    select count(*)
    from public.grocery_lists
    where household_id = ${sqlString(fixture.householdId)}
  ) as grocery_list_count,
  (
    select count(*)
    from public.grocery_list_items
    where household_id = ${sqlString(fixture.householdId)}
  ) as grocery_list_item_count,
  (
    select count(*)
    from public.grocery_item_sources
    where household_id = ${sqlString(fixture.householdId)}
  ) as grocery_item_source_count;
`,
      stdio: ["pipe", "pipe", "inherit"]
    }
  )
    .toString()
    .trim();
  const [
    completedSessionCount,
    readyIngredientCount,
    completedStepCount,
    canceledTimerCount,
    dismissedTimerCount,
    recipeReviewCount,
    recipeTriedCount,
    pantryItemCount,
    pantryIntakeDecisionCount,
    pantryConsumptionDecisionCount,
    groceryListCount,
    groceryListItemCount,
    groceryItemSourceCount
  ] = output.split(",");

  return {
    canceledTimerCount,
    completedSessionCount,
    completedStepCount,
    dismissedTimerCount,
    groceryItemSourceCount,
    groceryListCount,
    groceryListItemCount,
    pantryConsumptionDecisionCount,
    pantryIntakeDecisionCount,
    pantryItemCount,
    readyIngredientCount,
    recipeReviewCount,
    recipeTriedCount
  };
}

function runLocalSql(sql: string) {
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      dbContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1"
    ],
    {
      input: `begin;\n${sql}\ncommit;\n`,
      stdio: ["pipe", "inherit", "inherit"]
    }
  );
}

function getRecipeIdFromUrl(recipeUrl: string) {
  const recipeId = new URL(recipeUrl).pathname.split("/").filter(Boolean).at(-1);

  if (!recipeId) {
    throw new Error(`Recipe id could not be parsed from ${recipeUrl}.`);
  }

  return recipeId;
}

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
