import { describe, expect, it } from "vitest";
import {
  buildPantryConsumptionStockReversalDeltas,
  buildPantryConsumptionStockState,
  getEligiblePantryConsumptionStockLots,
  validatePantryConsumptionStockAllocations,
  validatePantryConsumptionStockApplicationInput,
  type PantryConsumptionStockApplication,
  type PantryConsumptionStockCandidate,
  type PantryConsumptionStockDecision,
  type PantryConsumptionStockLot
} from "./consumption-stock-application";

describe("buildPantryConsumptionStockState", () => {
  it("returns undecided or invalid-stale before treating a candidate as applyable", () => {
    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate(),
        decision: null,
        householdId: "household-1",
        pantryItems: []
      })
    ).toEqual({ status: "undecided" });

    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: null,
        decision: decision(),
        householdId: "household-1",
        pantryItems: []
      })
    ).toEqual({ reason: "missing_candidate", status: "invalid_stale" });

    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate({ cookingSessionIngredientId: "ingredient-2" }),
        decision: decision({ cookingSessionIngredientId: "ingredient-1" }),
        householdId: "household-1",
        pantryItems: [lot()],
      })
    ).toEqual({
      reason: "decision_candidate_mismatch",
      status: "invalid_stale"
    });
  });

  it("returns terminal skipped, applied, and reversed states before lot evaluation", () => {
    const application = stockApplication();
    const reversedApplication = stockApplication({
      reversal: { id: "reversal-1" }
    });

    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate(),
        decision: decision({ status: "skipped" }),
        householdId: "household-1",
        pantryItems: [lot()]
      })
    ).toEqual({ status: "skipped" });

    expect(
      buildPantryConsumptionStockState({
        application,
        candidate: candidate(),
        decision: decision(),
        householdId: "household-1",
        pantryItems: [lot()]
      })
    ).toEqual({ application, status: "applied" });

    expect(
      buildPantryConsumptionStockState({
        application: reversedApplication,
        candidate: candidate(),
        decision: decision(),
        householdId: "household-1",
        pantryItems: [lot()]
      })
    ).toEqual({
      application: reversedApplication,
      reversal: { id: "reversal-1" },
      status: "reversed"
    });
  });

  it("keeps persisted stock history visible when candidate snapshots are stale or contradictory", () => {
    const application = stockApplication();
    const reversedApplication = stockApplication({
      reversal: { id: "reversal-1" }
    });

    expect(
      buildPantryConsumptionStockState({
        application,
        candidate: null,
        decision: decision(),
        householdId: "household-1",
        pantryItems: []
      })
    ).toEqual({ application, status: "applied" });

    expect(
      buildPantryConsumptionStockState({
        application: reversedApplication,
        candidate: candidate({ cookingSessionIngredientId: "ingredient-2" }),
        decision: decision(),
        householdId: "household-1",
        pantryItems: []
      })
    ).toEqual({
      application: reversedApplication,
      reversal: { id: "reversal-1" },
      status: "reversed"
    });

    expect(
      buildPantryConsumptionStockState({
        application,
        candidate: candidate(),
        decision: decision({ status: "skipped" }),
        householdId: "household-1",
        pantryItems: []
      })
    ).toEqual({ application, status: "applied" });
  });

  it("returns confirmed-unapplied ineligible readiness for missing quantity, missing unit, and no eligible lots", () => {
    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate({ quantity: null }),
        decision: decision(),
        householdId: "household-1",
        pantryItems: [lot()]
      })
    ).toEqual(
      expect.objectContaining({
        readiness: "ineligible",
        reason: "missing_quantity",
        status: "confirmed_unapplied"
      })
    );

    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate({ unit: null }),
        decision: decision(),
        householdId: "household-1",
        pantryItems: [lot()]
      })
    ).toEqual(
      expect.objectContaining({
        readiness: "ineligible",
        reason: "missing_unit",
        status: "confirmed_unapplied"
      })
    );

    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate(),
        decision: decision(),
        householdId: "household-1",
        pantryItems: []
      })
    ).toEqual(
      expect.objectContaining({
        readiness: "ineligible",
        reason: "no_eligible_lot",
        status: "confirmed_unapplied"
      })
    );
  });

  it("auto-selects exactly one eligible lot and requires allocation for multiple lots", () => {
    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate(),
        decision: decision(),
        householdId: "household-1",
        pantryItems: [lot({ id: "only-lot" })]
      })
    ).toEqual(
      expect.objectContaining({
        autoSelectedPantryItemId: "only-lot",
        eligibleLots: [expect.objectContaining({ id: "only-lot" })],
        proposedQuantity: 2,
        proposedUnit: "count",
        readiness: "single_lot_auto",
        reason: null,
        status: "confirmed_unapplied"
      })
    );

    expect(
      buildPantryConsumptionStockState({
        application: null,
        candidate: candidate(),
        decision: decision(),
        householdId: "household-1",
        pantryItems: [lot({ id: "first" }), lot({ id: "second" })]
      })
    ).toEqual(
      expect.objectContaining({
        autoSelectedPantryItemId: null,
        eligibleLots: [
          expect.objectContaining({ id: "first" }),
          expect.objectContaining({ id: "second" })
        ],
        readiness: "allocation_required",
        reason: null,
        status: "confirmed_unapplied"
      })
    );
  });
});

describe("getEligiblePantryConsumptionStockLots", () => {
  it("filters to active same-household food-matching lots with structured quantity and exact units", () => {
    const lots = getEligiblePantryConsumptionStockLots({
      appliedQuantity: 2,
      appliedUnit: "count",
      foodId: "food-tortillas",
      householdId: "household-1",
      pantryItems: [
        lot({ id: "eligible", unit: " Count " }),
        lot({ discardedAt: "2026-06-29T12:00:00Z", id: "discarded" }),
        lot({ id: "out", stockStatus: "out" }),
        lot({ foodId: "food-beans", id: "wrong-food" }),
        lot({ householdId: "household-2", id: "wrong-household" }),
        lot({ id: "missing-quantity", quantity: null }),
        lot({ id: "missing-unit", unit: null }),
        lot({ id: "wrong-unit", unit: "package" })
      ]
    });

    expect(lots.map((candidateLot) => candidateLot.id)).toEqual(["eligible"]);
  });

  it("orders by expiration, ability to satisfy quantity, lowest quantity, updated recency, then id", () => {
    const lots = getEligiblePantryConsumptionStockLots({
      appliedQuantity: 2,
      appliedUnit: "count",
      foodId: "food-tortillas",
      householdId: "household-1",
      pantryItems: [
        lot({
          expirationDate: null,
          id: "missing-expiration",
          quantity: 2
        }),
        lot({
          expirationDate: "2026-07-01",
          id: "later-expiration",
          quantity: 1
        }),
        lot({
          expirationDate: "2026-06-30",
          id: "insufficient-earliest",
          quantity: 1
        }),
        lot({
          expirationDate: "2026-06-30",
          id: "satisfies-lowest",
          quantity: 2,
          updatedAt: "2026-06-28T12:00:00Z"
        }),
        lot({
          expirationDate: "2026-06-30",
          id: "satisfies-newest-b",
          quantity: 3,
          updatedAt: "2026-06-29T13:00:00Z"
        }),
        lot({
          expirationDate: "2026-06-30",
          id: "satisfies-newest-a",
          quantity: 3,
          updatedAt: "2026-06-29T13:00:00Z"
        })
      ]
    });

    expect(lots.map((candidateLot) => candidateLot.id)).toEqual([
      "satisfies-lowest",
      "satisfies-newest-a",
      "satisfies-newest-b",
      "insufficient-earliest",
      "later-expiration",
      "missing-expiration"
    ]);
  });
});

describe("validatePantryConsumptionStockApplicationInput", () => {
  it("rejects missing, zero, negative, and unitless application inputs", () => {
    expect(
      validatePantryConsumptionStockApplicationInput({
        appliedQuantity: null,
        appliedUnit: "count"
      })
    ).toEqual({ reasons: ["missing_quantity"], valid: false });

    expect(
      validatePantryConsumptionStockApplicationInput({
        appliedQuantity: 0,
        appliedUnit: "count"
      })
    ).toEqual({ reasons: ["invalid_quantity"], valid: false });

    expect(
      validatePantryConsumptionStockApplicationInput({
        appliedQuantity: -1,
        appliedUnit: "count"
      })
    ).toEqual({ reasons: ["invalid_quantity"], valid: false });

    expect(
      validatePantryConsumptionStockApplicationInput({
        appliedQuantity: 1,
        appliedUnit: " "
      })
    ).toEqual({ reasons: ["missing_unit"], valid: false });
  });

  it("accepts normalized positive partial quantity and exact unit", () => {
    expect(
      validatePantryConsumptionStockApplicationInput({
        appliedQuantity: 0.5,
        appliedUnit: " Count "
      })
    ).toEqual({ quantity: 0.5, unit: "count", valid: true });
  });
});

describe("validatePantryConsumptionStockAllocations", () => {
  it("accepts single-lot and multi-lot exact allocations", () => {
    expect(
      validatePantryConsumptionStockAllocations({
        allocations: [{ pantryItemId: "lot-1", quantity: 2, unit: "count" }],
        appliedQuantity: 2,
        appliedUnit: "count",
        foodId: "food-tortillas",
        householdId: "household-1",
        pantryItems: [lot({ id: "lot-1", quantity: 3 })]
      })
    ).toEqual({
      allocations: [
        {
          pantryItemId: "lot-1",
          pantryQuantityAfter: 1,
          pantryQuantityBefore: 3,
          pantryUpdatedAt: "2026-06-29T12:00:00Z",
          quantity: 2,
          unit: "count"
        }
      ],
      valid: true
    });

    expect(
      validatePantryConsumptionStockAllocations({
        allocations: [
          { pantryItemId: "lot-1", quantity: 1.25, unit: "count" },
          { pantryItemId: "lot-2", quantity: 0.75, unit: "count" }
        ],
        appliedQuantity: 2,
        appliedUnit: "count",
        foodId: "food-tortillas",
        householdId: "household-1",
        pantryItems: [
          lot({ id: "lot-1", quantity: 2 }),
          lot({ id: "lot-2", quantity: 1 })
        ]
      })
    ).toEqual(
      expect.objectContaining({
        allocations: [
          expect.objectContaining({
            pantryItemId: "lot-1",
            pantryQuantityAfter: 0.75
          }),
          expect.objectContaining({
            pantryItemId: "lot-2",
            pantryQuantityAfter: 0.25
          })
        ],
        valid: true
      })
    );
  });

  it("rejects missing allocation, duplicate lots, unknown lots, and inactive or wrong lots", () => {
    expect(
      validatePantryConsumptionStockAllocations({
        allocations: [],
        appliedQuantity: 1,
        appliedUnit: "count",
        foodId: "food-tortillas",
        householdId: "household-1",
        pantryItems: [lot()]
      })
    ).toEqual({
      reasons: ["missing_allocation"],
      valid: false
    });

    expect(
      validatePantryConsumptionStockAllocations({
        allocations: [
          { pantryItemId: "lot-1", quantity: 0.5, unit: "count" },
          { pantryItemId: "lot-1", quantity: 0.5, unit: "count" },
          { pantryItemId: "unknown", quantity: 1, unit: "count" },
          { pantryItemId: "discarded", quantity: 1, unit: "count" },
          { pantryItemId: "wrong-food", quantity: 1, unit: "count" },
          { pantryItemId: "wrong-household", quantity: 1, unit: "count" }
        ],
        appliedQuantity: 5,
        appliedUnit: "count",
        foodId: "food-tortillas",
        householdId: "household-1",
        pantryItems: [
          lot({ id: "lot-1", quantity: 2 }),
          lot({ discardedAt: "2026-06-29T12:00:00Z", id: "discarded" }),
          lot({ foodId: "food-beans", id: "wrong-food" }),
          lot({ householdId: "household-2", id: "wrong-household" })
        ]
      })
    ).toEqual({
      reasons: [
        "duplicate_lot",
        "unknown_lot",
        "inactive_lot",
        "wrong_food",
        "sum_mismatch"
      ],
      valid: false
    });
  });

  it("rejects invalid quantities, incompatible units, overdraw, and sum mismatch", () => {
    expect(
      validatePantryConsumptionStockAllocations({
        allocations: [
          { pantryItemId: "missing-quantity", quantity: null, unit: "count" },
          { pantryItemId: "zero", quantity: 0, unit: "count" },
          { pantryItemId: "negative", quantity: -1, unit: "count" },
          { pantryItemId: "missing-unit", quantity: 1, unit: null },
          { pantryItemId: "wrong-unit", quantity: 1, unit: "package" },
          { pantryItemId: "overdraw", quantity: 4, unit: "count" }
        ],
        appliedQuantity: 10,
        appliedUnit: "count",
        foodId: "food-tortillas",
        householdId: "household-1",
        pantryItems: [
          lot({ id: "missing-quantity", quantity: 2 }),
          lot({ id: "zero", quantity: 2 }),
          lot({ id: "negative", quantity: 2 }),
          lot({ id: "missing-unit", quantity: 2 }),
          lot({ id: "wrong-unit", quantity: 2 }),
          lot({ id: "overdraw", quantity: 2 })
        ]
      })
    ).toEqual({
      reasons: [
        "missing_quantity",
        "invalid_quantity",
        "missing_unit",
        "incompatible_unit",
        "overdraw",
        "sum_mismatch"
      ],
      valid: false
    });
  });

  it("rejects allocations whose sum is less or greater than the applied quantity", () => {
    expect(
      validatePantryConsumptionStockAllocations({
        allocations: [{ pantryItemId: "lot-1", quantity: 1, unit: "count" }],
        appliedQuantity: 2,
        appliedUnit: "count",
        foodId: "food-tortillas",
        householdId: "household-1",
        pantryItems: [lot({ id: "lot-1", quantity: 3 })]
      })
    ).toEqual({ reasons: ["sum_mismatch"], valid: false });

    expect(
      validatePantryConsumptionStockAllocations({
        allocations: [{ pantryItemId: "lot-1", quantity: 3, unit: "count" }],
        appliedQuantity: 2,
        appliedUnit: "count",
        foodId: "food-tortillas",
        householdId: "household-1",
        pantryItems: [lot({ id: "lot-1", quantity: 4 })]
      })
    ).toEqual({ reasons: ["sum_mismatch"], valid: false });
  });
});

describe("buildPantryConsumptionStockReversalDeltas", () => {
  it("returns deterministic exact additive deltas for original allocations", () => {
    expect(
      buildPantryConsumptionStockReversalDeltas({
        allocations: [
          {
            appliedQuantity: 0.75,
            id: "allocation-b",
            pantryItemId: "lot-2",
            unit: " Count "
          },
          {
            appliedQuantity: 1.25,
            id: "allocation-a",
            pantryItemId: "lot-1",
            unit: "count"
          }
        ]
      })
    ).toEqual([
      {
        pantryItemId: "lot-1",
        restoredQuantity: 1.25,
        stockApplicationAllocationId: "allocation-a",
        unit: "count"
      },
      {
        pantryItemId: "lot-2",
        restoredQuantity: 0.75,
        stockApplicationAllocationId: "allocation-b",
        unit: "count"
      }
    ]);
  });
});

function decision(
  overrides: Partial<PantryConsumptionStockDecision> = {}
): PantryConsumptionStockDecision {
  return {
    cookingSessionIngredientId: "ingredient-1",
    status: "confirmed",
    ...overrides
  };
}

function candidate(
  overrides: Partial<PantryConsumptionStockCandidate> = {}
): PantryConsumptionStockCandidate {
  return {
    cookingSessionIngredientId: "ingredient-1",
    foodId: "food-tortillas",
    quantity: 2,
    unit: "count",
    ...overrides
  };
}

function stockApplication(
  overrides: Partial<PantryConsumptionStockApplication> = {}
): PantryConsumptionStockApplication {
  return {
    allocations: [
      {
        appliedQuantity: 2,
        id: "allocation-1",
        pantryItemId: "lot-1",
        unit: "count"
      }
    ],
    id: "application-1",
    reversal: null,
    ...overrides
  };
}

function lot(overrides: Partial<PantryConsumptionStockLot> = {}) {
  return {
    discardedAt: null,
    displayName: "Tortillas",
    expirationDate: "2026-06-30",
    foodId: "food-tortillas",
    householdId: "household-1",
    id: "lot-1",
    quantity: 2,
    stockStatus: "in_stock",
    unit: "count",
    updatedAt: "2026-06-29T12:00:00Z",
    ...overrides
  } satisfies PantryConsumptionStockLot;
}
