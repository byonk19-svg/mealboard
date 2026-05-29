import { describe, expect, it } from "vitest";
import {
  formatStapleFrequency,
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
});
