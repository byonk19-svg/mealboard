import { describe, expect, it } from "vitest";
import {
  formatStapleFrequency,
  getStapleWrapUpAdjustmentIntent,
  normalizeStapleInput
} from "./staples";

describe("staples settings helpers", () => {
  it("normalizes staple form input", () => {
    expect(
      normalizeStapleInput({
        displayName: "  Paper towels  ",
        frequency: "weekly",
        notes: "  Big pack  ",
        preferredQuantityText: "  1 pack  ",
        quantity: " 2 ",
        unit: " rolls "
      })
    ).toEqual({
      displayName: "Paper towels",
      frequency: "weekly",
      notes: "Big pack",
      preferredQuantityText: "1 pack",
      quantity: 2,
      unit: "rolls"
    });
  });

  it("rejects missing display names", () => {
    expect(() =>
      normalizeStapleInput({
        displayName: " ",
        frequency: "weekly",
        notes: null,
        preferredQuantityText: null,
        quantity: null,
        unit: null
      })
    ).toThrow("Enter a staple name.");
  });

  it("rejects non-positive quantities", () => {
    expect(() =>
      normalizeStapleInput({
        displayName: "Milk",
        frequency: "weekly",
        notes: null,
        preferredQuantityText: null,
        quantity: "0",
        unit: "gallon"
      })
    ).toThrow("Quantity must be greater than zero.");
  });

  it("rejects invalid frequencies", () => {
    expect(() =>
      normalizeStapleInput({
        displayName: "Milk",
        frequency: "daily",
        notes: null,
        preferredQuantityText: null,
        quantity: null,
        unit: null
      })
    ).toThrow("Choose a staple frequency.");
  });

  it("formats staple frequencies for display", () => {
    expect(formatStapleFrequency("every_two_weeks")).toBe("Every 2 weeks");
  });

  it("extracts a buy-less wrap-up intent for one staple source", () => {
    expect(
      getStapleWrapUpAdjustmentIntent({
        notes: "Still had half",
        resolution: "reduce_future_amount",
        unusedGrocery: unusedStaple()
      })
    ).toEqual({
      groceryDisplayName: "Crackers",
      notes: "Still had half",
      resolution: "reduce_future_amount",
      stapleId: "staple-1"
    });
  });

  it("extracts a pause wrap-up intent for one staple source", () => {
    expect(
      getStapleWrapUpAdjustmentIntent({
        notes: null,
        resolution: "pause_future_buy",
        unusedGrocery: unusedStaple()
      })
    ).toEqual({
      groceryDisplayName: "Crackers",
      notes: null,
      resolution: "pause_future_buy",
      stapleId: "staple-1"
    });
  });

  it("ignores non-actionable and ambiguous wrap-up responses", () => {
    expect(
      getStapleWrapUpAdjustmentIntent({
        resolution: "acknowledged",
        unusedGrocery: unusedStaple()
      })
    ).toBeNull();
    expect(
      getStapleWrapUpAdjustmentIntent({
        resolution: "use_later",
        unusedGrocery: unusedStaple()
      })
    ).toBeNull();
    expect(
      getStapleWrapUpAdjustmentIntent({
        resolution: "pause_future_buy",
        unusedGrocery: unusedStaple({
          classification: "mixed",
          sources: [
            { sourceId: "staple-1", sourceType: "staple" },
            { sourceId: "plan-item-1", sourceType: "meal_generated" }
          ]
        })
      })
    ).toBeNull();
    expect(
      getStapleWrapUpAdjustmentIntent({
        resolution: "pause_future_buy",
        unusedGrocery: unusedStaple({
          sources: [
            { sourceId: "staple-1", sourceType: "staple" },
            { sourceId: "staple-2", sourceType: "staple" }
          ]
        })
      })
    ).toBeNull();
    expect(
      getStapleWrapUpAdjustmentIntent({
        resolution: "pause_future_buy",
        unusedGrocery: unusedStaple({
          sources: [{ sourceId: null, sourceType: "staple" }]
        })
      })
    ).toBeNull();
  });
});

function unusedStaple(
  overrides: Partial<{
    classification: string | null;
    displayName: string;
    sources: Array<{ sourceId: string | null; sourceType: string }>;
  }> = {}
) {
  return {
    classification: "staple",
    displayName: "Crackers",
    sources: [{ sourceId: "staple-1", sourceType: "staple" }],
    ...overrides
  };
}
