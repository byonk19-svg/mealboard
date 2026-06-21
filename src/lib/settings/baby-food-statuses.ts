export type BabyFoodStatus = "tried" | "liked" | "disliked";

export type BabyFoodStatusInput = {
  foodId: string | null;
  lastOfferedOn: string | null;
  notes: string | null;
  prepNotes: string | null;
  status: string | null;
};

export type NormalizedBabyFoodStatusInput = {
  foodId: string;
  lastOfferedOn: string | null;
  notes: string | null;
  prepNotes: string | null;
  status: BabyFoodStatus;
};

export type BabyFoodStatusSummary = Record<BabyFoodStatus, number> & {
  total: number;
};

export const babyFoodStatuses = [
  "tried",
  "liked",
  "disliked"
] as const satisfies readonly BabyFoodStatus[];

export function normalizeBabyFoodStatusInput(
  input: BabyFoodStatusInput,
  options: { today?: Date | string } = {}
): NormalizedBabyFoodStatusInput {
  const foodId = normalizeText(input.foodId);

  if (!foodId) {
    throw new Error("Choose a food.");
  }

  if (!isBabyFoodStatus(input.status)) {
    throw new Error("Choose a baby food status.");
  }

  return {
    foodId,
    lastOfferedOn: normalizeLastOfferedOn(input.lastOfferedOn, options.today),
    notes: normalizeText(input.notes),
    prepNotes: normalizeText(input.prepNotes),
    status: input.status
  };
}

export function formatBabyFoodStatus(status: BabyFoodStatus) {
  const labels: Record<BabyFoodStatus, string> = {
    disliked: "Disliked",
    liked: "Liked",
    tried: "Tried"
  };

  return labels[status];
}

export function buildBabyFoodStatusSummary(
  rows: Array<{ status: BabyFoodStatus }>
): BabyFoodStatusSummary {
  return rows.reduce<BabyFoodStatusSummary>(
    (summary, row) => ({
      ...summary,
      [row.status]: summary[row.status] + 1,
      total: summary.total + 1
    }),
    {
      disliked: 0,
      liked: 0,
      total: 0,
      tried: 0
    }
  );
}

function isBabyFoodStatus(value: string | null): value is BabyFoodStatus {
  return babyFoodStatuses.includes(value as BabyFoodStatus);
}

function normalizeText(value: string | null) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.length > 0 ? text : null;
}

function normalizeLastOfferedOn(
  value: string | null,
  today: Date | string = new Date()
) {
  const dateText = normalizeText(value);

  if (!dateText) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("Last offered date must be a valid date.");
  }

  const parsed = new Date(`${dateText}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateText
  ) {
    throw new Error("Last offered date must be a valid date.");
  }

  const todayText =
    typeof today === "string"
      ? today.slice(0, 10)
      : formatLocalDate(today);

  if (dateText > todayText) {
    throw new Error("Last offered date cannot be in the future.");
  }

  return dateText;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
