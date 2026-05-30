import { describe, expect, it } from "vitest";
import {
  buildPlanWeekSummary,
  type PlanWeekSummaryItem
} from "./plan-week-summary";

describe("buildPlanWeekSummary", () => {
  it("summarizes planned, approved, locked, and missing estimate counts", () => {
    expect(
      buildPlanWeekSummary({
        planItems: [
          planItem({
            estimated_calories: 430,
            estimated_protein_grams: 22,
            is_approved: true,
            is_locked: true,
            plan_date: "2026-05-24"
          }),
          planItem({
            estimated_calories: null,
            estimated_protein_grams: 18,
            is_approved: false,
            is_locked: false,
            plan_date: "2026-05-25"
          })
        ],
        selectedStapleCount: 1,
        weekDateKeys: ["2026-05-24", "2026-05-25", "2026-05-26"]
      })
    ).toMatchObject({
      approvedItemCount: 1,
      daysWithPlannedItems: 2,
      emptyDayCount: 1,
      lockedItemCount: 1,
      missingEstimateItemCount: 1,
      readyForGroceryCount: 2,
      selectedStapleCount: 1,
      totalItemCount: 2,
      unapprovedItemCount: 1
    });
  });

  it("prioritizes adding recipes when the week is empty", () => {
    const summary = buildPlanWeekSummary({
      planItems: [],
      selectedStapleCount: 0,
      weekDateKeys: ["2026-05-24", "2026-05-25"]
    });

    expect(summary.primaryAttention).toEqual({
      description: "Start by adding recipes to the days and profiles that need coverage.",
      label: "Add meals to this week",
      tone: "attention"
    });
  });

  it("prioritizes approving planned meals before grocery generation", () => {
    const summary = buildPlanWeekSummary({
      planItems: [
        planItem({
          is_approved: false,
          plan_date: "2026-05-24"
        }),
        planItem({
          is_approved: true,
          plan_date: "2026-05-25"
        })
      ],
      selectedStapleCount: 0,
      weekDateKeys: ["2026-05-24", "2026-05-25"]
    });

    expect(summary.primaryAttention).toEqual({
      description: "Approve 1 planned item before relying on it for groceries.",
      label: "Review planned meals",
      tone: "attention"
    });
  });

  it("treats missing nutrition estimates as a non-blocking cue", () => {
    const summary = buildPlanWeekSummary({
      planItems: [
        planItem({
          estimated_calories: null,
          estimated_protein_grams: 12,
          is_approved: true,
          plan_date: "2026-05-24"
        })
      ],
      selectedStapleCount: 0,
      weekDateKeys: ["2026-05-24"]
    });

    expect(summary.primaryAttention).toEqual({
      description: "1 planned item is missing calories or protein. Grocery generation can still continue.",
      label: "Nutrition estimates need data",
      tone: "info"
    });
  });

  it("uses plural copy for multiple missing nutrition estimates", () => {
    const summary = buildPlanWeekSummary({
      planItems: [
        planItem({
          estimated_calories: null,
          estimated_protein_grams: 12,
          is_approved: true,
          plan_date: "2026-05-24"
        }),
        planItem({
          estimated_calories: 300,
          estimated_protein_grams: null,
          is_approved: true,
          plan_date: "2026-05-25"
        })
      ],
      selectedStapleCount: 0,
      weekDateKeys: ["2026-05-24", "2026-05-25"]
    });

    expect(summary.primaryAttention.description).toBe(
      "2 planned items are missing calories or protein. Grocery generation can still continue."
    );
  });

  it("marks the week ready when approved items or selected staples exist", () => {
    const summary = buildPlanWeekSummary({
      planItems: [
        planItem({
          estimated_calories: 300,
          estimated_protein_grams: 20,
          is_approved: true,
          plan_date: "2026-05-24"
        })
      ],
      selectedStapleCount: 1,
      weekDateKeys: ["2026-05-24"]
    });

    expect(summary.primaryAttention).toEqual({
      description: "Approved recipes or selected staples are ready for the grocery list.",
      label: "Ready for grocery generation",
      tone: "success"
    });
  });

  it("does not block selected staple grocery readiness when no meals are planned", () => {
    const summary = buildPlanWeekSummary({
      planItems: [],
      selectedStapleCount: 1,
      weekDateKeys: ["2026-05-24"]
    });

    expect(summary.primaryAttention).toEqual({
      description: "Approved recipes or selected staples are ready for the grocery list.",
      label: "Ready for grocery generation",
      tone: "success"
    });
  });
});

function planItem(overrides: Partial<PlanWeekSummaryItem>): PlanWeekSummaryItem {
  return {
    estimated_calories: 100,
    estimated_protein_grams: 10,
    is_approved: false,
    is_locked: false,
    plan_date: "2026-05-24",
    recipe_id: "recipe-1",
    ...overrides
  };
}
