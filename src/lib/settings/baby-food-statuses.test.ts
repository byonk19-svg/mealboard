import { describe, expect, it } from "vitest";
import {
  babyFoodStatuses,
  buildBabyFoodStatusSummary,
  formatBabyFoodStatus,
  normalizeBabyFoodStatusInput
} from "./baby-food-statuses";

describe("baby food status settings helpers", () => {
  it("exposes the supported baby food statuses in planning order", () => {
    expect(babyFoodStatuses).toEqual(["tried", "liked", "disliked"]);
  });

  it("normalizes baby food status form input", () => {
    expect(
      normalizeBabyFoodStatusInput(
        {
          lastOfferedOn: "2026-06-18",
          foodId: "  food-1 ",
          notes: "  went well   with oatmeal ",
          prepNotes: "  mashed soft  ",
          status: "liked"
        },
        { today: "2026-06-21" }
      )
    ).toEqual({
      lastOfferedOn: "2026-06-18",
      foodId: "food-1",
      notes: "went well with oatmeal",
      prepNotes: "mashed soft",
      status: "liked"
    });
  });

  it("allows empty optional fields", () => {
    expect(
      normalizeBabyFoodStatusInput(
        {
          lastOfferedOn: "",
          foodId: "food-1",
          notes: " ",
          prepNotes: null,
          status: "tried"
        },
        { today: "2026-06-21" }
      )
    ).toEqual({
      lastOfferedOn: null,
      foodId: "food-1",
      notes: null,
      prepNotes: null,
      status: "tried"
    });
  });

  it("rejects missing food ids", () => {
    expect(() =>
      normalizeBabyFoodStatusInput(
        {
          lastOfferedOn: null,
          foodId: " ",
          notes: null,
          prepNotes: null,
          status: "tried"
        },
        { today: "2026-06-21" }
      )
    ).toThrow("Choose a food.");
  });

  it("rejects invalid statuses", () => {
    expect(() =>
      normalizeBabyFoodStatusInput(
        {
          lastOfferedOn: null,
          foodId: "food-1",
          notes: null,
          prepNotes: null,
          status: "favorite"
        },
        { today: "2026-06-21" }
      )
    ).toThrow("Choose a baby food status.");
  });

  it("rejects invalid last offered dates", () => {
    expect(() =>
      normalizeBabyFoodStatusInput(
        {
          lastOfferedOn: "2026-99-99",
          foodId: "food-1",
          notes: null,
          prepNotes: null,
          status: "tried"
        },
        { today: "2026-06-21" }
      )
    ).toThrow("Last offered date must be a valid date.");
  });

  it("rejects future last offered dates", () => {
    expect(() =>
      normalizeBabyFoodStatusInput(
        {
          lastOfferedOn: "2026-06-22",
          foodId: "food-1",
          notes: null,
          prepNotes: null,
          status: "tried"
        },
        { today: "2026-06-21" }
      )
    ).toThrow("Last offered date cannot be in the future.");
  });

  it("compares Date-based today values by local calendar day", () => {
    expect(
      normalizeBabyFoodStatusInput(
        {
          foodId: "food-1",
          lastOfferedOn: "2026-06-21",
          notes: null,
          prepNotes: null,
          status: "tried"
        },
        { today: new Date(2026, 5, 21, 20, 30) }
      )
    ).toMatchObject({
      lastOfferedOn: "2026-06-21"
    });
  });

  it("formats statuses for display", () => {
    expect(formatBabyFoodStatus("disliked")).toBe("Disliked");
  });

  it("summarizes tracked baby food status counts", () => {
    expect(
      buildBabyFoodStatusSummary([
        { status: "tried" },
        { status: "liked" },
        { status: "liked" },
        { status: "disliked" }
      ])
    ).toEqual({
      disliked: 1,
      liked: 2,
      total: 4,
      tried: 1
    });
  });

  it("summarizes empty tracked baby food statuses", () => {
    expect(buildBabyFoodStatusSummary([])).toEqual({
      disliked: 0,
      liked: 0,
      total: 0,
      tried: 0
    });
  });
});
