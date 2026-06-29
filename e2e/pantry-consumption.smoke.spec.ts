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

  test("confirms and skips completed cooking consumption candidates", async ({
    page
  }) => {
    const seeded = seedPantryConsumptionFixture();

    await signIn(page);
    await page.goto(
      `/recipes/${seeded.recipeId}/cook?sessionId=${seeded.cookingSessionId}`
    );
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
    await expect(
      page.getByText("No pantry consumption candidates left.")
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByText("No pantry consumption candidates left.")
    ).toBeVisible();

    expect(readConsumptionFixtureResult(seeded)).toEqual({
      confirmedDecisionCount: "1",
      groceryItemSourceCount: "0",
      groceryListCount: "0",
      groceryListItemCount: "0",
      pantryEventCount: "0",
      pantryItemDiscardedCount: "0",
      pantryItemOpen: "false",
      pantryItemQuantity: "3",
      pantryItemStatus: "in_stock",
      skippedDecisionCount: "1",
      unlinkedDecisionCount: "0"
    });
  });
});

type SeededConsumptionFixture = {
  confirmedIngredientId: string;
  cookingSessionId: string;
  foodPantryId: string;
  foodSalsaId: string;
  foodTortillasId: string;
  pantryItemId: string;
  recipeId: string;
  recipeIngredientSalsaId: string;
  recipeIngredientTortillasId: string;
  recipeStepId: string;
  skippedIngredientId: string;
  unlinkedIngredientId: string;
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

function seedPantryConsumptionFixture(): SeededConsumptionFixture {
  const seeded = {
    confirmedIngredientId: randomUUID(),
    cookingSessionId: randomUUID(),
    foodPantryId: randomUUID(),
    foodSalsaId: randomUUID(),
    foodTortillasId: randomUUID(),
    pantryItemId: randomUUID(),
    recipeId: randomUUID(),
    recipeIngredientSalsaId: randomUUID(),
    recipeIngredientTortillasId: randomUUID(),
    recipeStepId: randomUUID(),
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
  (${sqlString(seeded.foodPantryId)}, ${sqlString(fixture.householdId)}, ${sqlString(`E2E Consumption pantry stock ${uniqueSuffix}`)}),
  (${sqlString(seeded.foodTortillasId)}, ${sqlString(fixture.householdId)}, ${sqlString(`E2E Consumption tortillas ${uniqueSuffix}`)}),
  (${sqlString(seeded.foodSalsaId)}, ${sqlString(fixture.householdId)}, ${sqlString(`E2E Consumption salsa ${uniqueSuffix}`)});

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
  ${sqlString(seeded.foodPantryId)},
  'E2E Consumption pantry lot',
  3,
  'count',
  'in_stock',
  false
);

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
    ${sqlString(seeded.unlinkedIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.cookingSessionId)},
    null,
    null,
    'E2E Consumption garnish',
    1,
    'pinch',
    2,
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
  ) as confirmed_decision_count,
  (
    select count(*)
    from public.pantry_consumption_decisions
    where cooking_session_ingredient_id = ${sqlString(seeded.skippedIngredientId)}
      and status = 'skipped'
  ) as skipped_decision_count,
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
  ) as grocery_item_source_count;
`,
      stdio: ["pipe", "pipe", "inherit"]
    }
  )
    .toString()
    .trim();
  const [
    confirmedDecisionCount,
    skippedDecisionCount,
    unlinkedDecisionCount,
    pantryItemQuantity,
    pantryItemStatus,
    pantryItemOpen,
    pantryItemDiscardedCount,
    pantryEventCount,
    groceryListCount,
    groceryListItemCount,
    groceryItemSourceCount
  ] = output.split(",");

  return {
    confirmedDecisionCount,
    groceryItemSourceCount,
    groceryListCount,
    groceryListItemCount,
    pantryEventCount,
    pantryItemDiscardedCount,
    pantryItemOpen,
    pantryItemQuantity,
    pantryItemStatus,
    skippedDecisionCount,
    unlinkedDecisionCount
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

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
