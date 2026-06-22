import { describe, expect, it } from "vitest";
import { foodNameKey, normalizeFoodCreateInput } from "./foods";

describe("normalizeFoodCreateInput", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeFoodCreateInput({ name: "  roasted   carrots  " })).toEqual({
      name: "roasted carrots"
    });
  });

  it("rejects blank names", () => {
    expect(() => normalizeFoodCreateInput({ name: "   " })).toThrow(
      "Food name is required."
    );
  });

  it("preserves valid mixed-case names", () => {
    expect(normalizeFoodCreateInput({ name: "Baby Oatmeal" })).toEqual({
      name: "Baby Oatmeal"
    });
  });
});

describe("foodNameKey", () => {
  it("compares names case-insensitively after normalization", () => {
    expect(foodNameKey("  AVOCADO  ")).toBe(foodNameKey("avocado"));
  });
});
