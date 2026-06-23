import { describe, expect, it } from "vitest";
import { buildBabyTryThisStatusDefaults } from "./try-this-handoff";

describe("buildBabyTryThisStatusDefaults", () => {
  it("prepares a Try This candidate for explicit status tracking", () => {
    expect(
      buildBabyTryThisStatusDefaults({
        candidate: {
          foodId: "food-1",
          foodName: "Avocado",
          reason: "Untracked food to consider separately from routine meals."
        },
        today: new Date("2026-06-23T13:00:00.000Z")
      })
    ).toEqual({
      foodId: "food-1",
      lastOfferedOn: "2026-06-23",
      notes: "Try This: Avocado",
      status: "tried"
    });
  });

  it("returns null when there is no candidate to track", () => {
    expect(
      buildBabyTryThisStatusDefaults({
        candidate: null,
        today: new Date("2026-06-23T13:00:00.000Z")
      })
    ).toBeNull();
  });
});
