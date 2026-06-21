import type { BabyFoodStatus } from "@/lib/settings/baby-food-statuses";

export type BabyMealCandidate = {
  food_id: string;
  food_name: string;
  last_offered_on: string | null;
  notes?: string | null;
  prep_notes: string | null;
  status: BabyFoodStatus;
};

export type BabyMealSlot = "baby_meal_1" | "baby_meal_2";

export type BabyMealSuggestion = {
  foodId: string | null;
  foodName: string | null;
  lastOfferedOn: string | null;
  notes: string | null;
  label: "Baby Meal 1" | "Baby Meal 2";
  prepNotes: string | null;
  reason: string;
  slot: BabyMealSlot;
  status: "liked" | "tried" | null;
};

export type BabyMealSuggestionSummary = {
  readyFoodCount: number;
  slots: BabyMealSuggestion[];
  warnings: string[];
};

const emptyWarnings = {
  none: "Add tried or liked baby foods before routine baby meal suggestions.",
  one: "Add one more tried or liked baby food to fill both routine baby meals."
} as const;

export function generateBabyMeals(
  foods: BabyMealCandidate[],
  options: { stageName?: string | null } = {}
): BabyMealSuggestionSummary {
  const candidates = dedupeByFood(foods)
    .sort(compareRoutineCandidates);
  const slots = [0, 1].map((index) =>
    buildSlot(index, candidates[index] ?? null, options.stageName ?? null)
  );

  return {
    readyFoodCount: candidates.length,
    slots,
    warnings: getWarnings(candidates.length)
  };
}

function isRoutineCandidate(
  food: BabyMealCandidate
): food is BabyMealCandidate & { status: "liked" | "tried" } {
  return food.status === "liked" || food.status === "tried";
}

function dedupeByFood(foods: BabyMealCandidate[]) {
  const byFood = new Map<
    string,
    BabyMealCandidate & { status: "liked" | "tried" }
  >();

  for (const food of foods) {
    if (!isRoutineCandidate(food)) {
      continue;
    }

    const current = byFood.get(food.food_id);

    if (!current || compareCandidateStrength(food, current) < 0) {
      byFood.set(food.food_id, { ...food });
    }
  }

  return Array.from(byFood.values());
}

function compareCandidateStrength(
  first: BabyMealCandidate & { status: "liked" | "tried" },
  second: BabyMealCandidate & { status: "liked" | "tried" }
) {
  const statusComparison =
    getStatusPriority(first.status) - getStatusPriority(second.status);

  if (statusComparison !== 0) {
    return statusComparison;
  }

  const firstHasPrep = first.prep_notes ? 0 : 1;
  const secondHasPrep = second.prep_notes ? 0 : 1;

  if (firstHasPrep !== secondHasPrep) {
    return firstHasPrep - secondHasPrep;
  }

  return compareRoutineCandidates(first, second);
}

function compareRoutineCandidates(
  first: BabyMealCandidate & { status: "liked" | "tried" },
  second: BabyMealCandidate & { status: "liked" | "tried" }
) {
  const statusComparison =
    getStatusPriority(first.status) - getStatusPriority(second.status);

  if (statusComparison !== 0) {
    return statusComparison;
  }

  const firstDate = first.last_offered_on ?? "9999-12-31";
  const secondDate = second.last_offered_on ?? "9999-12-31";

  if (firstDate !== secondDate) {
    return firstDate.localeCompare(secondDate);
  }

  return first.food_name.localeCompare(second.food_name, undefined, {
    sensitivity: "base"
  }) || first.food_id.localeCompare(second.food_id);
}

function getStatusPriority(status: "liked" | "tried") {
  return status === "liked" ? 0 : 1;
}

function buildSlot(
  index: number,
  food: (BabyMealCandidate & { status: "liked" | "tried" }) | null,
  stageName: string | null
): BabyMealSuggestion {
  const slot = index === 0 ? "baby_meal_1" : "baby_meal_2";
  const label = index === 0 ? "Baby Meal 1" : "Baby Meal 2";

  if (!food) {
    return {
      foodId: null,
      foodName: null,
      lastOfferedOn: null,
      notes: null,
      label,
      prepNotes: null,
      reason: "Add more tried or liked foods to fill this routine meal.",
      slot,
      status: null
    };
  }

  const statusLabel = food.status === "liked" ? "Liked" : "Tried";
  const context = stageName ? ` for ${stageName}` : "";

  return {
    foodId: food.food_id,
    foodName: food.food_name,
    lastOfferedOn: food.last_offered_on,
    notes: food.notes ?? null,
    label,
    prepNotes: food.prep_notes,
    reason: `${statusLabel} food already tracked${context}.`,
    slot,
    status: food.status
  };
}

function getWarnings(readyFoodCount: number) {
  if (readyFoodCount === 0) {
    return [emptyWarnings.none];
  }

  if (readyFoodCount === 1) {
    return [emptyWarnings.one];
  }

  return [];
}
