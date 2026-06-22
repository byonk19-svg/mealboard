import { describe, expect, it } from "vitest";
import {
  defaultBabyGuidanceContent,
  getBabyGuidanceForStage
} from "./baby-guidance";

describe("baby guidance content", () => {
  it("returns calm guidance for the resolved stage", () => {
    expect(getBabyGuidanceForStage("texture-building")).toEqual(
      expect.objectContaining({
        routineMealFocus: expect.stringContaining("tried and liked"),
        stageId: "texture-building",
        stageName: "Texture building",
        tryThisFocus: expect.stringContaining("one new food")
      })
    );
  });

  it("returns null when stage setup is missing", () => {
    expect(getBabyGuidanceForStage(null)).toBeNull();
  });

  it("returns null for unknown stages", () => {
    expect(getBabyGuidanceForStage("not-a-stage")).toBeNull();
  });

  it("keeps default stage guidance complete and calm", () => {
    expect(defaultBabyGuidanceContent).toHaveLength(4);

    for (const stage of defaultBabyGuidanceContent) {
      expect(stage.summary).not.toMatch(/danger|emergency|reaction/i);
      expect(stage.safetyNote).toContain("guidance");
      expect(stage.textureTips.length).toBeGreaterThan(0);
    }
  });

  it("keeps default stage ids unique", () => {
    const stageIds = defaultBabyGuidanceContent.map((stage) => stage.stageId);

    expect(new Set(stageIds).size).toBe(stageIds.length);
  });
});
