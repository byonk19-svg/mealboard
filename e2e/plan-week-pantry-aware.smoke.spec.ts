import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const dbContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";
const fixture = {
  email: "mealboard-e2e-pantry-aware@example.test",
  householdId: "00000000-0000-4000-8000-000000017001",
  password: "Mealboard-e2e-pantry-aware-12345!"
};

test.describe("Pantry-aware planning suggestions", () => {
  test.setTimeout(180_000);

  test("surfaces and persists use-soon pantry suggestion labels", async ({
    page
  }) => {
    const seeded = seedPantryAwarePlanningFixture();

    await signIn(page);
    await page.goto(`/plan-week?weekStartDate=${seeded.weekStartDate}`);

    const suggestionsSection = page
      .getByRole("heading", { name: "Rule-based suggestions" })
      .locator("xpath=ancestor::section[1]");
    const firstSuggestion = suggestionsSection.getByRole("article").first();

    await expect(firstSuggestion.getByRole("heading", { level: 3 })).toHaveText(
      seeded.pantryRecipeName
    );
    await expect(firstSuggestion.getByText("Uses pantry soon")).toBeVisible();

    await suggestionsSection
      .getByRole("button", { name: "Add suggested meals" })
      .click();
    await expect(page.getByText("Added")).toBeVisible();

    const plannedMeal = page.getByRole("article", {
      name: `Planned meal ${seeded.pantryRecipeName}`
    }).first();
    await expect(plannedMeal).toBeVisible();
    await expect(
      plannedMeal.locator("span", { hasText: "Uses pantry soon" })
    ).toBeVisible();
    await expect(plannedMeal.getByText("Needs approval")).toBeVisible();
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

function seedPantryAwarePlanningFixture() {
  const seeded = {
    categoryId: randomUUID(),
    pantryFoodId: randomUUID(),
    pantryItemId: randomUUID(),
    pantryRecipeId: randomUUID(),
    pantryRecipeIngredientId: randomUUID(),
    profileId: randomUUID(),
    tieFoodId: randomUUID(),
    tieRecipeId: randomUUID(),
    tieRecipeIngredientId: randomUUID(),
    weeklyPlanId: randomUUID(),
    weekStartDate: getCurrentSundayDateKey()
  };
  const uniqueSuffix = seeded.weeklyPlanId.slice(0, 8);
  const pantryFoodName = `E2E Pantry-aware beans ${uniqueSuffix}`;
  const pantryRecipeName = `E2E Pantry-aware Beta ${uniqueSuffix}`;
  const tieRecipeName = `E2E Pantry-aware Alpha ${uniqueSuffix}`;

  runLocalSql(`
delete from public.household_memberships
where household_id = ${sqlString(fixture.householdId)}
   or user_id in (
     select id from auth.users where lower(email) = lower(${sqlString(fixture.email)})
   );

delete from public.households
where id = ${sqlString(fixture.householdId)};

insert into public.households (id, name)
values (${sqlString(fixture.householdId)}, 'Pantry-aware Planning E2E Household');

insert into public.meal_profiles (
  id,
  household_id,
  name,
  profile_type,
  sort_order
)
values (
  ${sqlString(seeded.profileId)},
  ${sqlString(fixture.householdId)},
  'Brianna',
  'adult',
  0
);

insert into public.grocery_categories (id, household_id, name, sort_order)
values (
  ${sqlString(seeded.categoryId)},
  ${sqlString(fixture.householdId)},
  'Pantry-aware planning',
  10
);

insert into public.foods (id, household_id, name, default_grocery_category_id)
values
  (
    ${sqlString(seeded.pantryFoodId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(pantryFoodName)},
    ${sqlString(seeded.categoryId)}
  ),
  (
    ${sqlString(seeded.tieFoodId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(`E2E Tie food ${uniqueSuffix}`)},
    ${sqlString(seeded.categoryId)}
  );

insert into public.pantry_items (
  id,
  household_id,
  food_id,
  display_name,
  quantity,
  unit,
  stock_status,
  expiration_date,
  is_open
)
values (
  ${sqlString(seeded.pantryItemId)},
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.pantryFoodId)},
  ${sqlString(`${pantryFoodName} lot`)},
  1,
  'can',
  'in_stock',
  ${sqlString(getDateOffset(2))},
  false
);

insert into public.recipes (
  id,
  household_id,
  name,
  status,
  meal_type,
  servings,
  estimated_calories_per_serving,
  estimated_protein_grams_per_serving,
  nutrition_confidence
)
values
  (
    ${sqlString(seeded.tieRecipeId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(tieRecipeName)},
    'approved',
    'dinner',
    2,
    450,
    24,
    'medium'
  ),
  (
    ${sqlString(seeded.pantryRecipeId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(pantryRecipeName)},
    'approved',
    'dinner',
    2,
    450,
    24,
    'medium'
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
    ${sqlString(seeded.tieRecipeIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.tieRecipeId)},
    ${sqlString(seeded.tieFoodId)},
    'Tie ingredient',
    1,
    'count',
    0
  ),
  (
    ${sqlString(seeded.pantryRecipeIngredientId)},
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.pantryRecipeId)},
    ${sqlString(seeded.pantryFoodId)},
    ${sqlString(pantryFoodName)},
    1,
    'can',
    0
  );

insert into public.recipe_profile_approvals (
  household_id,
  recipe_id,
  meal_profile_id,
  status,
  rating,
  approved_for_planning
)
values
  (
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.tieRecipeId)},
    ${sqlString(seeded.profileId)},
    'approved',
    'like',
    true
  ),
  (
    ${sqlString(fixture.householdId)},
    ${sqlString(seeded.pantryRecipeId)},
    ${sqlString(seeded.profileId)},
    'approved',
    'like',
    true
  );

insert into public.weekly_plans (id, household_id, week_start_date, status)
values (
  ${sqlString(seeded.weeklyPlanId)},
  ${sqlString(fixture.householdId)},
  ${sqlString(seeded.weekStartDate)},
  'draft'
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

  return {
    pantryRecipeName,
    tieRecipeName,
    weekStartDate: seeded.weekStartDate
  };
}

function getCurrentSundayDateKey() {
  const date = new Date();
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getDateOffset(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
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
