import { describe, expect, it } from "vitest";
import { normalizeBabyProfileInput } from "./baby-profile";

describe("normalizeBabyProfileInput", () => {
  it("normalizes blank baby profile fields to null", () => {
    expect(
      normalizeBabyProfileInput({
        birthdate: "",
        stageOverrideMonths: ""
      })
    ).toEqual({
      babyStageOverrideMonths: null,
      birthdate: null
    });
  });

  it("accepts a non-future birthdate and zero-based stage override", () => {
    expect(
      normalizeBabyProfileInput(
        {
          birthdate: "2025-12-20",
          stageOverrideMonths: "0"
        },
        { today: "2026-06-15" }
      )
    ).toEqual({
      babyStageOverrideMonths: 0,
      birthdate: "2025-12-20"
    });
  });

  it("rejects future baby birthdates", () => {
    expect(() =>
      normalizeBabyProfileInput(
        {
          birthdate: "2026-06-16",
          stageOverrideMonths: ""
        },
        { today: "2026-06-15" }
      )
    ).toThrow("Baby birthdate cannot be in the future.");
  });

  it("rejects invalid stage overrides", () => {
    expect(() =>
      normalizeBabyProfileInput({
        birthdate: "",
        stageOverrideMonths: "2.5"
      })
    ).toThrow("Baby stage override must be zero or a positive whole number.");
  });
});
