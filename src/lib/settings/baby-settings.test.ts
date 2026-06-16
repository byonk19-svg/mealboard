import { describe, expect, it } from "vitest";
import type { MealProfile } from "@/lib/settings/types";
import {
  buildBabySettingsSummary,
  getBabyProfile,
  resolveSettingsReturnPath
} from "./baby-settings";

describe("getBabyProfile", () => {
  it("returns the baby meal profile when one exists", () => {
    expect(
      getBabyProfile([
        mealProfile({ id: "adult-1", name: "Brianna", profile_type: "adult" }),
        mealProfile({ id: "baby-1", name: "Baby", profile_type: "baby" })
      ])
    ).toMatchObject({ id: "baby-1", name: "Baby" });
  });

  it("returns null when there is no baby meal profile", () => {
    expect(
      getBabyProfile([
        mealProfile({ id: "adult-1", name: "Brianna", profile_type: "adult" })
      ])
    ).toBeNull();
  });
});

describe("buildBabySettingsSummary", () => {
  it("prompts setup when the baby profile is missing", () => {
    expect(buildBabySettingsSummary(null, "2026-06-15")).toMatchObject({
      nextStepText: "Create or restore a Baby meal profile before planning baby solids.",
      statusLabel: "Baby profile missing"
    });
  });

  it("prompts birthdate or override when baby stage is not configured", () => {
    expect(
      buildBabySettingsSummary(
        mealProfile({
          birthdate: null,
          baby_stage_override_months: null,
          profile_type: "baby"
        }),
        "2026-06-15"
      )
    ).toMatchObject({
      nextStepText: "Add a birthdate or manual stage override to unlock stage-aware solids planning.",
      statusLabel: "Stage setup needed"
    });
  });

  it("summarizes configured baby stage without medical language", () => {
    expect(
      buildBabySettingsSummary(
        mealProfile({
          birthdate: "2025-12-20",
          baby_stage_override_months: 8,
          profile_type: "baby"
        }),
        "2026-06-15"
      )
    ).toMatchObject({
      nextStepText: "Stage setup is ready. Baby food statuses and meal ideas can be added in later slices.",
      statusLabel: "Texture building"
    });
  });
});

describe("resolveSettingsReturnPath", () => {
  it("allows known settings return paths", () => {
    expect(resolveSettingsReturnPath("/settings/baby")).toBe("/settings/baby");
  });

  it("falls back to profiles for unknown paths", () => {
    expect(resolveSettingsReturnPath("https://example.com")).toBe(
      "/settings/profiles"
    );
  });
});

function mealProfile(overrides: Partial<MealProfile>): MealProfile {
  return {
    baby_stage_override_months: null,
    birthdate: null,
    color_label: null,
    default_daily_calorie_target: null,
    household_id: "household-1",
    id: "profile-1",
    name: "Profile",
    notes: null,
    off_day_calorie_target: null,
    profile_type: "adult",
    sort_order: 10,
    work_day_calorie_target: null,
    ...overrides
  };
}
