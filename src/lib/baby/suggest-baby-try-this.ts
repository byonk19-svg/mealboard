import type { BabyFoodStatus } from "@/lib/settings/baby-food-statuses";

export type BabyTryThisFood = {
  id: string;
  name: string;
};

export type BabyTryThisStatus = {
  food_id: string;
  status: BabyFoodStatus;
};

export type BabyTryThisCandidate = {
  foodId: string;
  foodName: string;
  reason: string;
};

export type BabyTryThisSuggestion = {
  availableFoodCount: number;
  candidate: BabyTryThisCandidate | null;
  warning: string | null;
};

export function suggestBabyTryThis({
  blockedFoodIds = [],
  foods,
  stageReady = true,
  statuses
}: {
  blockedFoodIds?: string[];
  foods: BabyTryThisFood[];
  stageReady?: boolean;
  statuses: BabyTryThisStatus[];
}): BabyTryThisSuggestion {
  if (!stageReady) {
    return {
      availableFoodCount: 0,
      candidate: null,
      warning: "Add baby's stage setup before showing Try This ideas."
    };
  }

  const trackedFoodIds = new Set(statuses.map((status) => status.food_id));
  const blockedFoodIdSet = new Set(blockedFoodIds);
  const candidates = dedupeFoods(foods)
    .filter(
      (food) => !trackedFoodIds.has(food.id) && !blockedFoodIdSet.has(food.id)
    )
    .sort(compareFoods);
  const candidate = candidates[0] ?? null;

  if (!candidate) {
    return {
      availableFoodCount: 0,
      candidate: null,
      warning: "Add more foods before showing a Try This idea."
    };
  }

  return {
    availableFoodCount: candidates.length,
    candidate: {
      foodId: candidate.id,
      foodName: candidate.name,
      reason: "Untracked food to consider separately from routine meals."
    },
    warning: null
  };
}

function dedupeFoods(foods: BabyTryThisFood[]) {
  const byId = new Map<string, BabyTryThisFood>();

  for (const food of foods) {
    if (!byId.has(food.id)) {
      byId.set(food.id, { ...food });
    }
  }

  return Array.from(byId.values());
}

function compareFoods(first: BabyTryThisFood, second: BabyTryThisFood) {
  return (
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" }) ||
    first.id.localeCompare(second.id)
  );
}
