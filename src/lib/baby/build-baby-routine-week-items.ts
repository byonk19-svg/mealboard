import type { BabyMealSuggestionSummary, BabyMealSlot } from "./generate-baby-meals";

export type BabyRoutineWeekItem = {
  babyPlanSlot: BabyMealSlot;
  displayName: string;
  foodId: string;
  notes: string | null;
  planDate: string;
  reasonLabels: string[];
  whyThis: string;
};

export type ExistingBabyRoutineItem = {
  baby_plan_slot: BabyMealSlot | null;
  is_locked: boolean;
  plan_date: string;
};

export function buildBabyRoutineWeekItems({
  existingItems = [],
  routine,
  weekDateKeys
}: {
  existingItems?: ExistingBabyRoutineItem[];
  routine: BabyMealSuggestionSummary;
  weekDateKeys: string[];
}): BabyRoutineWeekItem[] {
  const lockedSlots = new Set(
    existingItems
      .filter((item) => item.is_locked && item.baby_plan_slot)
      .map((item) => `${item.plan_date}:${item.baby_plan_slot}`)
  );
  const readySlots = routine.slots.filter(
    (slot): slot is typeof slot & { foodId: string; foodName: string } =>
      Boolean(slot.foodId && slot.foodName)
  );

  return weekDateKeys.flatMap((planDate) =>
    readySlots
      .filter((slot) => !lockedSlots.has(`${planDate}:${slot.slot}`))
      .map((slot) => ({
        babyPlanSlot: slot.slot,
        displayName: `${slot.label}: ${slot.foodName}`,
        foodId: slot.foodId,
        notes: slot.prepNotes,
        planDate,
        reasonLabels: [slot.label, slot.status === "liked" ? "Liked food" : "Tried food"],
        whyThis: slot.reason
      }))
  );
}
