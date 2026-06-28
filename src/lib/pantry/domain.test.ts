import { describe, expect, it } from "vitest";
import {
  buildPantryCategoryGroups,
  buildPantryEventTypes,
  classifyExpirationDate,
  getEffectiveStockStatus,
  getHouseholdDateString,
  normalizePantryItemInput,
  searchPantryItems
} from "./domain";
import type { PantryItem } from "./types";

describe("normalizePantryItemInput", () => {
  it("normalizes a manual pantry item without requiring exact quantity", () => {
    expect(
      normalizePantryItemInput({
        displayName: "  Daisy sour cream 16 oz ",
        expirationDate: "2026-07-02",
        foodId: "food-1",
        groceryCategoryId: "category-1",
        isOpen: false,
        lowStockThresholdQuantity: null,
        lowStockThresholdUnit: null,
        mealProfileId: null,
        notes: "  fridge door ",
        openedAt: null,
        packageDetail: "  tub ",
        quantity: null,
        quantityNote: " one unopened tub ",
        stockStatus: "in_stock",
        storageLocation: " fridge ",
        unit: null
      })
    ).toMatchObject({
      displayName: "Daisy sour cream 16 oz",
      expirationDate: "2026-07-02",
      foodId: "food-1",
      notes: "fridge door",
      packageDetail: "tub",
      quantity: null,
      quantityNote: "one unopened tub",
      stockStatus: "in_stock",
      storageLocation: "fridge"
    });
  });

  it("requires household item identity and display name", () => {
    const input = pantryInput({ displayName: "Rice", foodId: null });

    expect(() => normalizePantryItemInput(input)).toThrow(
      "Choose a household item."
    );
    expect(() =>
      normalizePantryItemInput(pantryInput({ displayName: " ", foodId: "food-1" }))
    ).toThrow("Enter a pantry item name.");
  });

  it("requires threshold quantity and unit together", () => {
    expect(() =>
      normalizePantryItemInput(
        pantryInput({
          lowStockThresholdQuantity: "2",
          lowStockThresholdUnit: null
        })
      )
    ).toThrow("Enter both low-stock threshold quantity and unit.");
  });

  it("rejects opened dates for unopened items", () => {
    expect(() =>
      normalizePantryItemInput(
        pantryInput({ isOpen: false, openedAt: "2026-06-27T12:00:00Z" })
      )
    ).toThrow("Only open pantry items can have an opened date.");
  });

  it("rejects impossible calendar dates before they reach the database", () => {
    expect(() =>
      normalizePantryItemInput(pantryInput({ expirationDate: "2026-02-31" }))
    ).toThrow("Expiration date must be a valid date.");
  });
});

describe("getEffectiveStockStatus", () => {
  it("derives low stock only when threshold units match exactly", () => {
    expect(
      getEffectiveStockStatus(
        item({
          lowStockThresholdQuantity: 3,
          lowStockThresholdUnit: "count",
          quantity: 2,
          stockStatus: "in_stock",
          unit: "count"
        })
      )
    ).toBe("low");
  });

  it("does not perform automatic unit conversion", () => {
    expect(
      getEffectiveStockStatus(
        item({
          lowStockThresholdQuantity: 1,
          lowStockThresholdUnit: "lb",
          quantity: 8,
          stockStatus: "in_stock",
          unit: "oz"
        })
      )
    ).toBe("in_stock");
  });

  it("preserves manual low, out, and unknown statuses", () => {
    expect(getEffectiveStockStatus(item({ stockStatus: "out" }))).toBe("out");
    expect(getEffectiveStockStatus(item({ stockStatus: "low" }))).toBe("low");
    expect(getEffectiveStockStatus(item({ stockStatus: "unknown" }))).toBe(
      "unknown"
    );
  });
});

describe("classifyExpirationDate", () => {
  it("classifies missing, expired, today, expiring soon, and later dates", () => {
    expect(
      classifyExpirationDate({ expirationDate: null, today: "2026-06-27" })
    ).toBe("missing");
    expect(
      classifyExpirationDate({
        expirationDate: "2026-06-26",
        today: "2026-06-27"
      })
    ).toBe("expired");
    expect(
      classifyExpirationDate({
        expirationDate: "2026-06-27",
        today: "2026-06-27"
      })
    ).toBe("today");
    expect(
      classifyExpirationDate({
        expirationDate: "2026-07-04",
        today: "2026-06-27"
      })
    ).toBe("expiring_soon");
    expect(
      classifyExpirationDate({
        expirationDate: "2026-07-05",
        today: "2026-06-27"
      })
    ).toBe("not_expiring");
  });
});

describe("getHouseholdDateString", () => {
  it("uses the household timezone instead of UTC boundaries", () => {
    expect(
      getHouseholdDateString({
        date: new Date("2026-06-28T04:30:00.000Z"),
        timeZone: "America/Chicago"
      })
    ).toBe("2026-06-27");
  });
});

describe("buildPantryCategoryGroups", () => {
  it("groups active items by category, rolls up lots, and uses nearest expiration", () => {
    const groups = buildPantryCategoryGroups({
      items: [
        item({
          displayName: "Yogurt tub",
          expirationDate: "2026-07-04",
          foodId: "food-yogurt",
          foodName: "Yogurt",
          groceryCategoryId: "dairy",
          groceryCategoryName: "Dairy",
          groceryCategorySortOrder: 20,
          id: "item-1"
        }),
        item({
          displayName: "Yogurt cups",
          expirationDate: "2026-07-01",
          foodId: "food-yogurt",
          foodName: "Yogurt",
          groceryCategoryId: "dairy",
          groceryCategoryName: "Dairy",
          groceryCategorySortOrder: 20,
          id: "item-2",
          stockStatus: "low"
        }),
        item({
          displayName: "Counter bananas",
          foodId: "food-bananas",
          foodName: "Bananas",
          groceryCategoryId: null,
          groceryCategoryName: null,
          groceryCategorySortOrder: null,
          id: "item-3"
        }),
        item({
          discardedAt: "2026-06-27T12:00:00Z",
          displayName: "Old yogurt",
          foodId: "food-yogurt",
          foodName: "Yogurt",
          id: "item-4"
        })
      ],
      today: "2026-06-27"
    });

    expect(groups).toHaveLength(2);
    expect(groups[0]?.categoryName).toBe("Dairy");
    expect(groups[0]?.rollups[0]).toMatchObject({
      effectiveStockStatus: "low",
      foodId: "food-yogurt",
      foodName: "Yogurt",
      nearestExpirationDate: "2026-07-01"
    });
    expect(groups[0]?.rollups[0]?.items.map((pantryItem) => pantryItem.id)).toEqual(
      ["item-2", "item-1"]
    );
    expect(groups[1]?.categoryName).toBe("Uncategorized");
  });
});

describe("searchPantryItems", () => {
  it("searches household item name, display/package text, notes, category, and storage", () => {
    const items = [
      item({
        displayName: "Daisy sour cream",
        foodName: "Sour cream",
        groceryCategoryName: "Dairy",
        notes: "For taco night",
        packageDetail: "16 oz tub",
        storageLocation: "Fridge"
      }),
      item({
        displayName: "Paper towels",
        foodName: "Paper towels",
        groceryCategoryName: "Household",
        storageLocation: "Pantry"
      })
    ];

    expect(searchPantryItems(items, "taco")).toHaveLength(1);
    expect(searchPantryItems(items, "16 oz")).toHaveLength(1);
    expect(searchPantryItems(items, "household")).toHaveLength(1);
    expect(searchPantryItems(items, "freezer")).toHaveLength(0);
  });
});

describe("buildPantryEventTypes", () => {
  it("creates one created event for a new pantry item", () => {
    expect(buildPantryEventTypes({ after: item(), before: null })).toEqual([
      "created"
    ]);
  });

  it("detects meaningful edit event types without deleting history", () => {
    const before = item({
      expirationDate: "2026-07-01",
      groceryCategoryId: "dairy",
      notes: "before",
      quantity: 2,
      stockStatus: "in_stock",
      storageLocation: "fridge"
    });
    const after = item({
      expirationDate: "2026-07-02",
      groceryCategoryId: "pantry",
      notes: "after",
      quantity: 1,
      stockStatus: "low",
      storageLocation: "counter"
    });

    expect(buildPantryEventTypes({ after, before })).toEqual([
      "status_changed",
      "expiration_changed",
      "category_changed",
      "storage_changed",
      "notes_changed",
      "adjusted"
    ]);
  });

  it("detects discard without requiring grocery, cooking, or recipe effects", () => {
    expect(
      buildPantryEventTypes({
        after: item({ discardedAt: "2026-06-27T12:00:00Z" }),
        before: item()
      })
    ).toEqual(["discarded"]);
  });

  it("records a correction event when only household item identity changes", () => {
    expect(
      buildPantryEventTypes({
        after: item({ foodId: "food-2", foodName: "Sour cream" }),
        before: item({ foodId: "food-1", foodName: "Yogurt" })
      })
    ).toEqual(["adjusted"]);
  });
});

function pantryInput(
  overrides: Partial<Parameters<typeof normalizePantryItemInput>[0]> = {}
) {
  return {
    displayName: "Rice",
    expirationDate: null,
    foodId: "food-1",
    groceryCategoryId: null,
    isOpen: false,
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
    unit: null,
    ...overrides
  };
}

function item(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    discardedAt: null,
    displayName: "Rice",
    expirationDate: null,
    foodId: "food-1",
    foodName: "Rice",
    groceryCategoryId: "pantry",
    groceryCategoryName: "Pantry",
    groceryCategorySortOrder: 10,
    householdId: "household-1",
    id: "item-1",
    isOpen: false,
    lowStockThresholdQuantity: null,
    lowStockThresholdUnit: null,
    mealProfileId: null,
    mealProfileName: null,
    notes: null,
    openedAt: null,
    packageDetail: null,
    quantity: null,
    quantityNote: null,
    stockStatus: "in_stock",
    storageLocation: null,
    unit: null,
    updatedAt: "2026-06-27T12:00:00Z",
    ...overrides
  };
}
