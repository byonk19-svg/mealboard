import { describe, expect, it } from "vitest";
import {
  foodNameKey,
  normalizeFoodCreateInput,
  normalizeSavedFoodInput
} from "./foods";

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

describe("normalizeSavedFoodInput", () => {
  it("normalizes saved food setup fields", () => {
    expect(
      normalizeSavedFoodInput({
        defaultGroceryCategoryId: " category-1 ",
        defaultUnit: " bunch ",
        name: "  bananas  "
      })
    ).toEqual({
      defaultGroceryCategoryId: "category-1",
      defaultUnit: "bunch",
      name: "bananas"
    });
  });

  it("allows optional unit and category to be cleared", () => {
    expect(
      normalizeSavedFoodInput({
        defaultGroceryCategoryId: "",
        defaultUnit: " ",
        name: "Avocado"
      })
    ).toEqual({
      defaultGroceryCategoryId: null,
      defaultUnit: null,
      name: "Avocado"
    });
  });
});
