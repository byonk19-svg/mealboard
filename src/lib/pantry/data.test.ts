import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addPantryRestockCandidateToGroceryListWithClient } from "./data";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn()
}));

type GroceryListRow = {
  created_at: string;
  household_id: string;
  id: string;
  status: "draft" | "finalized" | "shopping_started" | "completed";
};

type GroceryListItemRow = {
  display_name: string;
  food_id: string | null;
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
  meal_profile_id: string | null;
  notes: string | null;
  quantity: number | null;
  source_id: string | null;
  source_label: string | null;
  source_type: string;
  unit: string | null;
};

type PantryItemRow = ReturnType<typeof pantryItemRow>;

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

function createFakeSupabase({
  groceryLists,
  groceryListItems,
  pantryItems,
  statusAfterCandidateRead
}: {
  groceryLists: GroceryListRow[];
  groceryListItems: GroceryListItemRow[];
  pantryItems: PantryItemRow[];
  statusAfterCandidateRead?: GroceryListRow["status"];
}) {
  const operations: string[] = [];
  const state = {
    groceryItemSources: [] as GroceryItemSourceRow[],
    groceryListItems: groceryListItems.map((item) => ({ ...item })),
    groceryLists: groceryLists.map((list) => ({ ...list })),
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
    }
  } as unknown as SupabaseClient;

  return { client, operations, state };
}

class FakeQuery {
  private readonly operations: string[];
  private readonly state: {
    groceryItemSources: GroceryItemSourceRow[];
    groceryListItems: GroceryListItemRow[];
    groceryLists: GroceryListRow[];
    pantryItems: PantryItemRow[];
  };
  private readonly statusAfterCandidateRead: GroceryListRow["status"] | undefined;
  private readonly table: string;
  private filters: Array<[string, unknown]> = [];
  private inFilter: [string, unknown[]] | null = null;
  private insertPayload: unknown = null;
  private operation: "delete" | "insert" | "select" | null = null;
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
      return { data: null, error: null };
    }

    if (this.table === "pantry_items") {
      return { data: this.state.pantryItems, error: null };
    }

    if (this.table === "grocery_lists") {
      const rows = this.state.groceryLists.filter((list) =>
        this.inFilter ? this.inFilter[1].includes(list.status) : true
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

    return { data: null, error: null };
  }

  private matchesFilters(row: Record<string, unknown>) {
    return this.filters.every(([field, value]) => row[field] === value);
  }
}

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function groceryListRow(overrides: Partial<GroceryListRow> = {}): GroceryListRow {
  return {
    created_at: "2026-06-27T12:00:00Z",
    household_id: "household-1",
    id: "list-1",
    status: "draft",
    ...overrides
  };
}

function groceryListItemRow(
  overrides: Partial<GroceryListItemRow> = {}
): GroceryListItemRow {
  return {
    display_name: "Black beans",
    food_id: "food-beans",
    grocery_list_id: "list-1",
    household_id: "household-1",
    id: "grocery-item-1",
    sort_order: 0,
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
