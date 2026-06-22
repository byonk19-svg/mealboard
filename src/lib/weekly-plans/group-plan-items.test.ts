import { describe, expect, it } from "vitest";
import {
  buildPlanItemsByProfile,
  formatBabyPlanSlotLabel
} from "./group-plan-items";
import type { MealProfile } from "@/lib/settings/types";
import type { WeeklyPlanItem } from "./types";

describe("buildPlanItemsByProfile", () => {
  it("groups items by profile and keeps baby meal slots explicit", () => {
    const groups = buildPlanItemsByProfile({
      planItems: [
        planItem({
          baby_plan_slot: null,
          display_name: "Turkey Taco Bowl",
          id: "adult-1",
          meal_profile_id: "brianna",
          meal_profile_name: "Brianna"
        }),
        planItem({
          baby_plan_slot: "baby_meal_1",
          display_name: "Baby Meal 1: Banana",
          id: "baby-1",
          meal_profile_id: "baby",
          meal_profile_name: "Baby",
          meal_type: "baby_meal"
        }),
        planItem({
          baby_plan_slot: "baby_meal_2",
          display_name: "Baby Meal 2: Yogurt",
          id: "baby-2",
          meal_profile_id: "baby",
          meal_profile_name: "Baby",
          meal_type: "baby_meal"
        }),
        planItem({
          baby_plan_slot: null,
          display_name: "Shared Rice",
          id: "shared-1",
          meal_profile_id: "shared",
          meal_profile_name: "Shared/Family"
        })
      ]
    });

    expect(groups.map((group) => group.profileName)).toEqual([
      "Brianna",
      "Baby",
      "Shared/Family"
    ]);
    expect(groups[1]?.items.map((item) => item.slotLabel)).toEqual([
      "Baby Meal 1",
      "Baby Meal 2"
    ]);
  });

  it("falls back to Unassigned when a profile label is missing", () => {
    const groups = buildPlanItemsByProfile({
      planItems: [
        planItem({
          id: "unassigned-1",
          meal_profile_id: null,
          meal_profile_name: null
        })
      ]
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.profileName).toBe("Unassigned");
  });

  it("keeps configured profile order and renders empty profile groups", () => {
    const groups = buildPlanItemsByProfile({
      planItems: [
        planItem({
          display_name: "Baby Meal 1: Banana",
          meal_profile_id: "baby",
          meal_profile_name: "Baby"
        })
      ],
      profiles: [
        profile({ id: "brianna", name: "Brianna" }),
        profile({ id: "elaine", name: "Elaine" }),
        profile({ id: "baby", name: "Baby", profile_type: "baby" }),
        profile({ id: "shared", name: "Shared/Family", profile_type: "shared" })
      ]
    });

    expect(groups.map((group) => group.profileName)).toEqual([
      "Brianna",
      "Elaine",
      "Baby",
      "Shared/Family"
    ]);
    expect(groups.map((group) => group.items)).toHaveLength(4);
    expect(groups[0]?.items).toEqual([]);
    expect(groups[2]?.items).toHaveLength(1);
  });
});

describe("formatBabyPlanSlotLabel", () => {
  it("formats known baby meal slots for user-facing copy", () => {
    expect(formatBabyPlanSlotLabel("baby_meal_1")).toBe("Baby Meal 1");
    expect(formatBabyPlanSlotLabel("baby_meal_2")).toBe("Baby Meal 2");
  });
});

function planItem(overrides: Partial<WeeklyPlanItem>): WeeklyPlanItem {
  return {
    baby_plan_slot: null,
    component_type: "main",
    display_name: "Meal",
    estimated_calories: null,
    estimated_protein_grams: null,
    food_id: null,
    id: "item",
    is_approved: false,
    is_backup: false,
    is_locked: false,
    is_try_this: false,
    meal_profile_id: "profile",
    meal_profile_name: "Brianna",
    meal_profile_type: "adult",
    meal_type: "dinner",
    notes: null,
    plan_date: "2026-06-21",
    reason_labels: [],
    recipe_id: "recipe",
    recipe_name: "Meal",
    scale_factor: 1,
    sort_order: 0,
    weekly_plan_id: "week",
    why_this: null,
    ...overrides
  };
}

function profile(overrides: Partial<MealProfile>): MealProfile {
  return {
    baby_stage_override_months: null,
    birthdate: null,
    color_label: null,
    default_daily_calorie_target: null,
    household_id: "household",
    id: "profile",
    name: "Profile",
    notes: null,
    off_day_calorie_target: null,
    profile_type: "adult",
    sort_order: 0,
    work_day_calorie_target: null,
    ...overrides
  };
}
