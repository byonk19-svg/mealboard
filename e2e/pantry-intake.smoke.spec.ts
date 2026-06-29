import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

const dbContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";
const fixture = {
  categoryId: "00000000-0000-4000-8000-000000010201",
  email: "mealboard-e2e-pantry-intake@example.test",
  foodBeansId: "00000000-0000-4000-8000-000000010301",
  foodRiceId: "00000000-0000-4000-8000-000000010302",
  groceryListId: "00000000-0000-4000-8000-000000010101",
  groceryListItemBeansId: "00000000-0000-4000-8000-000000010401",
  groceryListItemRiceId: "00000000-0000-4000-8000-000000010402",
  householdId: "00000000-0000-4000-8000-000000010001",
  password: "Mealboard-e2e-pantry-intake-12345!"
};

test.describe("Pantry intake review", () => {
  test.setTimeout(180_000);

  test("confirms and skips completed grocery intake candidates", async ({
    page
  }) => {
    seedPantryIntakeFixture();

    await signIn(page);
    await page.goto(`/grocery-list?listId=${fixture.groceryListId}`);
    await expect(
      page.getByRole("heading", { name: "Pantry intake review" })
    ).toBeVisible();

    const reviewSection = page
      .getByRole("heading", { name: "Pantry intake review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      reviewSection.getByRole("heading", { name: "E2E Intake beans" })
    ).toBeVisible();
    await reviewSection
      .getByLabel("Pantry display name")
      .fill("E2E Intake beans stock");
    await reviewSection.getByLabel("Storage location").fill("Smoke shelf");
    await reviewSection.getByLabel("Note").fill("Confirmed in browser smoke");
    await reviewSection
      .getByRole("button", { name: "Confirm and create pantry item" })
      .click();
    await expect(page.getByText("Pantry item created.")).toBeVisible();

    const nextReviewSection = page
      .getByRole("heading", { name: "Pantry intake review" })
      .locator("xpath=ancestor::section[1]");
    await expect(
      nextReviewSection.getByRole("heading", { name: "E2E Intake rice" })
    ).toBeVisible();
    await nextReviewSection.getByRole("button", { name: "Skip this item" }).click();
    await expect(page.getByText("Item skipped.")).toBeVisible();
    await expect(
      page.getByText("No pantry intake candidates in this completed list.")
    ).toBeVisible();

    expect(readIntakeFixtureResult()).toEqual({
      beansDecisionActorMatches: "true",
      beansDecisionCount: "1",
      beansPantryCount: "1",
      grocerySourceCount: "2",
      riceDecisionActorMatches: "true",
      riceDecisionCount: "1",
      unchangedGroceryItemCount: "2"
    });
  });
});

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(
    /\/dashboard|\/plan-week|\/recipes|\/pantry|\/grocery-list|\/settings/
  );
}

function seedPantryIntakeFixture() {
  runLocalSql(`
insert into public.households (id, name)
values (${sqlString(fixture.householdId)}, 'Pantry Intake E2E Household')
on conflict (id) do update set name = excluded.name;

delete from public.pantry_intake_decisions
where household_id = ${sqlString(fixture.householdId)};

delete from public.pantry_items
where household_id = ${sqlString(fixture.householdId)};

delete from public.grocery_item_sources
where household_id = ${sqlString(fixture.householdId)};

delete from public.grocery_list_items
where household_id = ${sqlString(fixture.householdId)};

delete from public.grocery_lists
where household_id = ${sqlString(fixture.householdId)};

delete from public.foods
where household_id = ${sqlString(fixture.householdId)};

insert into public.grocery_categories (id, household_id, name, sort_order)
values (
  ${sqlString(fixture.categoryId)},
  ${sqlString(fixture.householdId)},
  'Pantry intake smoke',
  10
)
on conflict (id) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

insert into public.foods (id, household_id, name, default_grocery_category_id)
values
  (
    ${sqlString(fixture.foodBeansId)},
    ${sqlString(fixture.householdId)},
    'E2E Intake beans',
    ${sqlString(fixture.categoryId)}
  ),
  (
    ${sqlString(fixture.foodRiceId)},
    ${sqlString(fixture.householdId)},
    'E2E Intake rice',
    ${sqlString(fixture.categoryId)}
  );

insert into public.grocery_lists (
  id,
  household_id,
  name,
  status,
  generated_at,
  finalized_at,
  shopping_started_at,
  completed_at
)
values (
  ${sqlString(fixture.groceryListId)},
  ${sqlString(fixture.householdId)},
  'Pantry intake completed groceries',
  'completed',
  now(),
  now(),
  now(),
  now()
);

insert into public.grocery_list_items (
  id,
  household_id,
  grocery_list_id,
  food_id,
  grocery_category_id,
  display_name,
  quantity,
  unit,
  preferred_quantity_text,
  checked,
  already_have,
  sort_order
)
values
  (
    ${sqlString(fixture.groceryListItemBeansId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(fixture.groceryListId)},
    ${sqlString(fixture.foodBeansId)},
    ${sqlString(fixture.categoryId)},
    'E2E Intake beans',
    2,
    'cans',
    '2 cans',
    true,
    false,
    0
  ),
  (
    ${sqlString(fixture.groceryListItemRiceId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(fixture.groceryListId)},
    ${sqlString(fixture.foodRiceId)},
    ${sqlString(fixture.categoryId)},
    'E2E Intake rice',
    1,
    'bag',
    '1 bag',
    true,
    false,
    1
  );

insert into public.grocery_item_sources (
  household_id,
  grocery_list_item_id,
  source_type,
  source_label
)
values
  (
    ${sqlString(fixture.householdId)},
    ${sqlString(fixture.groceryListItemBeansId)},
    'manual_add',
    'Browser smoke beans'
  ),
  (
    ${sqlString(fixture.householdId)},
    ${sqlString(fixture.groceryListItemRiceId)},
    'manual_add',
    'Browser smoke rice'
  );
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

function readIntakeFixtureResult() {
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
    from public.pantry_intake_decisions
    where grocery_list_item_id = ${sqlString(fixture.groceryListItemBeansId)}
      and status = 'confirmed'
      and created_pantry_item_id is not null
  ) as beans_decision_count,
  (
    select (decisions.decided_by_user_id = users.id)::text
    from public.pantry_intake_decisions decisions
    join auth.users users
      on lower(users.email) = lower(${sqlString(fixture.email)})
    where decisions.grocery_list_item_id = ${sqlString(fixture.groceryListItemBeansId)}
  ) as beans_decision_actor_matches,
  (
    select count(*)
    from public.pantry_items
    where household_id = ${sqlString(fixture.householdId)}
      and food_id = ${sqlString(fixture.foodBeansId)}
      and display_name = 'E2E Intake beans stock'
  ) as beans_pantry_count,
  (
    select count(*)
    from public.pantry_intake_decisions
    where grocery_list_item_id = ${sqlString(fixture.groceryListItemRiceId)}
      and status = 'skipped'
      and created_pantry_item_id is null
  ) as rice_decision_count,
  (
    select (decisions.decided_by_user_id = users.id)::text
    from public.pantry_intake_decisions decisions
    join auth.users users
      on lower(users.email) = lower(${sqlString(fixture.email)})
    where decisions.grocery_list_item_id = ${sqlString(fixture.groceryListItemRiceId)}
  ) as rice_decision_actor_matches,
  (
    select count(*)
    from public.grocery_list_items
    where household_id = ${sqlString(fixture.householdId)}
      and checked = true
      and already_have = false
  ) as unchanged_grocery_item_count,
  (
    select count(*)
    from public.grocery_item_sources
    where household_id = ${sqlString(fixture.householdId)}
  ) as grocery_source_count;
`,
      stdio: ["pipe", "pipe", "inherit"]
    }
  )
    .toString()
    .trim();
  const [
    beansDecisionCount,
    beansDecisionActorMatches,
    beansPantryCount,
    riceDecisionCount,
    riceDecisionActorMatches,
    unchangedGroceryItemCount,
    grocerySourceCount
  ] = output.split(",");

  return {
    beansDecisionActorMatches,
    beansDecisionCount,
    beansPantryCount,
    grocerySourceCount,
    riceDecisionActorMatches,
    riceDecisionCount,
    unchangedGroceryItemCount
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
