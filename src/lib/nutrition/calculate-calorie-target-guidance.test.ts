import { describe, expect, it } from "vitest";
import {
  calculateCalorieTargetGuidance,
  getCalorieGuidanceKey,
  summarizeCalorieTargetGuidance
} from "./calculate-calorie-target-guidance";
import type { DailyNutritionSummary } from "./calculate-daily-totals";
import type { MealProfile } from "@/lib/settings/types";
import type {
  WeeklyPlanProfileDay
} from "@/lib/weekly-plans/types";

describe("calculateCalorieTargetGuidance", () => {
  it("uses work/off day targets before the default target", () => {
    const guidance = calculateCalorieTargetGuidance({
      profileDays: [
        profileDay({
          adult_day_type: "work_day",
          meal_profile_id: "profile-brianna",
          plan_date: "2026-05-24"
        })
      ],
      profiles: [
        profile({
          default_daily_calorie_target: 1800,
          id: "profile-brianna",
          work_day_calorie_target: 1600
        })
      ],
      strictness: "flexible",
      summaries: [
        summary({
          calories: 1200,
          mealProfileId: "profile-brianna",
          date: "2026-05-24"
        })
      ]
    });

    expect(guidance[0]).toMatchObject({
      calorieTarget: 1600,
      difference: -400,
      status: "under"
    });
  });

  it("keeps loose weeks informational instead of warning over or under", () => {
    const guidance = calculateCalorieTargetGuidance({
      profileDays: [],
      profiles: [profile({ id: "profile-brianna" })],
      strictness: "loose",
      summaries: [
        summary({
          calories: 900,
          mealProfileId: "profile-brianna"
        })
      ]
    });

    expect(guidance[0]).toMatchObject({
      calorieTarget: 1800,
      difference: -900,
      status: "guidance_only",
      tone: "neutral"
    });
  });

  it("does not compare missing calorie estimates to the target as zero", () => {
    const guidance = calculateCalorieTargetGuidance({
      profileDays: [],
      profiles: [profile({ id: "profile-brianna" })],
      strictness: "strict",
      summaries: [
        summary({
          calories: null,
          knownCalorieItems: 0,
          mealProfileId: "profile-brianna",
          unknownCalorieItems: 2
        })
      ]
    });

    expect(guidance[0]).toMatchObject({
      calorieTarget: 1800,
      difference: null,
      status: "unknown",
      tone: "caution"
    });
  });

  it("omits guidance for profiles without a calorie target", () => {
    const guidance = calculateCalorieTargetGuidance({
      profileDays: [],
      profiles: [
        profile({
          default_daily_calorie_target: null,
          id: "profile-brianna"
        })
      ],
      strictness: "flexible",
      summaries: [summary({ mealProfileId: "profile-brianna" })]
    });

    expect(guidance).toEqual([]);
  });

  it("returns stable profile/day keys for display lookups", () => {
    expect(getCalorieGuidanceKey("profile-brianna", "2026-05-24")).toBe(
      "profile-brianna:2026-05-24"
    );
  });

  it("summarizes current-week target guidance into dashboard-safe counts", () => {
    expect(
      summarizeCalorieTargetGuidance([
        guidance({ status: "unknown" }),
        guidance({ status: "under" }),
        guidance({ status: "over" }),
        guidance({ status: "near" }),
        guidance({ status: "guidance_only" })
      ])
    ).toEqual({
      guidanceOnlyCount: 1,
      nearCount: 1,
      overCount: 1,
      underCount: 1,
      unknownCount: 1
    });
  });
});

function profile(overrides: Partial<MealProfile>): MealProfile {
  return {
    baby_stage_override_months: null,
    birthdate: null,
    color_label: null,
    default_daily_calorie_target: 1800,
    household_id: "household-1",
    id: "profile-brianna",
    name: "Brianna",
    notes: null,
    off_day_calorie_target: null,
    profile_type: "adult",
    sort_order: 1,
    work_day_calorie_target: null,
    ...overrides
  };
}

function profileDay(
  overrides: Partial<WeeklyPlanProfileDay>
): WeeklyPlanProfileDay {
  return {
    adult_day_type: null,
    day_label: null,
    id: "profile-day-1",
    meal_profile_id: "profile-brianna",
    plan_date: "2026-05-24",
    weekly_plan_id: "week-1",
    ...overrides
  };
}

function summary(
  overrides: Partial<DailyNutritionSummary>
): DailyNutritionSummary {
  return {
    calories: 1800,
    date: "2026-05-24",
    itemCount: 2,
    knownCalorieItems: 2,
    knownProteinItems: 2,
    mealProfileId: "profile-brianna",
    mealProfileName: "Brianna",
    proteinGrams: 80,
    unknownCalorieItems: 0,
    unknownProteinItems: 0,
    ...overrides
  };
}

function guidance(
  overrides: Partial<ReturnType<typeof calculateCalorieTargetGuidance>[number]>
): ReturnType<typeof calculateCalorieTargetGuidance>[number] {
  return {
    calorieTarget: 1800,
    date: "2026-05-24",
    difference: 0,
    mealProfileId: "profile-brianna",
    status: "near",
    tone: "ok",
    ...overrides
  };
}
