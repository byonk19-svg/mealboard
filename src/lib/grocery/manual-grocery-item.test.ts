import { describe, expect, it } from "vitest";
import {
  buildManualGrocerySourceLabel,
  normalizeManualGroceryItemInput
} from "./manual-grocery-item";

describe("manual grocery items", () => {
  it("normalizes optional manual item fields", () => {
    expect(
      normalizeManualGroceryItemInput({
        displayName: "  Paper towels  ",
        note: "  Costco pack  ",
        quantity: " 2 ",
        unit: " rolls "
      })
    ).toEqual({
      displayName: "Paper towels",
      note: "Costco pack",
      quantity: 2,
      unit: "rolls"
    });
  });

  it("rejects missing item names", () => {
    expect(() =>
      normalizeManualGroceryItemInput({
        displayName: " ",
        note: null,
        quantity: null,
        unit: null
      })
    ).toThrow("Enter an item name.");
  });

  it("rejects non-positive quantities", () => {
    expect(() =>
      normalizeManualGroceryItemInput({
        displayName: "Milk",
        note: null,
        quantity: "0",
        unit: "gallon"
      })
    ).toThrow("Quantity must be greater than zero.");
  });

  it("builds deterministic source labels", () => {
    expect(buildManualGrocerySourceLabel(null)).toBe(
      "Manual add for Household"
    );
    expect(buildManualGrocerySourceLabel("Brianna")).toBe(
      "Manual add for Brianna"
    );
  });
});
