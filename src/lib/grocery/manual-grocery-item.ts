export type ManualGroceryItemInput = {
  displayName: string | null;
  note: string | null;
  quantity: string | null;
  unit: string | null;
};

export type NormalizedManualGroceryItemInput = {
  displayName: string;
  note: string | null;
  quantity: number | null;
  unit: string | null;
};

export function normalizeManualGroceryItemInput({
  displayName,
  note,
  quantity,
  unit
}: ManualGroceryItemInput): NormalizedManualGroceryItemInput {
  const normalizedDisplayName = normalizeText(displayName);

  if (!normalizedDisplayName) {
    throw new Error("Enter an item name.");
  }

  return {
    displayName: normalizedDisplayName,
    note: normalizeText(note),
    quantity: normalizeQuantity(quantity),
    unit: normalizeText(unit)
  };
}

export function buildManualGrocerySourceLabel(profileName: string | null) {
  const name = normalizeText(profileName) ?? "Household";

  return `Manual add for ${name}`;
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
