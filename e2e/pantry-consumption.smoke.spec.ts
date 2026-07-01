import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const dbContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";
const fixture = {
  email: "mealboard-e2e-pantry-consumption@example.test",
  householdId: "00000000-0000-4000-8000-000000012001",
  password: "Mealboard-e2e-pantry-consumption-12345!"
};

test.describe("Pantry consumption review", () => {
  test.setTimeout(180_000);

  test("confirms, applies, reverses, skips, and shows ineligible stock review", async ({
    page
  }) => {
    const seeded = seedPantryConsumptionFixture();
    const cookUrl = `/recipes/${seeded.recipeId}/cook?sessionId=${seeded.cookingSessionId}`;
    const pantryLotName = `E2E Consumption tortillas lot ${seeded.recipeId.slice(0, 8)}`;
    const cuminLotName = `E2E Consumption cumin lot ${seeded.recipeId.slice(0, 8)}`;

    await signIn(page);
    await page.goto(cookUrl);
    await expect(
      page.getByRole("heading", { name: "Completed session" })
    ).toBeVisible();

    const reviewSection = page
      .getByRole("heading", { name: "Pantry consumption review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      reviewSection.getByRole("heading", { name: "E2E Consumption tortillas" })
    ).toBeVisible();
    await reviewSection
      .getByLabel("Review note")
      .fill("Confirmed from browser smoke");
    await reviewSection
      .getByRole("button", { name: "Confirm consumption" })
      .click();
    await expect(page.getByText("Consumption confirmed.")).toBeVisible();

    const stockReviewSection = page
      .getByRole("heading", { name: "Pantry stock application review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      stockReviewSection.getByRole("heading", {
        name: "E2E Consumption tortillas"
      })
    ).toBeVisible();
    await expect(stockReviewSection.getByText("Confirmed, not applied")).toBeVisible();
    await expect(
      stockReviewSection.getByText("Pantry quantities change only after Apply.")
    ).toBeVisible();
    await expect(
      stockReviewSection.getByText(pantryLotName, { exact: true })
    ).toBeVisible();
    await stockReviewSection
      .getByLabel("Application note")
      .fill("Applied from browser smoke");
    await stockReviewSection
      .getByRole("button", { name: "Apply pantry stock" })
      .click();
    await expect(page.getByText("Pantry stock applied.")).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "Pantry stock application review" })
        .locator("xpath=ancestor::section[1]")
        .getByText("Applied", { exact: true })
    ).toBeVisible();

    await page.goto("/pantry");
    await expect(
      page.getByRole("heading", { exact: true, name: "Pantry" })
    ).toBeVisible();
    await expect(page.getByText(pantryLotName)).toBeVisible();
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: pantryLotName })
        .getByText("1 count", { exact: true })
    ).toBeVisible();

    await page.goto(cookUrl);
    const appliedStockReviewSection = page
      .getByRole("heading", { name: "Pantry stock application review" })
      .locator("xpath=ancestor::section[1]");
    await appliedStockReviewSection
      .getByLabel("Reversal note")
      .fill("Reversed from browser smoke");
    await appliedStockReviewSection
      .getByRole("button", { name: "Reverse pantry stock" })
      .click();
    await expect(page.getByText("Pantry stock reversal recorded.")).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "Pantry stock application review" })
        .locator("xpath=ancestor::section[1]")
        .getByText("Reversed", { exact: true })
    ).toBeVisible();

    await page.goto("/pantry");
    await expect(page.getByText(pantryLotName)).toBeVisible();
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: pantryLotName })
        .getByText("3 count", { exact: true })
    ).toBeVisible();

    await page.goto(cookUrl);
    const nextReviewSection = page
      .getByRole("heading", { name: "Pantry consumption review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      nextReviewSection.getByRole("heading", { name: "E2E Consumption salsa" })
    ).toBeVisible();
    await nextReviewSection
      .getByRole("button", { name: "Skip this ingredient" })
      .click();
    await expect(page.getByText("Consumption skipped.")).toBeVisible();

    const ineligibleReviewSection = page
      .getByRole("heading", { name: "Pantry consumption review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      ineligibleReviewSection.getByRole("heading", {
        name: "E2E Consumption cumin"
      })
    ).toBeVisible();
    await ineligibleReviewSection
      .getByRole("button", { name: "Confirm consumption" })
      .click();
    await expect(page.getByText("Consumption confirmed.")).toBeVisible();
    const manualReviewCard = page
      .getByRole("article")
      .filter({ hasText: "E2E Consumption cumin" });
    await expect(
      manualReviewCard.getByText(cuminLotName, { exact: true })
    ).toBeVisible();
    await expect(
      manualReviewCard.getByText(
        "No compatible pantry lot is auto-ready for this ingredient and unit."
      )
    ).toBeVisible();
    await expect(
      manualReviewCard.getByText("review quantity/unit details below")
    ).toBeVisible();
    await expect(
      manualReviewCard.getByRole("button", { name: "Apply pantry stock" })
    ).toBeVisible();

    const noLotReviewSection = page
      .getByRole("heading", { name: "Pantry consumption review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      noLotReviewSection.getByRole("heading", {
        name: "E2E Consumption oregano"
      })
    ).toBeVisible();
    await noLotReviewSection
      .getByRole("button", { name: "Confirm consumption" })
      .click();
    await expect(page.getByText("Consumption confirmed.")).toBeVisible();
    await expect(
      page.getByText("No pantry consumption candidates left.")
    ).toBeVisible();
    const noLotCard = page
      .getByRole("article")
      .filter({ hasText: "E2E Consumption oregano" });
    await expect(
      noLotCard.getByText(
        "No compatible pantry lot is auto-ready for this ingredient and unit."
      )
    ).toBeVisible();
    await expect(
      noLotCard.getByRole("button", { name: "Apply pantry stock" })
    ).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByText("No pantry consumption candidates left.")
    ).toBeVisible();
    await expect(page.getByText("Reversed", { exact: true })).toBeVisible();
    await expect(
      page
        .getByText("No compatible pantry lot is auto-ready for this ingredient and unit.")
        .first()
    ).toBeVisible();

    expect(readConsumptionFixtureResult(seeded)).toEqual({
      appliedStockApplicationCount: "1",
      appliedStockAllocationCount: "1",
      confirmedDecisionActorMatches: "true",
      confirmedDecisionCount: "3",
      groceryItemSourceCount: "0",
      groceryListCount: "0",
      groceryListItemCount: "0",
      pantryEventCount: "0",
      pantryItemDiscardedCount: "0",
      pantryItemOpen: "false",
      pantryItemQuantity: "3",
      pantryItemStatus: "in_stock",
      reversedStockAllocationCount: "1",
      reversedStockApplicationCount: "1",
      skippedDecisionActorMatches: "true",
      skippedDecisionCount: "1",
      unlinkedDecisionCount: "0"
    });
  });

  test("applies reviewed multi-lot allocation at mobile width", async ({
    page
  }) => {
    const seeded = seedPantryConsumptionFixture({ extraTortillaLot: true });
    const cookUrl = `/recipes/${seeded.recipeId}/cook?sessionId=${seeded.cookingSessionId}`;
    const uniqueSuffix = seeded.recipeId.slice(0, 8);
    const primaryLotName = `E2E Consumption tortillas lot ${uniqueSuffix}`;
    const backupLotName = `E2E Consumption tortillas backup lot ${uniqueSuffix}`;

    await page.setViewportSize({ height: 900, width: 390 });
    await signIn(page);
    await page.goto(cookUrl);
    await expect(
      page.getByRole("heading", { name: "Completed session" })
    ).toBeVisible();

    const reviewSection = page
      .getByRole("heading", { name: "Pantry consumption review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      reviewSection.getByRole("heading", { name: "E2E Consumption tortillas" })
    ).toBeVisible();
    await reviewSection
      .getByRole("button", { name: "Confirm consumption" })
      .click();
    await expect(page.getByText("Consumption confirmed.")).toBeVisible();

    const stockReviewSection = page
      .getByRole("heading", { name: "Pantry stock application review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      stockReviewSection.getByText(primaryLotName, { exact: true })
    ).toBeVisible();
    await expect(
      stockReviewSection.getByText(backupLotName, { exact: true })
    ).toBeVisible();
    await expect(
      stockReviewSection.getByRole("button", { name: "Apply reviewed allocation" })
    ).toBeVisible();

    await stockReviewSection.getByLabel(`Use from ${primaryLotName}`).fill("1");
    await stockReviewSection.getByLabel(`Use from ${backupLotName}`).fill("1");
    await stockReviewSection
      .getByLabel("Application note")
      .fill("Applied across two lots from mobile smoke");
    await stockReviewSection
      .getByRole("button", { name: "Apply reviewed allocation" })
      .click();
    await expect(page.getByText("Pantry stock applied.")).toBeVisible();

    await page.goto("/pantry");
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: primaryLotName })
        .getByText("2 count", { exact: true })
    ).toBeVisible();
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: backupLotName })
        .getByText("4 count", { exact: true })
    ).toBeVisible();

    expect(readConsumptionFixtureResult(seeded)).toMatchObject({
      appliedStockAllocationCount: "2",
      appliedStockApplicationCount: "1",
      confirmedDecisionCount: "1",
      pantryItemQuantity: "2",
      pantryItemStatus: "in_stock",
      reversedStockAllocationCount: "0",
      reversedStockApplicationCount: "0"
    });
    expect(readPantryItemQuantity(seeded.secondPantryItemId)).toBe("4");
  });
});

type SeededConsumptionFixture = {
  confirmedIngredientId: string;
  cookingSessionId: string;
  foodCuminId: string;
  foodOreganoId: string;
  foodSalsaId: string;
  foodTortillasId: string;
  ineligibleIngredientId: string;
  noLotIngredientId: string;
  pantryItemId: string;
  recipeId: string;
  recipeIngredientCuminId: string;
  recipeIngredientOreganoId: string;
  recipeIngredientSalsaId: string;
  recipeIngredientTortillasId: string;
  recipeStepId: string;
  secondPantryItemId: string;
  skippedIngredientId: string;
  unlinkedIngredientId: string;
};

type SeedPantryConsumptionFixtureOptions = {
  extraTortillaLot?: boolean;
};

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(
    /\/dashboard|\/plan-week|\/recipes|\/pantry|\/grocery-list|\/settings/
  );
}

function seedPantryConsumptionFixture(
  options: SeedPantryConsumptionFixtureOptions = {}
): SeededConsumptionFixture {
  const seeded = {
    confirmedIngredientId: randomUUID(),
    cookingSessionId: randomUUID(),
    foodCuminId: randomUUID(),
    foodOreganoId: randomUUID(),
    foodSalsaId: randomUUID(),
    foodTortillasId: randomUUID(),
    ineligibleIngredientId: randomUUID(),
    noLotIngredientId: randomUUID(),
    pantryItemId: randomUUID(),
    recipeId: randomUUID(),
    recipeIngredientCuminId: randomUUID(),
    recipeIngredientOreganoId: randomUUID(),
    recipeIngredientSalsaId: randomUUID(),
    recipeIngredientTortillasId: randomUUID(),
    recipeStepId: randomUUID(),
    secondPantryItemId: randomUUID(),
    skippedIngredientId: randomUUID(),
    unlinkedIngredientId: randomUUID()
  };
  const uniqueSuffix = seeded.recipeId.slice(0, 8);

  runLocalSql(`
insert into public.households (id, name)
values (${sqlString(fixture.householdId)}, 'Pantry Consumption E2E Household')
on conflict (id) do update set name = excluded.name;

delete from public.household_memberships
where user_id in (
  select id from auth.users where lower(email) = lower(${sqlString(fixture.email)})
);

insert into public.foods (id, household_id, name)
values
  (${sqlString(seeded.foodTortillasId)}, ${sqlString(fixture.householdId)}, ${sqlString(`E2E Consumption tortillas ${uniqueSuffix}`)}),
  (${sqlString(seeded.foodSalsaId)}, ${sqlString(fixture.householdId)}, ${sqlString(`E2E Consumption salsa ${uniqueSuffix}`)}),
  (${sqlString(seeded.foodCuminId)}, ${sqlString(fixture.householdId)}, ${sqlString(`E2E Consumption cumin ${uniqueSuffix}`)}),
  (${sqlString(seeded.foodOreganoId)}, ${sqlString(fixture.householdId)}, ${sqlString(`E2E Consumption oregano ${uniqueSuffix}`)});

insert into public.pantry_items (
  id,
  household_id,
  food_id,
  display_name,
  quantity,
  unit,
  stock_status,
  is_open
)
values (
  ${sqlString(seeded.pantryItemId)},
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.foodTortillasId)},
  ${sqlString(`E2E Consumption tortillas lot ${uniqueSuffix}`)},
  3,
  'count',
  'in_stock',
  false
);

insert into public.pantry_items (
  household_id,
  food_id,
  display_name,
  quantity,
  unit,
  stock_status,
  is_open
)
values (
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.foodCuminId)},
  ${sqlString(`E2E Consumption cumin lot ${uniqueSuffix}`)},
  4,
  'tbsp',
  'in_stock',
  false
);

${options.extraTortillaLot ? `
insert into public.pantry_items (
  id,
  household_id,
  food_id,
  display_name,
  quantity,
  unit,
  stock_status,
  is_open
)
values (
  ${sqlString(seeded.secondPantryItemId)},
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.foodTortillasId)},
  ${sqlString(`E2E Consumption tortillas backup lot ${uniqueSuffix}`)},
  5,
  'count',
  'in_stock',
  false
);
` : ""}

insert into public.recipes (
  id,
  household_id,
  name,
  status,
  meal_type,
  servings,
  instructions
)
values (
  ${sqlString(seeded.recipeId)},
  ${sqlString(fixture.householdId)},
  'E2E Consumption Wraps',
  'tried',
  'dinner',
  2,
  'Warm tortillas. Add salsa.'
);

insert into public.recipe_ingredients (
  id,
  household_id,
  recipe_id,
  food_id,
  display_name,
  quantity,
  unit,
  sort_order
)
values
  (
    ${sqlString(seeded.recipeIngredientTortillasId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.recipeId)},
    ${sqlString(seeded.foodTortillasId)},
    'E2E Consumption tortillas',
    2,
    'count',
    0
  ),
  (
    ${sqlString(seeded.recipeIngredientSalsaId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.recipeId)},
    ${sqlString(seeded.foodSalsaId)},
    'E2E Consumption salsa',
    1,
    'cup',
    1
  ),
  (
    ${sqlString(seeded.recipeIngredientCuminId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.recipeId)},
    ${sqlString(seeded.foodCuminId)},
    'E2E Consumption cumin',
    1,
    'tsp',
    2
  ),
  (
    ${sqlString(seeded.recipeIngredientOreganoId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.recipeId)},
    ${sqlString(seeded.foodOreganoId)},
    'E2E Consumption oregano',
    1,
    'tsp',
    3
  );

insert into public.recipe_steps (
  id,
  household_id,
  recipe_id,
  instruction,
  sort_order
)
values (
  ${sqlString(seeded.recipeStepId)},
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.recipeId)},
  'Assemble the wraps.',
  0
);

insert into public.cooking_sessions (
  id,
  household_id,
  recipe_id,
  status,
  recipe_name_snapshot,
  servings_snapshot,
  scale_factor_snapshot,
  recipe_updated_at_snapshot,
  started_at
)
values (
  ${sqlString(seeded.cookingSessionId)},
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.recipeId)},
  'active',
  'E2E Consumption Wraps',
  2,
  1,
  now(),
  now()
);

insert into public.cooking_session_ingredients (
  id,
  household_id,
  cooking_session_id,
  recipe_ingredient_id,
  food_id,
  display_name,
  quantity,
  unit,
  sort_order,
  is_ready,
  ready_at
)
values
  (
    ${sqlString(seeded.confirmedIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.cookingSessionId)},
    ${sqlString(seeded.recipeIngredientTortillasId)},
    ${sqlString(seeded.foodTortillasId)},
    'E2E Consumption tortillas',
    2,
    'count',
    0,
    true,
    now()
  ),
  (
    ${sqlString(seeded.skippedIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.cookingSessionId)},
    ${sqlString(seeded.recipeIngredientSalsaId)},
    ${sqlString(seeded.foodSalsaId)},
    'E2E Consumption salsa',
    1,
    'cup',
    1,
    true,
    now()
  ),
  (
    ${sqlString(seeded.ineligibleIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.cookingSessionId)},
    ${sqlString(seeded.recipeIngredientCuminId)},
    ${sqlString(seeded.foodCuminId)},
    'E2E Consumption cumin',
    1,
    'tsp',
    2,
    true,
    now()
  ),
  (
    ${sqlString(seeded.noLotIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.cookingSessionId)},
    ${sqlString(seeded.recipeIngredientOreganoId)},
    ${sqlString(seeded.foodOreganoId)},
    'E2E Consumption oregano',
    1,
    'tsp',
    3,
    true,
    now()
  ),
  (
    ${sqlString(seeded.unlinkedIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.cookingSessionId)},
    null,
    null,
    'E2E Consumption garnish',
    1,
    'pinch',
    4,
    true,
    now()
  );

insert into public.cooking_session_steps (
  household_id,
  cooking_session_id,
  recipe_step_id,
  instruction,
  sort_order,
  is_completed,
  completed_at
)
values (
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.cookingSessionId)},
  ${sqlString(seeded.recipeStepId)},
  'Assemble the wraps.',
  0,
  true,
  now()
);

update public.cooking_sessions
set status = 'completed',
    completed_at = now()
where id = ${sqlString(seeded.cookingSessionId)}
  and household_id = ${sqlString(fixture.householdId)};
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

  return seeded;
}

function readConsumptionFixtureResult(seeded: SeededConsumptionFixture) {
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
select
  (
    select count(*)
    from public.pantry_consumption_decisions
    where cooking_session_ingredient_id = ${sqlString(seeded.confirmedIngredientId)}
      and status = 'confirmed'
  ) + (
    select count(*)
    from public.pantry_consumption_decisions
    where cooking_session_ingredient_id = ${sqlString(seeded.ineligibleIngredientId)}
      and status = 'confirmed'
  ) + (
    select count(*)
    from public.pantry_consumption_decisions
    where cooking_session_ingredient_id = ${sqlString(seeded.noLotIngredientId)}
      and status = 'confirmed'
  ) as confirmed_decision_count,
  (
    select (decisions.decided_by_user_id = users.id)::text
    from public.pantry_consumption_decisions decisions
    join auth.users users
      on lower(users.email) = lower(${sqlString(fixture.email)})
    where decisions.cooking_session_ingredient_id = ${sqlString(seeded.confirmedIngredientId)}
  ) as confirmed_decision_actor_matches,
  (
    select count(*)
    from public.pantry_consumption_decisions
    where cooking_session_ingredient_id = ${sqlString(seeded.skippedIngredientId)}
      and status = 'skipped'
  ) as skipped_decision_count,
  (
    select (decisions.decided_by_user_id = users.id)::text
    from public.pantry_consumption_decisions decisions
    join auth.users users
      on lower(users.email) = lower(${sqlString(fixture.email)})
    where decisions.cooking_session_ingredient_id = ${sqlString(seeded.skippedIngredientId)}
  ) as skipped_decision_actor_matches,
  (
    select count(*)
    from public.pantry_consumption_decisions
    where cooking_session_ingredient_id = ${sqlString(seeded.unlinkedIngredientId)}
  ) as unlinked_decision_count,
  (
    select quantity::text
    from public.pantry_items
    where id = ${sqlString(seeded.pantryItemId)}
  ) as pantry_item_quantity,
  (
    select stock_status::text
    from public.pantry_items
    where id = ${sqlString(seeded.pantryItemId)}
  ) as pantry_item_status,
  (
    select is_open::text
    from public.pantry_items
    where id = ${sqlString(seeded.pantryItemId)}
  ) as pantry_item_open,
  (
    select count(*)
    from public.pantry_items
    where id = ${sqlString(seeded.pantryItemId)}
      and discarded_at is not null
  ) as pantry_item_discarded_count,
  (
    select count(*)
    from public.pantry_events
    where pantry_item_id = ${sqlString(seeded.pantryItemId)}
  ) as pantry_event_count,
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
  ) as grocery_item_source_count,
  (
    select count(*)
    from public.pantry_consumption_stock_applications applications
    join public.pantry_consumption_decisions decisions
      on decisions.id = applications.pantry_consumption_decision_id
    where decisions.cooking_session_ingredient_id = ${sqlString(seeded.confirmedIngredientId)}
  ) as applied_stock_application_count,
  (
    select count(*)
    from public.pantry_consumption_stock_application_allocations allocations
    join public.pantry_consumption_stock_applications applications
      on applications.id = allocations.stock_application_id
    join public.pantry_consumption_decisions decisions
      on decisions.id = applications.pantry_consumption_decision_id
    where decisions.cooking_session_ingredient_id = ${sqlString(seeded.confirmedIngredientId)}
  ) as applied_stock_allocation_count,
  (
    select count(*)
    from public.pantry_consumption_stock_application_reversals reversals
    join public.pantry_consumption_stock_applications applications
      on applications.id = reversals.stock_application_id
    join public.pantry_consumption_decisions decisions
      on decisions.id = applications.pantry_consumption_decision_id
    where decisions.cooking_session_ingredient_id = ${sqlString(seeded.confirmedIngredientId)}
  ) as reversed_stock_application_count,
  (
    select count(*)
    from public.pantry_consumption_stock_application_reversal_allocations reversal_allocations
    join public.pantry_consumption_stock_application_reversals reversals
      on reversals.id = reversal_allocations.stock_application_reversal_id
    join public.pantry_consumption_stock_applications applications
      on applications.id = reversals.stock_application_id
    join public.pantry_consumption_decisions decisions
      on decisions.id = applications.pantry_consumption_decision_id
    where decisions.cooking_session_ingredient_id = ${sqlString(seeded.confirmedIngredientId)}
  ) as reversed_stock_allocation_count;
`,
      stdio: ["pipe", "pipe", "inherit"]
    }
  )
    .toString()
    .trim();
  const [
    confirmedDecisionCount,
    confirmedDecisionActorMatches,
    skippedDecisionCount,
    skippedDecisionActorMatches,
    unlinkedDecisionCount,
    pantryItemQuantity,
    pantryItemStatus,
    pantryItemOpen,
    pantryItemDiscardedCount,
    pantryEventCount,
    groceryListCount,
    groceryListItemCount,
    groceryItemSourceCount,
    appliedStockApplicationCount,
    appliedStockAllocationCount,
    reversedStockApplicationCount,
    reversedStockAllocationCount
  ] = output.split(",");

  return {
    confirmedDecisionActorMatches,
    confirmedDecisionCount,
    groceryItemSourceCount,
    groceryListCount,
    groceryListItemCount,
    pantryEventCount,
    pantryItemDiscardedCount,
    pantryItemOpen,
    pantryItemQuantity,
    pantryItemStatus,
    appliedStockApplicationCount,
    appliedStockAllocationCount,
    reversedStockApplicationCount,
    reversedStockAllocationCount,
    skippedDecisionActorMatches,
    skippedDecisionCount,
    unlinkedDecisionCount
  };
}

function readPantryItemQuantity(pantryItemId: string) {
  return execFileSync(
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
      "-A"
    ],
    {
      input: `
select quantity::text
from public.pantry_items
where id = ${sqlString(pantryItemId)};
`,
      stdio: ["pipe", "pipe", "inherit"]
    }
  )
    .toString()
    .trim();
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

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
