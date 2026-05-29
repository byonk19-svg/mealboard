export type StapleFrequency = "weekly" | "every_two_weeks" | "as_needed";

export type StapleInput = {
  displayName: string | null;
  frequency: string | null;
  notes: string | null;
  preferredQuantityText: string | null;
  quantity: string | null;
  unit: string | null;
};

export type NormalizedStapleInput = {
  displayName: string;
  frequency: StapleFrequency;
  notes: string | null;
  preferredQuantityText: string | null;
  quantity: number | null;
  unit: string | null;
};

export const stapleFrequencies = [
  "weekly",
  "every_two_weeks",
  "as_needed"
] as const satisfies readonly StapleFrequency[];

export function normalizeStapleInput({
  displayName,
  frequency,
  notes,
  preferredQuantityText,
  quantity,
  unit
}: StapleInput): NormalizedStapleInput {
  const normalizedDisplayName = normalizeText(displayName);

  if (!normalizedDisplayName) {
    throw new Error("Enter a staple name.");
  }

  if (!isStapleFrequency(frequency)) {
    throw new Error("Choose a staple frequency.");
  }

  return {
    displayName: normalizedDisplayName,
    frequency,
    notes: normalizeText(notes),
    preferredQuantityText: normalizeText(preferredQuantityText),
    quantity: normalizeQuantity(quantity),
    unit: normalizeText(unit)
  };
}

export function formatStapleFrequency(frequency: StapleFrequency) {
  const labels: Record<StapleFrequency, string> = {
    as_needed: "As needed",
    every_two_weeks: "Every 2 weeks",
    weekly: "Weekly"
  };

  return labels[frequency];
}

function isStapleFrequency(value: string | null): value is StapleFrequency {
  return stapleFrequencies.includes(value as StapleFrequency);
}

function normalizeText(value: string | null) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.length > 0 ? text : null;
}

function normalizeQuantity(value: string | null) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const quantity = Number(text);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  return quantity;
}
