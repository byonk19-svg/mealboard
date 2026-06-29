import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addPantryRestockCandidateToGroceryListWithClient,
  applyPantryConsumptionStockWithClient,
  confirmPantryConsumptionCandidateWithClient,
  confirmPantryIntakeCandidateWithClient,
  getPantryConsumptionCandidatesWithClient,
  getPantryIntakeCandidatesWithClient,
  getPantryUseSoonSignalsWithClient,
  skipPantryConsumptionCandidateWithClient,
  skipPantryIntakeCandidateWithClient
} from "./data";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

type GroceryListRow = {
  completed_at: string | null;
  created_at: string;
  household_id: string;
  id: string;
  name: string | null;
  status: "draft" | "finalized" | "shopping_started" | "completed";
  weekly_plans: { week_start_date: string | null } | null;
};

type GroceryListItemRow = {
  already_have: boolean;
  checked: boolean;
  display_name: string;
  food_id: string | null;
  foods?: { name: string } | null;
  grocery_categories?: { name: string } | null;
  grocery_category_id?: string | null;
  grocery_list_id: string;
  household_id: string;
  id: string;
  manual_item?: boolean;
  preferred_quantity_text?: string | null;
  quantity?: number | null;
  sort_order: number;
  unit?: string | null;
};

type GroceryItemSourceRow = {
  grocery_list_item_id: string;
  household_id: string;
  meal_profiles?: { name: string } | null;
  meal_profile_id: string | null;
  notes: string | null;
  quantity: number | string | null;
  source_id: string | null;
  source_label: string | null;
  source_type: string;
  unit: string | null;
};

type PantryItemRow = Record<string, unknown> & {
  discarded_at: string | null;
  food_id: string;
  household_id: string;
  id: string;
  quantity: number | string | null;
  stock_status: string;
  unit: string | null;
  updated_at: string;
};

type PantryIntakeDecisionRow = {
  created_pantry_item_id: string | null;
  grocery_list_item_id: string;
  household_id: string;
  note?: string | null;
  status: "confirmed" | "skipped";
};

type CookingSessionRow = {
  completed_at: string | null;
  created_at: string;
  household_id: string;
  id: string;
  recipe_id: string;
  recipe_name_snapshot: string;
  scale_factor_snapshot: number;
  servings_snapshot: number | null;
  started_at: string;
  status: "active" | "paused" | "completed" | "abandoned";
};

type CookingSessionIngredientRow = {
  cooking_session_id: string;
  display_name: string;
  food_id: string | null;
  foods?: { name: string } | null;
  household_id: string;
  id: string;
  is_ready: boolean;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | string | null;
  ready_at: string | null;
  sort_order: number;
  unit: string | null;
};

type PantryConsumptionDecisionRow = {
  id?: string;
  cooking_session_ingredient_id: string;
  household_id: string;
  note?: string | null;
  status: "confirmed" | "skipped";
};

type PantryConsumptionStockApplicationRow = {
  applied_quantity: number;
  applied_unit: string;
  household_id: string;
  id: string;
  note?: string | null;
  pantry_consumption_decision_id: string;
};

type PantryConsumptionStockApplicationAllocationRow = {
  applied_quantity: number;
  household_id: string;
  id: string;
  pantry_item_id: string;
  pantry_quantity_after: number;
  pantry_quantity_before: number;
  stock_application_id: string;
  unit: string;
};

type PantryConsumptionStockApplicationReversalRow = {
  household_id: string;
  id: string;
  stock_application_id: string;
};

describe("addPantryRestockCandidateToGroceryListWithClient", () => {
  it("adds one pantry restock item and source without mutating pantry state or events", async () => {
    const fake = createFakeSupabase({
      groceryLists: [groceryListRow({ status: "finalized" })],
      groceryListItems: [],
      pantryItems: [
        pantryItemRow({
          grocery_category_id: null,
          stock_status: "low"
        })
      ]
    });

    await expect(
      addPantryRestockCandidateToGroceryListWithClient({
        householdId: "household-1",
        pantryItemId: "pantry-item-1",
        supabase: fake.client
      })
    ).resolves.toEqual({
      groceryListId: "list-1",
      groceryListItemId: "inserted-grocery-item-1",
      status: "added"
    });

    expect(fake.state.groceryListItems).toContainEqual(
      expect.objectContaining({
        display_name: "Black beans",
        food_id: "food-beans",
        grocery_category_id: "food-default-category",
        grocery_list_id: "list-1",
        manual_item: true,
        preferred_quantity_text: null,
        quantity: null,
        sort_order: 0,
        unit: null
      })
    );
    expect(fake.state.groceryItemSources).toEqual([
      expect.objectContaining({
        grocery_list_item_id: "inserted-grocery-item-1",
        meal_profile_id: "profile-shared",
        notes: "Pantry status: low",
        quantity: null,
        source_id: "pantry-item-1",
        source_label: "Restock: Black beans",
        source_type: "pantry_restock",
        unit: null
      })
    ]);
    expect(fake.operations).not.toContain("pantry_items:update");
    expect(fake.operations).not.toContain("pantry_events:insert");
  });

  it("returns the existing grocery item when the same food is already on the editable list", async () => {
    const fake = createFakeSupabase({
      groceryLists: [groceryListRow()],
      groceryListItems: [
        groceryListItemRow({
          food_id: "food-beans",
          id: "existing-beans"
        })
      ],
      pantryItems: [pantryItemRow({ stock_status: "out" })]
    });

    await expect(
      addPantryRestockCandidateToGroceryListWithClient({
        householdId: "household-1",
        pantryItemId: "pantry-item-1",
        supabase: fake.client
      })
    ).resolves.toEqual({
      groceryListId: "list-1",
      groceryListItemId: "existing-beans",
      status: "already_on_grocery_list"
    });

    expect(fake.operations).not.toContain("grocery_list_items:insert");
    expect(fake.state.groceryItemSources).toEqual([]);
  });

  it("rejects when no editable grocery list exists", async () => {
    const fake = createFakeSupabase({
      groceryLists: [groceryListRow({ status: "completed" })],
      groceryListItems: [],
      pantryItems: [pantryItemRow({ stock_status: "out" })]
    });

    await expect(
      addPantryRestockCandidateToGroceryListWithClient({
        householdId: "household-1",
        pantryItemId: "pantry-item-1",
        supabase: fake.client
      })
    ).rejects.toThrow("No editable grocery list is available.");

    expect(fake.operations).not.toContain("grocery_list_items:insert");
  });

  it("rejects when the selected grocery list is completed before insert", async () => {
    const fake = createFakeSupabase({
      groceryLists: [groceryListRow({ status: "draft" })],
      groceryListItems: [],
      pantryItems: [pantryItemRow({ stock_status: "out" })],
      statusAfterCandidateRead: "completed"
    });

    await expect(
      addPantryRestockCandidateToGroceryListWithClient({
        householdId: "household-1",
        pantryItemId: "pantry-item-1",
        supabase: fake.client
      })
    ).rejects.toThrow("That grocery list is no longer editable.");

    expect(fake.operations).not.toContain("grocery_list_items:insert");
  });
});

describe("getPantryUseSoonSignalsWithClient", () => {
  it("derives use-soon signals from active pantry stock without writes", async () => {
    const fake = createFakeSupabase({
      groceryLists: [],
      groceryListItems: [],
      pantryItems: [
        pantryItemRow({
          display_name: "Black beans",
          expiration_date: "2026-06-30",
          food_id: "food-beans",
          id: "active-beans",
          stock_status: "in_stock"
        }),
        pantryItemRow({
          discarded_at: "2026-06-28T12:00:00Z",
          display_name: "Discarded beans",
          expiration_date: "2026-06-29",
          food_id: "food-beans",
          id: "discarded-beans",
          stock_status: "in_stock"
        }),
        pantryItemRow({
          display_name: "Empty tortillas",
          expiration_date: "2026-06-29",
          food_id: "food-tortillas",
          id: "out-tortillas",
          stock_status: "out"
        })
      ]
    });

    await expect(
      getPantryUseSoonSignalsWithClient({
        householdId: "household-1",
        supabase: fake.client,
        today: "2026-06-29"
      })
    ).resolves.toEqual([
      expect.objectContaining({
        foodId: "food-beans",
        pantryItemIds: ["active-beans"],
        reasonLabels: ["Use soon"],
        useByDate: "2026-06-30"
      })
    ]);
    expect(fake.operations).not.toContain("pantry_items:insert");
    expect(fake.operations).not.toContain("pantry_items:update");
    expect(fake.operations).not.toContain("pantry_items:delete");
    expect(fake.operations).not.toContain("pantry_events:insert");
  });
});

describe("pantry intake data functions", () => {
  it("reads candidates from completed grocery items and suppresses decided rows", async () => {
    const fake = createFakeSupabase({
      groceryItemSources: [
        groceryItemSourceRow({
          grocery_list_item_id: "eligible-item",
          source_label: "Chili"
        })
      ],
      groceryListItems: [
        groceryListItemRow({
          checked: true,
          grocery_list_id: "completed-list",
          id: "eligible-item"
        }),
        groceryListItemRow({
          checked: true,
          grocery_list_id: "completed-list",
          id: "decided-item"
        })
      ],
      groceryLists: [
        groceryListRow({
          completed_at: "2026-06-27T12:00:00Z",
          id: "completed-list",
          status: "completed"
        })
      ],
      pantryIntakeDecisions: [
        {
          created_pantry_item_id: null,
          grocery_list_item_id: "decided-item",
          household_id: "household-1",
          status: "skipped"
        }
      ],
      pantryItems: []
    });

    await expect(
      getPantryIntakeCandidatesWithClient({
        groceryListId: "completed-list",
        householdId: "household-1",
        supabase: fake.client
      })
    ).resolves.toEqual([
      expect.objectContaining({
        groceryListItemId: "eligible-item",
        sources: [
          expect.objectContaining({
            sourceLabel: "Chili"
          })
        ]
      })
    ]);
  });

  it("confirms one candidate by creating pantry stock, event history, and a decision", async () => {
    const fake = createFakeSupabase({
      groceryListItems: [
        groceryListItemRow({
          checked: true,
          grocery_list_id: "completed-list",
          id: "eligible-item",
          quantity: 2,
          unit: "cans"
        })
      ],
      groceryLists: [
        groceryListRow({
          completed_at: "2026-06-27T12:00:00Z",
          id: "completed-list",
          status: "completed"
        })
      ],
      pantryItems: []
    });

    await expect(
      confirmPantryIntakeCandidateWithClient({
        groceryListItemId: "eligible-item",
        householdId: "household-1",
        input: {
          displayName: "Reviewed beans",
          expirationDate: null,
          groceryCategoryId: null,
          lowStockThresholdQuantity: null,
          lowStockThresholdUnit: null,
          mealProfileId: null,
          notes: null,
          openedAt: null,
          packageDetail: null,
          quantity: "2",
          quantityNote: null,
          stockStatus: "in_stock",
          storageLocation: "Pantry",
          unit: "cans"
        },
        note: "Reviewed from completed groceries",
        supabase: fake.client
      })
    ).resolves.toEqual(
      expect.objectContaining({
        groceryListItemId: "eligible-item",
        pantryItem: expect.objectContaining({
          displayName: "Reviewed beans",
          foodId: "food-beans"
        }),
        status: "confirmed"
      })
    );

    expect(fake.state.pantryItems).toContainEqual(
      expect.objectContaining({
        display_name: "Reviewed beans",
        food_id: "food-beans",
        quantity: 2,
        storage_location: "Pantry",
        unit: "cans"
      })
    );
    expect(fake.state.pantryEvents).toHaveLength(1);
    expect(fake.state.pantryIntakeDecisions).toContainEqual(
      expect.objectContaining({
        created_pantry_item_id: "inserted-pantry-item-1",
        grocery_list_item_id: "eligible-item",
        status: "confirmed"
      })
    );
    expect(fake.operations).not.toContain("grocery_list_items:update");
    expect(fake.operations).not.toContain("grocery_item_sources:update");
  });

  it("cleans up newly-created pantry stock if a confirmed decision loses a race", async () => {
    const fake = createFakeSupabase({
      failNextPantryIntakeDecisionInsert: true,
      finalPantryIntakeDecision: {
        created_pantry_item_id: "winning-pantry-item",
        grocery_list_item_id: "eligible-item",
        household_id: "household-1",
        status: "confirmed"
      },
      groceryListItems: [
        groceryListItemRow({
          checked: true,
          grocery_list_id: "completed-list",
          id: "eligible-item"
        })
      ],
      groceryLists: [
        groceryListRow({
          completed_at: "2026-06-27T12:00:00Z",
          id: "completed-list",
          status: "completed"
        })
      ],
      pantryItems: []
    });

    await expect(
      confirmPantryIntakeCandidateWithClient({
        groceryListItemId: "eligible-item",
        householdId: "household-1",
        input: {
          displayName: "Reviewed beans",
          expirationDate: null,
          groceryCategoryId: null,
          lowStockThresholdQuantity: null,
          lowStockThresholdUnit: null,
          mealProfileId: null,
          notes: null,
          openedAt: null,
          packageDetail: null,
          quantity: null,
          quantityNote: null,
          stockStatus: "in_stock",
          storageLocation: null,
          unit: null
        },
        supabase: fake.client
      })
    ).resolves.toEqual({
      groceryListItemId: "eligible-item",
      pantryItemId: "winning-pantry-item",
      status: "already_confirmed"
    });

    expect(fake.operations).toContain("pantry_items:delete");
    expect(fake.state.pantryItems).toEqual([]);
  });

  it("skips one candidate without creating pantry stock or events", async () => {
    const fake = createFakeSupabase({
      groceryListItems: [
        groceryListItemRow({
          checked: true,
          grocery_list_id: "completed-list",
          id: "eligible-item"
        })
      ],
      groceryLists: [
        groceryListRow({
          completed_at: "2026-06-27T12:00:00Z",
          id: "completed-list",
          status: "completed"
        })
      ],
      pantryItems: []
    });

    await expect(
      skipPantryIntakeCandidateWithClient({
        groceryListItemId: "eligible-item",
        householdId: "household-1",
        note: "No pantry stock",
        supabase: fake.client
      })
    ).resolves.toEqual({
      groceryListItemId: "eligible-item",
      status: "skipped"
    });

    expect(fake.state.pantryIntakeDecisions).toContainEqual(
      expect.objectContaining({
        created_pantry_item_id: null,
        grocery_list_item_id: "eligible-item",
        note: "No pantry stock",
        status: "skipped"
      })
    );
    expect(fake.state.pantryItems).toEqual([]);
    expect(fake.state.pantryEvents).toEqual([]);

    await expect(
      skipPantryIntakeCandidateWithClient({
        groceryListItemId: "eligible-item",
        householdId: "household-1",
        supabase: fake.client
      })
    ).resolves.toEqual({
      groceryListItemId: "eligible-item",
      status: "already_skipped"
    });
  });
});

describe("pantry consumption data functions", () => {
  it("reads candidates from completed food-backed cooking ingredients and suppresses decisions", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient",
          sort_order: 1
        }),
        cookingSessionIngredientRow({
          id: "decided-ingredient",
          sort_order: 2
        }),
        cookingSessionIngredientRow({
          food_id: null,
          id: "unlinked-ingredient",
          sort_order: 3
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        }),
        cookingSessionRow({
          id: "active-session",
          status: "active"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "decided-ingredient",
          household_id: "household-1",
          status: "skipped"
        }
      ],
      pantryItems: []
    });

    await expect(
      getPantryConsumptionCandidatesWithClient({
        householdId: "household-1",
        supabase: fake.client
      })
    ).resolves.toEqual([
      expect.objectContaining({
        cookingSessionId: "completed-session",
        cookingSessionIngredientId: "eligible-ingredient",
        displayName: "Tortillas",
        foodId: "food-tortillas",
        foodName: "Tortillas",
        recipeNameSnapshot: "Wraps"
      })
    ]);
  });

  it("confirms one consumption candidate without mutating pantry stock or events", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryItems: []
    });

    await expect(
      confirmPantryConsumptionCandidateWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        note: "Used for dinner",
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "confirmed"
    });

    expect(fake.state.pantryConsumptionDecisions).toContainEqual(
      expect.objectContaining({
        cooking_session_ingredient_id: "eligible-ingredient",
        note: "Used for dinner",
        status: "confirmed"
      })
    );
    expect(fake.state.pantryItems).toEqual([]);
    expect(fake.state.pantryEvents).toEqual([]);
  });

  it("skips one consumption candidate idempotently without pantry stock changes", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryItems: []
    });

    await expect(
      skipPantryConsumptionCandidateWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        note: "Not pantry stock",
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "skipped"
    });

    expect(fake.state.pantryConsumptionDecisions).toContainEqual(
      expect.objectContaining({
        cooking_session_ingredient_id: "eligible-ingredient",
        note: "Not pantry stock",
        status: "skipped"
      })
    );
    expect(fake.state.pantryItems).toEqual([]);
    expect(fake.state.pantryEvents).toEqual([]);

    await expect(
      skipPantryConsumptionCandidateWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "already_skipped"
    });
  });

  it("applies one confirmed consumption decision to the selected pantry lot only", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryItemSources: [groceryItemSourceRow()],
      groceryLists: [groceryListRow()],
      groceryListItems: [groceryListItemRow()],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryItems: [
        pantryItemRow({
          display_name: "Target tortillas",
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 5,
          stock_status: "in_stock",
          unit: "count"
        }),
        pantryItemRow({
          display_name: "Untouched tortillas",
          food_id: "food-tortillas",
          id: "untouched-lot",
          quantity: 3,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });
    const grocerySnapshot = JSON.stringify({
      groceryItemSources: fake.state.groceryItemSources,
      groceryListItems: fake.state.groceryListItems,
      groceryLists: fake.state.groceryLists
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 2, unit: "COUNT" }
          ],
          appliedQuantity: 2,
          appliedUnit: " count "
        },
        note: " Used two tortillas ",
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "applied",
      stockApplicationId: "stock-application-1"
    });

    expect(fake.operations).toContain("rpc:apply_pantry_consumption_stock");
    expect(fake.state.pantryItems.find((item) => item.id === "target-lot")).toEqual(
      expect.objectContaining({ quantity: 3 })
    );
    expect(
      fake.state.pantryItems.find((item) => item.id === "untouched-lot")
    ).toEqual(expect.objectContaining({ quantity: 3 }));
    expect(fake.state.pantryConsumptionStockApplications).toEqual([
      expect.objectContaining({
        applied_quantity: 2,
        applied_unit: "count",
        id: "stock-application-1",
        note: "Used two tortillas",
        pantry_consumption_decision_id: "consumption-decision-1"
      })
    ]);
    expect(fake.state.pantryConsumptionStockApplicationAllocations).toEqual([
      expect.objectContaining({
        applied_quantity: 2,
        pantry_item_id: "target-lot",
        pantry_quantity_after: 3,
        pantry_quantity_before: 5,
        stock_application_id: "stock-application-1",
        unit: "count"
      })
    ]);
    expect(
      JSON.stringify({
        groceryItemSources: fake.state.groceryItemSources,
        groceryListItems: fake.state.groceryListItems,
        groceryLists: fake.state.groceryLists
      })
    ).toBe(grocerySnapshot);
    expect(fake.operations).not.toContain("pantry_events:insert");
  });

  it("returns already_applied on retry without deducting stock again", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryConsumptionStockApplications: [
        {
          applied_quantity: 2,
          applied_unit: "count",
          household_id: "household-1",
          id: "existing-application",
          note: null,
          pantry_consumption_decision_id: "consumption-decision-1"
        }
      ],
      pantryConsumptionStockApplicationAllocations: [
        {
          applied_quantity: 2,
          household_id: "household-1",
          id: "existing-allocation",
          pantry_item_id: "target-lot",
          pantry_quantity_after: 3,
          pantry_quantity_before: 5,
          stock_application_id: "existing-application",
          unit: "count"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 3,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 2, unit: "count" }
          ],
          appliedQuantity: 2,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "already_applied",
      stockApplicationId: "existing-application"
    });

    expect(fake.state.pantryItems[0]).toEqual(expect.objectContaining({ quantity: 3 }));
    expect(fake.state.pantryConsumptionStockApplications).toHaveLength(1);
    expect(fake.state.pantryConsumptionStockApplicationAllocations).toHaveLength(1);
  });

  it("returns already_applied on retry after the selected lot was fully drained", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryConsumptionStockApplicationAllocations: [
        {
          applied_quantity: 5,
          household_id: "household-1",
          id: "existing-allocation",
          pantry_item_id: "target-lot",
          pantry_quantity_after: 0,
          pantry_quantity_before: 5,
          stock_application_id: "existing-application",
          unit: "count"
        }
      ],
      pantryConsumptionStockApplications: [
        {
          applied_quantity: 5,
          applied_unit: "count",
          household_id: "household-1",
          id: "existing-application",
          note: null,
          pantry_consumption_decision_id: "consumption-decision-1"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 0,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 5, unit: "count" }
          ],
          appliedQuantity: 5,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "already_applied",
      stockApplicationId: "existing-application"
    });

    expect(fake.state.pantryItems[0]).toEqual(expect.objectContaining({ quantity: 0 }));
    expect(fake.operations).toContain("rpc:apply_pantry_consumption_stock");
  });

  it("returns already_reversed without revalidating current lot state", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryConsumptionStockApplicationAllocations: [
        {
          applied_quantity: 2,
          household_id: "household-1",
          id: "existing-allocation",
          pantry_item_id: "target-lot",
          pantry_quantity_after: 3,
          pantry_quantity_before: 5,
          stock_application_id: "existing-application",
          unit: "count"
        }
      ],
      pantryConsumptionStockApplicationReversals: [
        {
          household_id: "household-1",
          id: "existing-reversal",
          stock_application_id: "existing-application"
        }
      ],
      pantryConsumptionStockApplications: [
        {
          applied_quantity: 2,
          applied_unit: "count",
          household_id: "household-1",
          id: "existing-application",
          note: null,
          pantry_consumption_decision_id: "consumption-decision-1"
        }
      ],
      pantryItems: [
        pantryItemRow({
          discarded_at: "2026-06-29T12:00:00Z",
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 0,
          stock_status: "out",
          unit: "count"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 1, unit: "count" }
          ],
          appliedQuantity: 1,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "already_reversed",
      stockApplicationId: "existing-application"
    });

    expect(fake.state.pantryItems[0]).toEqual(expect.objectContaining({ quantity: 0 }));
    expect(fake.operations).toContain("rpc:apply_pantry_consumption_stock");
  });

  it("rejects an idempotent retry with different allocation payload", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryConsumptionStockApplicationAllocations: [
        {
          applied_quantity: 1,
          household_id: "household-1",
          id: "existing-allocation",
          pantry_item_id: "target-lot",
          pantry_quantity_after: 4,
          pantry_quantity_before: 5,
          stock_application_id: "existing-application",
          unit: "count"
        }
      ],
      pantryConsumptionStockApplications: [
        {
          applied_quantity: 1,
          applied_unit: "count",
          household_id: "household-1",
          id: "existing-application",
          note: null,
          pantry_consumption_decision_id: "consumption-decision-1"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 4,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 2, unit: "count" }
          ],
          appliedQuantity: 2,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).rejects.toThrow(
      "Pantry stock application already exists with different allocations."
    );

    expect(fake.state.pantryItems[0]).toEqual(expect.objectContaining({ quantity: 4 }));
    expect(fake.state.pantryConsumptionStockApplications).toHaveLength(1);
  });

  it("applies a confirmed decision across explicitly selected lots", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          id: "lot-a",
          quantity: 1,
          stock_status: "in_stock",
          unit: "count"
        }),
        pantryItemRow({
          food_id: "food-tortillas",
          id: "lot-b",
          quantity: 4,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "lot-a", quantity: 1, unit: "count" },
            { pantryItemId: "lot-b", quantity: 1, unit: "count" }
          ],
          appliedQuantity: 2,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).resolves.toEqual({
      cookingSessionIngredientId: "eligible-ingredient",
      status: "applied",
      stockApplicationId: "stock-application-1"
    });

    expect(fake.state.pantryItems.find((item) => item.id === "lot-a")).toEqual(
      expect.objectContaining({ quantity: 0 })
    );
    expect(fake.state.pantryItems.find((item) => item.id === "lot-b")).toEqual(
      expect.objectContaining({ quantity: 3 })
    );
    expect(fake.state.pantryConsumptionStockApplicationAllocations).toEqual([
      expect.objectContaining({
        pantry_item_id: "lot-a",
        pantry_quantity_after: 0,
        pantry_quantity_before: 1
      }),
      expect.objectContaining({
        pantry_item_id: "lot-b",
        pantry_quantity_after: 3,
        pantry_quantity_before: 4
      })
    ]);
  });

  it("rejects skipped and undecided ingredients before stock writes", async () => {
    const skipped = createFakeSupabase({
      cookingSessionIngredients: [],
      cookingSessions: [],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "skipped-ingredient",
          household_id: "household-1",
          id: "skipped-decision",
          status: "skipped"
        }
      ],
      pantryItems: []
    });
    const undecided = createFakeSupabase({
      cookingSessionIngredients: [],
      cookingSessions: [],
      groceryLists: [],
      groceryListItems: [],
      pantryItems: []
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "skipped-ingredient",
        householdId: "household-1",
        input: {
          allocations: [],
          appliedQuantity: 1,
          appliedUnit: "count"
        },
        supabase: skipped.client
      })
    ).rejects.toThrow("Skipped cooking ingredients cannot apply pantry stock.");
    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "undecided-ingredient",
        householdId: "household-1",
        input: {
          allocations: [],
          appliedQuantity: 1,
          appliedUnit: "count"
        },
        supabase: undecided.client
      })
    ).rejects.toThrow("Confirm this cooking ingredient before applying pantry stock.");
    expect(skipped.operations).not.toContain("rpc:apply_pantry_consumption_stock");
    expect(undecided.operations).not.toContain("rpc:apply_pantry_consumption_stock");
  });

  it("rejects active-session ingredients without partial stock writes", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "active-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          id: "completed-session",
          status: "active"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "active-ingredient",
          household_id: "household-1",
          id: "active-decision",
          status: "confirmed"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 2,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "active-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 1, unit: "count" }
          ],
          appliedQuantity: 1,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).rejects.toThrow(
      "That cooking ingredient is not available for pantry stock application."
    );

    expect(fake.state.pantryItems[0]).toEqual(expect.objectContaining({ quantity: 2 }));
    expect(fake.state.pantryConsumptionStockApplications).toEqual([]);
    expect(fake.operations).not.toContain("rpc:apply_pantry_consumption_stock");
  });

  it("rejects cross-household and incompatible lot allocations before stock writes", async () => {
    const fake = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          household_id: "household-2",
          id: "other-household-lot",
          quantity: 2,
          stock_status: "in_stock",
          unit: "count"
        }),
        pantryItemRow({
          food_id: "food-tortillas",
          id: "wrong-unit-lot",
          quantity: 2,
          stock_status: "in_stock",
          unit: "bag"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "other-household-lot", quantity: 1, unit: "count" }
          ],
          appliedQuantity: 1,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).rejects.toThrow("One selected pantry lot is no longer available.");
    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "wrong-unit-lot", quantity: 1, unit: "count" }
          ],
          appliedQuantity: 1,
          appliedUnit: "count"
        },
        supabase: fake.client
      })
    ).rejects.toThrow("Pantry lot allocation units must match the applied unit.");
    expect(fake.state.pantryConsumptionStockApplications).toEqual([]);
    expect(fake.operations).not.toContain("rpc:apply_pantry_consumption_stock");
  });

  it("rejects overdraw and stale lot races without partial stock writes", async () => {
    const overdraw = createFakeSupabase({
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 1,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });
    const stale = createFakeSupabase({
      beforeRpc(state) {
        const targetLot = state.pantryItems.find((item) => item.id === "target-lot");
        if (targetLot) {
          targetLot.quantity = 1;
        }
      },
      cookingSessionIngredients: [
        cookingSessionIngredientRow({
          id: "eligible-ingredient"
        })
      ],
      cookingSessions: [
        cookingSessionRow({
          completed_at: "2026-06-28T12:00:00Z",
          id: "completed-session",
          status: "completed"
        })
      ],
      groceryLists: [],
      groceryListItems: [],
      pantryConsumptionDecisions: [
        {
          cooking_session_ingredient_id: "eligible-ingredient",
          household_id: "household-1",
          id: "consumption-decision-1",
          status: "confirmed"
        }
      ],
      pantryItems: [
        pantryItemRow({
          food_id: "food-tortillas",
          id: "target-lot",
          quantity: 2,
          stock_status: "in_stock",
          unit: "count"
        })
      ]
    });

    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 2, unit: "count" }
          ],
          appliedQuantity: 2,
          appliedUnit: "count"
        },
        supabase: overdraw.client
      })
    ).rejects.toThrow("One selected pantry lot does not have enough quantity.");
    await expect(
      applyPantryConsumptionStockWithClient({
        cookingSessionIngredientId: "eligible-ingredient",
        householdId: "household-1",
        input: {
          allocations: [
            { pantryItemId: "target-lot", quantity: 2, unit: "count" }
          ],
          appliedQuantity: 2,
          appliedUnit: "count"
        },
        supabase: stale.client
      })
    ).rejects.toThrow("Pantry stock application selected a stale pantry lot.");

    expect(overdraw.state.pantryItems[0]).toEqual(expect.objectContaining({ quantity: 1 }));
    expect(overdraw.state.pantryConsumptionStockApplications).toEqual([]);
    expect(stale.state.pantryItems[0]).toEqual(expect.objectContaining({ quantity: 1 }));
    expect(stale.state.pantryConsumptionStockApplications).toEqual([]);
  });
});

function createFakeSupabase({
  beforeRpc,
  cookingSessionIngredients = [],
  cookingSessions = [],
  failNextPantryIntakeDecisionInsert = false,
  finalPantryIntakeDecision,
  groceryItemSources = [],
  groceryLists,
  groceryListItems,
  pantryConsumptionDecisions = [],
  pantryConsumptionStockApplicationAllocations = [],
  pantryConsumptionStockApplications = [],
  pantryConsumptionStockApplicationReversals = [],
  pantryIntakeDecisions = [],
  pantryItems,
  statusAfterCandidateRead
}: {
  beforeRpc?: (state: FakeSupabaseState) => void;
  cookingSessionIngredients?: CookingSessionIngredientRow[];
  cookingSessions?: CookingSessionRow[];
  failNextPantryIntakeDecisionInsert?: boolean;
  finalPantryIntakeDecision?: PantryIntakeDecisionRow;
  groceryItemSources?: GroceryItemSourceRow[];
  groceryLists: GroceryListRow[];
  groceryListItems: GroceryListItemRow[];
  pantryConsumptionDecisions?: PantryConsumptionDecisionRow[];
  pantryConsumptionStockApplicationAllocations?: PantryConsumptionStockApplicationAllocationRow[];
  pantryConsumptionStockApplications?: PantryConsumptionStockApplicationRow[];
  pantryConsumptionStockApplicationReversals?: PantryConsumptionStockApplicationReversalRow[];
  pantryIntakeDecisions?: PantryIntakeDecisionRow[];
  pantryItems: PantryItemRow[];
  statusAfterCandidateRead?: GroceryListRow["status"];
}) {
  const operations: string[] = [];
  const state: FakeSupabaseState = {
    beforeRpc,
    cookingSessionIngredients: cookingSessionIngredients.map((ingredient) => ({
      ...ingredient
    })),
    cookingSessions: cookingSessions.map((session) => ({ ...session })),
    failNextPantryIntakeDecisionInsert,
    finalPantryIntakeDecision,
    groceryItemSources: groceryItemSources.map((source) => ({ ...source })),
    groceryListItems: groceryListItems.map((item) => ({ ...item })),
    groceryLists: groceryLists.map((list) => ({ ...list })),
    pantryEvents: [] as Array<Record<string, unknown>>,
    pantryConsumptionDecisions: pantryConsumptionDecisions.map((decision) => ({
      ...decision
    })),
    pantryConsumptionStockApplicationAllocations:
      pantryConsumptionStockApplicationAllocations.map((allocation) => ({
        ...allocation
      })),
    pantryConsumptionStockApplications: pantryConsumptionStockApplications.map(
      (application) => ({
        ...application
      })
    ),
    pantryConsumptionStockApplicationReversals:
      pantryConsumptionStockApplicationReversals.map((reversal) => ({
        ...reversal
      })),
    pantryIntakeDecisions: pantryIntakeDecisions.map((decision) => ({
      ...decision
    })),
    pantryItems: pantryItems.map((item) => ({ ...item }))
  };
  const client = {
    from(table: string) {
      return new FakeQuery({
        operations,
        state,
        statusAfterCandidateRead,
        table
      });
    },
    rpc(name: string, params: Record<string, unknown>) {
      operations.push(`rpc:${name}`);
      if (name !== "apply_pantry_consumption_stock") {
        return new FakeRpcResult({
          data: null,
          error: { message: `Unsupported RPC ${name}` }
        });
      }

      return new FakeRpcResult(
        executeApplyPantryConsumptionStockRpc({
          params,
          state
        })
      );
    }
  } as unknown as SupabaseClient;

  return { client, operations, state };
}

type FakeSupabaseState = {
  beforeRpc?: (state: FakeSupabaseState) => void;
  cookingSessionIngredients: CookingSessionIngredientRow[];
  cookingSessions: CookingSessionRow[];
  failNextPantryIntakeDecisionInsert: boolean;
  finalPantryIntakeDecision?: PantryIntakeDecisionRow;
  groceryItemSources: GroceryItemSourceRow[];
  groceryListItems: GroceryListItemRow[];
  groceryLists: GroceryListRow[];
  pantryEvents: Array<Record<string, unknown>>;
  pantryConsumptionDecisions: PantryConsumptionDecisionRow[];
  pantryConsumptionStockApplicationAllocations: PantryConsumptionStockApplicationAllocationRow[];
  pantryConsumptionStockApplications: PantryConsumptionStockApplicationRow[];
  pantryConsumptionStockApplicationReversals: PantryConsumptionStockApplicationReversalRow[];
  pantryIntakeDecisions: PantryIntakeDecisionRow[];
  pantryItems: PantryItemRow[];
};

class FakeRpcResult {
  constructor(private readonly result: QueryResult) {}

  single() {
    return Promise.resolve(this.result);
  }
}

class FakeQuery {
  private readonly operations: string[];
  private readonly state: FakeSupabaseState;
  private readonly statusAfterCandidateRead: GroceryListRow["status"] | undefined;
  private readonly table: string;
  private filters: Array<[string, unknown]> = [];
  private inFilter: [string, unknown[]] | null = null;
  private insertPayload: unknown = null;
  private operation: "delete" | "insert" | "select" | "update" | null = null;
  private selectColumns = "";

  constructor({
    operations,
    state,
    statusAfterCandidateRead,
    table
  }: {
    operations: string[];
    state: FakeQuery["state"];
    statusAfterCandidateRead?: GroceryListRow["status"];
    table: string;
  }) {
    this.operations = operations;
    this.state = state;
    this.statusAfterCandidateRead = statusAfterCandidateRead;
    this.table = table;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }

  in(field: string, values: unknown[]) {
    this.inFilter = [field, values];
    return this;
  }

  insert(payload: unknown) {
    this.operation = "insert";
    this.insertPayload = payload;
    return this;
  }

  update() {
    this.operation = "update";
    return this;
  }

  is(field: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.executeMaybeSingle());
  }

  order() {
    return this;
  }

  select(columns: string) {
    this.operation = "select";
    this.selectColumns = columns;
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): QueryResult {
    if (this.operation === "insert") {
      return this.executeInsert();
    }

    if (this.operation === "delete") {
      this.operations.push(`${this.table}:delete`);
      this.executeDelete();
      return { data: null, error: null };
    }

    if (this.operation === "update") {
      this.operations.push(`${this.table}:update`);
      return { data: null, error: null };
    }

    if (this.table === "pantry_items") {
      return {
        data: this.state.pantryItems.filter((item) => this.matchesFilters(item)),
        error: null
      };
    }

    if (this.table === "pantry_intake_decisions") {
      return {
        data: this.getPantryIntakeDecisionRows(),
        error: null
      };
    }

    if (this.table === "pantry_consumption_decisions") {
      return {
        data: this.getPantryConsumptionDecisionRows(),
        error: null
      };
    }

    if (this.table === "pantry_consumption_stock_applications") {
      return {
        data: this.state.pantryConsumptionStockApplications.filter((application) =>
          this.matchesFilters(application)
        ),
        error: null
      };
    }

    if (this.table === "pantry_consumption_stock_application_reversals") {
      return {
        data: this.state.pantryConsumptionStockApplicationReversals.filter(
          (reversal) => this.matchesFilters(reversal)
        ),
        error: null
      };
    }

    if (this.table === "cooking_session_ingredients") {
      return {
        data: this.state.cookingSessionIngredients.filter((ingredient) =>
          this.matchesFilters(ingredient)
        ),
        error: null
      };
    }

    if (this.table === "grocery_item_sources") {
      return {
        data: this.state.groceryItemSources.filter((source) =>
          this.matchesFilters(source)
        ),
        error: null
      };
    }

    if (this.table === "grocery_lists") {
      const rows = this.state.groceryLists.filter((list) =>
        this.matchesFilters(list)
      );

      return {
        data: rows.map((list) => ({
          ...list,
          grocery_list_items: this.state.groceryListItems.filter(
            (item) => item.grocery_list_id === list.id
          )
        })),
        error: null
      };
    }

    if (this.table === "cooking_sessions") {
      const rows = this.state.cookingSessions.filter((session) =>
        this.matchesFilters(session)
      );

      return {
        data: rows.map((session) => ({
          ...session,
          cooking_session_ingredients: this.state.cookingSessionIngredients.filter(
            (ingredient) => ingredient.cooking_session_id === session.id
          )
        })),
        error: null
      };
    }

    return { data: null, error: null };
  }

  private executeInsert(): QueryResult {
    this.operations.push(`${this.table}:insert`);

    if (this.table === "grocery_list_items") {
      const payload = this.insertPayload as Omit<GroceryListItemRow, "id">;
      const row = {
        ...payload,
        id: `inserted-grocery-item-${this.state.groceryListItems.length + 1}`
      };
      this.state.groceryListItems.push(row);
      return { data: { id: row.id }, error: null };
    }

    if (this.table === "grocery_item_sources") {
      this.state.groceryItemSources.push(this.insertPayload as GroceryItemSourceRow);
    }

    if (this.table === "pantry_items") {
      const payload = this.insertPayload as Partial<PantryItemRow>;
      const row = pantryItemRow({
        ...payload,
        id: `inserted-pantry-item-${this.state.pantryItems.length + 1}`
      });
      this.state.pantryItems.push(row);
      return { data: row, error: null };
    }

    if (this.table === "pantry_events") {
      const payload = Array.isArray(this.insertPayload)
        ? this.insertPayload
        : [this.insertPayload];
      this.state.pantryEvents.push(...(payload as Array<Record<string, unknown>>));
    }

    if (this.table === "pantry_intake_decisions") {
      if (this.state.failNextPantryIntakeDecisionInsert) {
        this.state.failNextPantryIntakeDecisionInsert = false;
        return {
          data: null,
          error: { message: "duplicate key value violates unique constraint" }
        };
      }

      this.state.pantryIntakeDecisions.push(
        this.insertPayload as PantryIntakeDecisionRow
      );
    }

    if (this.table === "pantry_consumption_decisions") {
      this.state.pantryConsumptionDecisions.push(
        this.insertPayload as PantryConsumptionDecisionRow
      );
    }

    return { data: null, error: null };
  }

  private executeMaybeSingle(): QueryResult {
    if (this.insertPayload) {
      return this.executeInsert();
    }

    if (this.table === "grocery_lists" && this.selectColumns === "status") {
      const list = this.state.groceryLists.find((candidateList) =>
        this.matchesFilters(candidateList)
      );

      return {
        data: list
          ? { status: this.statusAfterCandidateRead ?? list.status }
          : null,
        error: null
      };
    }

    if (
      this.table === "grocery_list_items" &&
      this.selectColumns === "grocery_list_id"
    ) {
      const item = this.state.groceryListItems.find((candidateItem) =>
        this.matchesFilters(candidateItem)
      );

      return {
        data: item ? { grocery_list_id: item.grocery_list_id } : null,
        error: null
      };
    }

    if (
      this.table === "grocery_list_items" &&
      this.selectColumns === "id"
    ) {
      const item = this.state.groceryListItems.find((candidateItem) =>
        this.matchesFilters(candidateItem)
      );

      return { data: item ? { id: item.id } : null, error: null };
    }

    if (
      this.table === "grocery_list_items" &&
      this.selectColumns === "sort_order"
    ) {
      const items = this.state.groceryListItems
        .filter((candidateItem) => this.matchesFilters(candidateItem))
        .sort((first, second) => second.sort_order - first.sort_order);

      return {
        data: items[0] ? { sort_order: items[0].sort_order } : null,
        error: null
      };
    }

    if (this.table === "pantry_intake_decisions") {
      return {
        data: this.getPantryIntakeDecisionRows()[0] ?? null,
        error: null
      };
    }

    if (
      this.table === "cooking_session_ingredients" &&
      this.selectColumns === "cooking_session_id"
    ) {
      const ingredient = this.state.cookingSessionIngredients.find(
        (candidateIngredient) => this.matchesFilters(candidateIngredient)
      );

      return {
        data: ingredient
          ? { cooking_session_id: ingredient.cooking_session_id }
          : null,
        error: null
      };
    }

    if (this.table === "pantry_consumption_decisions") {
      return {
        data: this.getPantryConsumptionDecisionRows()[0] ?? null,
        error: null
      };
    }

    if (this.table === "pantry_consumption_stock_applications") {
      return {
        data:
          this.state.pantryConsumptionStockApplications.find((application) =>
            this.matchesFilters(application)
          ) ?? null,
        error: null
      };
    }

    if (this.table === "pantry_consumption_stock_application_reversals") {
      return {
        data:
          this.state.pantryConsumptionStockApplicationReversals.find((reversal) =>
            this.matchesFilters(reversal)
          ) ?? null,
        error: null
      };
    }

    return { data: null, error: null };
  }

  private executeDelete() {
    if (this.table === "pantry_items") {
      this.state.pantryItems = this.state.pantryItems.filter(
        (item) => !this.matchesFilters(item)
      );
    }
  }

  private getPantryIntakeDecisionRows() {
    const rows = [...this.state.pantryIntakeDecisions];

    if (
      this.state.finalPantryIntakeDecision &&
      !this.state.failNextPantryIntakeDecisionInsert
    ) {
      rows.push(this.state.finalPantryIntakeDecision);
    }

    return rows.filter((decision) => this.matchesFilters(decision));
  }

  private getPantryConsumptionDecisionRows() {
    return this.state.pantryConsumptionDecisions.filter((decision) =>
      this.matchesFilters(decision)
    );
  }

  private matchesFilters(row: Record<string, unknown>) {
    const matchesEq = this.filters.every(([field, value]) => row[field] === value);

    if (!matchesEq) {
      return false;
    }

    if (!this.inFilter) {
      return true;
    }

    return this.inFilter[1].includes(row[this.inFilter[0]]);
  }
}

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function executeApplyPantryConsumptionStockRpc({
  params,
  state
}: {
  params: Record<string, unknown>;
  state: FakeSupabaseState;
}): QueryResult {
  state.beforeRpc?.(state);

  const householdId = params.p_household_id as string;
  const decisionId = params.p_pantry_consumption_decision_id as string;
  const appliedQuantity = params.p_applied_quantity as number;
  const appliedUnit = params.p_applied_unit as string;
  const note = params.p_note as string | null;
  const allocations = params.p_allocations as Array<{
    expectedQuantityBefore: number;
    expectedUpdatedAt: string;
    pantryItemId: string;
    quantity: number;
    unit: string;
  }>;
  const decision = state.pantryConsumptionDecisions.find(
    (candidateDecision) =>
      candidateDecision.id === decisionId &&
      candidateDecision.household_id === householdId
  );

  if (!decision) {
    return {
      data: null,
      error: {
        message:
          "Pantry stock application requires an existing consumption decision in this household."
      }
    };
  }

  const existingApplication = state.pantryConsumptionStockApplications.find(
    (application) =>
      application.pantry_consumption_decision_id === decisionId &&
      application.household_id === householdId
  );

  if (existingApplication) {
    const existingReversal =
      state.pantryConsumptionStockApplicationReversals.find(
        (reversal) =>
          reversal.stock_application_id === existingApplication.id &&
          reversal.household_id === householdId
      ) ?? null;
    const existingAllocations =
      state.pantryConsumptionStockApplicationAllocations.filter(
        (allocation) => allocation.stock_application_id === existingApplication.id
      );
    const payloadMatches =
      Number(existingApplication.applied_quantity) === appliedQuantity &&
      existingApplication.applied_unit === appliedUnit &&
      existingAllocations.length === allocations.length &&
      allocations.every((allocation) =>
        existingAllocations.some(
          (existingAllocation) =>
            existingAllocation.pantry_item_id === allocation.pantryItemId &&
            Number(existingAllocation.applied_quantity) === allocation.quantity &&
            existingAllocation.unit === allocation.unit
        )
      );

    if (!existingReversal && !payloadMatches) {
      return {
        data: null,
        error: {
          message: "Pantry stock application already exists with different allocations."
        }
      };
    }

    return {
      data: {
        status: existingReversal ? "already_reversed" : "already_applied",
        stock_application_id: existingApplication.id
      },
      error: null
    };
  }

  const ingredient = state.cookingSessionIngredients.find(
    (candidateIngredient) =>
      candidateIngredient.id === decision.cooking_session_ingredient_id &&
      candidateIngredient.household_id === householdId
  );
  const ingredientFoodId = ingredient?.food_id;
  const touchedLots = allocations.map((allocation) => ({
    allocation,
    item: state.pantryItems.find(
      (candidateItem) =>
        candidateItem.id === allocation.pantryItemId &&
        candidateItem.household_id === householdId
    )
  }));

  if (
    touchedLots.some(
      ({ allocation, item }) =>
        !item ||
        item.food_id !== ingredientFoodId ||
        item.discarded_at !== null ||
        item.stock_status === "out" ||
        item.stock_status === "unknown" ||
        item.quantity === null ||
        Number(item.quantity) <= 0 ||
        item.unit !== allocation.unit ||
        allocation.unit !== appliedUnit ||
        allocation.expectedQuantityBefore === null ||
        !allocation.expectedUpdatedAt
    )
  ) {
    return {
      data: null,
      error: { message: "Pantry stock application selected an incompatible pantry lot." }
    };
  }

  if (
    touchedLots.some(
      ({ allocation, item }) =>
        Number(item?.quantity ?? 0) !== allocation.expectedQuantityBefore ||
        item?.updated_at !== allocation.expectedUpdatedAt
    )
  ) {
    return {
      data: null,
      error: { message: "Pantry stock application selected a stale pantry lot." }
    };
  }

  if (
    touchedLots.some(
      ({ allocation, item }) => Number(item?.quantity ?? 0) < allocation.quantity
    )
  ) {
    return {
      data: null,
      error: { message: "Pantry stock application would overdraw a pantry lot." }
    };
  }

  const stockApplicationId = `stock-application-${
    state.pantryConsumptionStockApplications.length + 1
  }`;
  state.pantryConsumptionStockApplications.push({
    applied_quantity: appliedQuantity,
    applied_unit: appliedUnit,
    household_id: householdId,
    id: stockApplicationId,
    note,
    pantry_consumption_decision_id: decisionId
  });

  for (const { allocation, item } of touchedLots) {
    if (!item) {
      continue;
    }

    const before = Number(item.quantity);
    const after = before - allocation.quantity;
    item.quantity = after;
    state.pantryConsumptionStockApplicationAllocations.push({
      applied_quantity: allocation.quantity,
      household_id: householdId,
      id: `stock-application-allocation-${
        state.pantryConsumptionStockApplicationAllocations.length + 1
      }`,
      pantry_item_id: item.id,
      pantry_quantity_after: after,
      pantry_quantity_before: before,
      stock_application_id: stockApplicationId,
      unit: allocation.unit
    });
  }

  return {
    data: {
      status: "applied",
      stock_application_id: stockApplicationId
    },
    error: null
  };
}

function groceryListRow(overrides: Partial<GroceryListRow> = {}): GroceryListRow {
  return {
    completed_at: null,
    created_at: "2026-06-27T12:00:00Z",
    household_id: "household-1",
    id: "list-1",
    name: "Grocery list",
    status: "draft",
    weekly_plans: { week_start_date: "2026-06-22" },
    ...overrides
  };
}

function groceryListItemRow(
  overrides: Partial<GroceryListItemRow> = {}
): GroceryListItemRow {
  return {
    already_have: false,
    checked: false,
    display_name: "Black beans",
    food_id: "food-beans",
    foods: { name: "Black beans" },
    grocery_categories: { name: "Canned goods" },
    grocery_category_id: "category-canned",
    grocery_list_id: "list-1",
    household_id: "household-1",
    id: "grocery-item-1",
    preferred_quantity_text: null,
    quantity: null,
    sort_order: 0,
    unit: null,
    ...overrides
  };
}

function groceryItemSourceRow(
  overrides: Partial<GroceryItemSourceRow> = {}
): GroceryItemSourceRow {
  return {
    grocery_list_item_id: "grocery-item-1",
    household_id: "household-1",
    meal_profile_id: null,
    meal_profiles: null,
    notes: null,
    quantity: null,
    source_id: null,
    source_label: null,
    source_type: "recipe",
    unit: null,
    ...overrides
  };
}

function cookingSessionRow(
  overrides: Partial<CookingSessionRow> = {}
): CookingSessionRow {
  return {
    completed_at: null,
    created_at: "2026-06-28T12:00:00Z",
    household_id: "household-1",
    id: "completed-session",
    recipe_id: "recipe-1",
    recipe_name_snapshot: "Wraps",
    scale_factor_snapshot: 1,
    servings_snapshot: 2,
    started_at: "2026-06-28T11:00:00Z",
    status: "completed",
    ...overrides
  };
}

function cookingSessionIngredientRow(
  overrides: Partial<CookingSessionIngredientRow> = {}
): CookingSessionIngredientRow {
  return {
    cooking_session_id: "completed-session",
    display_name: "Tortillas",
    food_id: "food-tortillas",
    foods: { name: "Tortillas" },
    household_id: "household-1",
    id: "cooking-ingredient-1",
    is_ready: true,
    notes: null,
    optional: false,
    preparation: null,
    quantity: 2,
    ready_at: "2026-06-28T11:05:00Z",
    sort_order: 0,
    unit: "count",
    ...overrides
  };
}

function pantryItemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    created_at: "2026-06-27T12:00:00Z",
    discarded_at: null,
    display_name: "Black beans",
    expiration_date: null,
    food_id: "food-beans",
    foods: {
      default_grocery_category_id: "food-default-category",
      name: "Black beans"
    },
    grocery_categories: null,
    grocery_category_id: null,
    household_id: "household-1",
    id: "pantry-item-1",
    is_open: false,
    low_stock_threshold_quantity: null,
    low_stock_threshold_unit: null,
    meal_profile_id: "profile-shared",
    meal_profiles: { name: "Shared" },
    notes: null,
    opened_at: null,
    package_detail: null,
    quantity: null,
    quantity_note: null,
    stock_status: "low",
    storage_location: null,
    unit: null,
    updated_at: "2026-06-27T12:00:00Z",
    ...overrides
  };
}
