import { describe, expect, it } from "vitest";
import type { PantryItem } from "./types";
import { derivePantryUseSoonSignals } from "./use-soon-signals";

describe("derivePantryUseSoonSignals", () => {
  it("returns grouped use-soon signals for active consumable pantry stock", () => {
    const pantryItems = [
      pantryItem({
        displayName: "Beans open can",
        expirationDate: "2026-06-30",
        foodId: "food-beans",
        id: "pantry-beans-later"
      }),
      pantryItem({
        displayName: "Beans backstock",
        expirationDate: "2026-06-28",
        foodId: "food-beans",
        id: "pantry-beans-expired"
      }),
      pantryItem({
        displayName: "Tortillas",
        expirationDate: "2026-06-29",
        foodId: "food-tortillas",
        foodName: "Tortillas",
        id: "pantry-tortillas"
      })
    ];

    expect(
      derivePantryUseSoonSignals({
        pantryItems,
        today: "2026-06-29"
      })
    ).toEqual([
      {
        daysUntilExpiration: -1,
        expirationStatus: "expired",
        foodId: "food-beans",
        foodName: "Black beans",
        groceryCategoryId: null,
        groceryCategoryName: null,
        itemDisplayNames: ["Beans backstock", "Beans open can"],
        lotCount: 2,
        mealProfileContexts: [
          {
            mealProfileId: null,
            mealProfileName: null
          }
        ],
        pantryItemIds: ["pantry-beans-expired", "pantry-beans-later"],
        reasonLabels: ["Past use-by date", "Use soon"],
        urgency: "expired",
        useByDate: "2026-06-28"
      },
      {
        daysUntilExpiration: 0,
        expirationStatus: "today",
        foodId: "food-tortillas",
        foodName: "Tortillas",
        groceryCategoryId: null,
        groceryCategoryName: null,
        itemDisplayNames: ["Tortillas"],
        lotCount: 1,
        mealProfileContexts: [
          {
            mealProfileId: null,
            mealProfileName: null
          }
        ],
        pantryItemIds: ["pantry-tortillas"],
        reasonLabels: ["Use today"],
        urgency: "today",
        useByDate: "2026-06-29"
      }
    ]);
  });

  it("excludes discarded, unavailable, missing-date, and outside-window items", () => {
    const pantryItems = [
      pantryItem({
        discardedAt: "2026-06-28T12:00:00Z",
        expirationDate: "2026-06-30",
        id: "discarded"
      }),
      pantryItem({
        expirationDate: "2026-06-30",
        id: "out",
        stockStatus: "out"
      }),
      pantryItem({
        expirationDate: "2026-06-30",
        id: "unknown",
        stockStatus: "unknown"
      }),
      pantryItem({
        expirationDate: null,
        id: "missing-date"
      }),
      pantryItem({
        expirationDate: "2026-07-20",
        id: "later"
      }),
      pantryItem({
        expirationDate: "2026-07-02",
        id: "included"
      })
    ];

    expect(
      derivePantryUseSoonSignals({
        expiringSoonDays: 7,
        pantryItems,
        today: "2026-06-29"
      }).map((signal) => signal.pantryItemIds)
    ).toEqual([["included"]]);
  });

  it("excludes non-positive quantity lots and does not mutate input items", () => {
    const pantryItems = [
      pantryItem({
        expirationDate: "2026-06-30",
        id: "zero-quantity",
        lowStockThresholdQuantity: 2,
        lowStockThresholdUnit: "count",
        quantity: 0,
        stockStatus: "in_stock",
        unit: "count"
      }),
      pantryItem({
        expirationDate: "2026-06-30",
        id: "negative-quantity",
        quantity: -1,
        stockStatus: "in_stock",
        unit: "count"
      }),
      pantryItem({
        expirationDate: "2026-06-30",
        id: "low-positive-quantity",
        lowStockThresholdQuantity: 2,
        lowStockThresholdUnit: "count",
        quantity: 1,
        stockStatus: "in_stock",
        unit: "count"
      })
    ];
    const before = structuredClone(pantryItems);

    expect(
      derivePantryUseSoonSignals({
        pantryItems,
        today: "2026-06-29"
      }).map((signal) => signal.pantryItemIds)
    ).toEqual([["low-positive-quantity"]]);
    expect(pantryItems).toEqual(before);
  });

  it("orders by urgency, nearest expiration, food name, then stable id", () => {
    const signals = derivePantryUseSoonSignals({
      pantryItems: [
        pantryItem({
          expirationDate: "2026-07-01",
          foodId: "food-z",
          foodName: "Zucchini",
          id: "z"
        }),
        pantryItem({
          expirationDate: "2026-07-01",
          foodId: "food-a",
          foodName: "Apples",
          id: "a"
        }),
        pantryItem({
          expirationDate: "2026-06-28",
          foodId: "food-c",
          foodName: "Carrots",
          id: "c"
        }),
        pantryItem({
          expirationDate: "2026-06-29",
          foodId: "food-b",
          foodName: "Bananas",
          id: "b"
        })
      ],
      today: "2026-06-29"
    });

    expect(signals.map((signal) => signal.foodId)).toEqual([
      "food-c",
      "food-b",
      "food-a",
      "food-z"
    ]);
  });
});

function pantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    discardedAt: null,
    displayName: "Black beans",
    expirationDate: null,
    foodDefaultGroceryCategoryId: null,
    foodId: "food-beans",
    foodName: "Black beans",
    groceryCategoryId: null,
    groceryCategoryName: null,
    groceryCategorySortOrder: null,
    householdId: "household-1",
    id: "pantry-item-1",
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
    updatedAt: "2026-06-29T12:00:00Z",
    ...overrides
  };
}
