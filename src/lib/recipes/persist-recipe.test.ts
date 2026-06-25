import { describe, expect, it } from "vitest";
import {
  persistCreatedRecipeWithChildren,
  replaceRecipeChildren,
  type RecipePersistenceClient
} from "./persist-recipe";

describe("persistCreatedRecipeWithChildren", () => {
  it("cleans up the parent recipe when child persistence fails", async () => {
    const supabase = createFakeRecipeClient({
      failInsertTable: "recipe_tags",
      recipeId: "recipe-1"
    });

    const result = await persistCreatedRecipeWithChildren({
      approvedProfileIds: [],
      householdId: "household-1",
      ingredients: [
        {
          display_name: "rice",
          food_id: null,
          grocery_category_id: null,
          notes: null,
          optional: false,
          preparation: null,
          quantity: 1,
          sort_order: 0,
          unit: "cup"
        }
      ],
      recipePayload: { meal_type: "dinner", name: "Broken Import", status: "idea" },
      status: "idea",
      supabase: supabase as unknown as RecipePersistenceClient,
      tags: ["weeknight"]
    });

    expect(result).toEqual({
      error: "recipe_tags insert failed",
      ok: false
    });
    expect(supabase.operations).toContainEqual({
      filters: [
        ["household_id", "household-1"],
        ["id", "recipe-1"]
      ],
      table: "recipes",
      type: "delete"
    });
  });

  it("returns the created recipe id when parent and children persist", async () => {
    const supabase = createFakeRecipeClient({ recipeId: "recipe-2" });

    await expect(
      persistCreatedRecipeWithChildren({
        approvedProfileIds: ["profile-1"],
        householdId: "household-1",
        ingredients: [
          {
            display_name: "beans",
            food_id: null,
            grocery_category_id: null,
            notes: null,
            optional: false,
            preparation: null,
            quantity: 1,
            sort_order: 0,
            unit: "cup"
          }
        ],
        recipePayload: { meal_type: "dinner", name: "Bean Bowl", status: "approved" },
        status: "approved",
        supabase: supabase as unknown as RecipePersistenceClient,
        tags: ["safe_default"]
      })
    ).resolves.toEqual({ ok: true, recipeId: "recipe-2" });
  });
});

describe("replaceRecipeChildren", () => {
  it("reports child insert failures instead of redirecting", async () => {
    const supabase = createFakeRecipeClient({
      failInsertTable: "recipe_profile_approvals",
      recipeId: "recipe-3"
    });

    await expect(
      replaceRecipeChildren({
        approvedProfileIds: ["profile-1"],
        householdId: "household-1",
        ingredients: [
          {
            display_name: "chicken",
            food_id: null,
            grocery_category_id: null,
            notes: null,
            optional: false,
            preparation: null,
            quantity: 1,
            sort_order: 0,
            unit: "lb"
          }
        ],
        recipeId: "recipe-3",
        status: "approved",
        supabase: supabase as unknown as RecipePersistenceClient,
        tags: []
      })
    ).resolves.toEqual("recipe_profile_approvals insert failed");
  });
});

type FakeTable =
  | "recipes"
  | "recipe_ingredients"
  | "recipe_tags"
  | "recipe_profile_approvals";

function createFakeRecipeClient({
  failInsertTable,
  recipeId
}: {
  failInsertTable?: FakeTable;
  recipeId: string;
}) {
  const operations: Array<{
    filters?: Array<[string, string]>;
    payload?: unknown;
    table: string;
    type: "delete" | "insert";
  }> = [];

  return {
    operations,
    from(table: FakeTable) {
      return {
        delete() {
          const filters: Array<[string, string]> = [];
          const query = {
            eq(field: string, value: string) {
              filters.push([field, value]);
              return query;
            },
            then(resolve: (value: { error: null }) => void) {
              operations.push({ filters, table, type: "delete" });
              resolve({ error: null });
            }
          };

          return query;
        },
        insert(payload: unknown) {
          operations.push({ payload, table, type: "insert" });

          if (table === "recipes") {
            return {
              select() {
                return {
                  async single() {
                    return { data: { id: recipeId }, error: null };
                  }
                };
              }
            };
          }

          return Promise.resolve({
            error:
              table === failInsertTable
                ? { message: `${table} insert failed` }
                : null
          });
        }
      };
    }
  };
}
