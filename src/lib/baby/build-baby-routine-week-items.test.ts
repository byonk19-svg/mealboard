import { describe, expect, it } from "vitest";
import { buildBabyRoutineWeekItems } from "./build-baby-routine-week-items";
import type { BabyMealSuggestionSummary } from "./generate-baby-meals";

describe("buildBabyRoutineWeekItems", () => {
  it("repeats ready Baby Meal 1 and 2 routine slots across the week", () => {
    const items = buildBabyRoutineWeekItems({
      routine: routineSummary(),
      weekDateKeys: ["2026-06-21", "2026-06-22"]
    });

    expect(items.map((item) => `${item.planDate}:${item.babyPlanSlot}`)).toEqual([
      "2026-06-21:baby_meal_1",
      "2026-06-21:baby_meal_2",
      "2026-06-22:baby_meal_1",
      "2026-06-22:baby_meal_2"
    ]);
  });

  it("skips empty routine slots", () => {
    const routine = routineSummary();
    routine.slots[1] = {
      ...routine.slots[1],
      foodId: null,
      foodName: null,
      status: null
    };

    expect(
      buildBabyRoutineWeekItems({
        routine,
        weekDateKeys: ["2026-06-21"]
      })
    ).toHaveLength(1);
  });

  it("preserves locked existing baby slots when reapplying", () => {
    const items = buildBabyRoutineWeekItems({
      existingItems: [
        {
          baby_plan_slot: "baby_meal_2",
          is_locked: true,
          plan_date: "2026-06-21"
        }
      ],
      routine: routineSummary(),
      weekDateKeys: ["2026-06-21"]
    });

    expect(items.map((item) => item.babyPlanSlot)).toEqual(["baby_meal_1"]);
  });
});

function routineSummary(): BabyMealSuggestionSummary {
  return {
    readyFoodCount: 2,
    slots: [
      {
        foodId: "banana",
        foodName: "Banana",
        label: "Baby Meal 1",
        lastOfferedOn: null,
        notes: null,
        prepNotes: "Mashed",
        reason: "Liked food already tracked.",
        slot: "baby_meal_1",
        status: "liked"
      },
      {
        foodId: "yogurt",
        foodName: "Yogurt",
        label: "Baby Meal 2",
        lastOfferedOn: null,
        notes: null,
        prepNotes: null,
        reason: "Tried food already tracked.",
        slot: "baby_meal_2",
        status: "tried"
      }
    ],
    warnings: []
  };
}
