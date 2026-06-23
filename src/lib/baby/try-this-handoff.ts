import type { BabyFoodStatus } from "@/lib/settings/baby-food-statuses";
import type { BabyTryThisCandidate } from "./suggest-baby-try-this";

export type BabyTryThisStatusDefaults = {
  foodId: string;
  lastOfferedOn: string;
  notes: string;
  status: BabyFoodStatus;
};

export function buildBabyTryThisStatusDefaults({
  candidate,
  today
}: {
  candidate: BabyTryThisCandidate | null;
  today: Date;
}): BabyTryThisStatusDefaults | null {
  if (!candidate) {
    return null;
  }

  return {
    foodId: candidate.foodId,
    lastOfferedOn: formatDateKey(today),
    notes: `Try This: ${candidate.foodName}`,
    status: "tried"
  };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
