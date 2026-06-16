import { describe, expect, it } from "vitest";
import {
  defaultBabyGuidanceStages,
  resolveBabyStage
} from "./resolve-baby-stage";

describe("resolveBabyStage", () => {
  it("resolves completed age months from birthdate", () => {
    const resolution = resolveBabyStage({
      asOfDate: "2026-06-15",
      birthdate: "2025-12-20"
    });

    expect(resolution).toMatchObject({
      ageMonths: 5,
      effectiveStageMonths: 5,
      guidanceStageId: "supported-start",
      stageName: "Supported start",
      setupWarning: null,
      usedOverride: false
    });
  });

  it("uses manual override months for stage matching while preserving age", () => {
    const resolution = resolveBabyStage({
      asOfDate: "2026-06-15",
      birthdate: "2025-12-20",
      overrideMonths: 8
    });

    expect(resolution).toMatchObject({
      ageMonths: 5,
      effectiveStageMonths: 8,
      guidanceStageId: "texture-building",
      stageName: "Texture building",
      setupWarning: null,
      usedOverride: true
    });
  });

  it("can use an override when birthdate is missing", () => {
    const resolution = resolveBabyStage({
      asOfDate: "2026-06-15",
      birthdate: null,
      overrideMonths: 10
    });

    expect(resolution).toMatchObject({
      ageMonths: null,
      effectiveStageMonths: 10,
      guidanceStageId: "family-food-practice",
      stageName: "Family food practice",
      setupWarning: null,
      usedOverride: true
    });
  });

  it("returns a setup warning when birthdate and override are missing", () => {
    const resolution = resolveBabyStage({
      asOfDate: "2026-06-15",
      birthdate: null
    });

    expect(resolution).toMatchObject({
      ageMonths: null,
      effectiveStageMonths: null,
      guidanceStageId: null,
      stageName: null,
      setupWarning: "Add baby's birthdate or a stage override for better solids planning.",
      usedOverride: false
    });
  });

  it("matches caller-provided stages by inclusive month range", () => {
    const resolution = resolveBabyStage({
      asOfDate: "2026-06-15",
      birthdate: "2026-01-15",
      guidanceStages: [
        {
          id: "custom-five-months",
          maxMonths: 5,
          minMonths: 5,
          stageName: "Custom five-month stage"
        }
      ]
    });

    expect(resolution.stageName).toBe("Custom five-month stage");
  });

  it("keeps default stage ranges ordered and non-overlapping", () => {
    expect(defaultBabyGuidanceStages).toEqual([
      expect.objectContaining({ id: "supported-start", minMonths: 4 }),
      expect.objectContaining({ id: "texture-building", minMonths: 7 }),
      expect.objectContaining({ id: "family-food-practice", minMonths: 10 }),
      expect.objectContaining({ id: "toddler-transition", minMonths: 13 })
    ]);
  });
});
