export type NormalizedFoodCreateInput = {
  name: string;
};

export type NormalizedSavedFoodInput = {
  defaultGroceryCategoryId: string | null;
  defaultUnit: string | null;
  name: string;
};

export function normalizeFoodCreateInput(input: {
  name: string | null;
}): NormalizedFoodCreateInput {
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");

  if (!name) {
    throw new Error("Food name is required.");
  }

  return { name };
}

export function normalizeSavedFoodInput(input: {
  defaultGroceryCategoryId: string | null;
  defaultUnit: string | null;
  name: string | null;
}): NormalizedSavedFoodInput {
  const { name } = normalizeFoodCreateInput({ name: input.name });
  const defaultUnit = normalizeOptionalText(input.defaultUnit);
  const defaultGroceryCategoryId = normalizeOptionalText(
    input.defaultGroceryCategoryId
  );

  return {
    defaultGroceryCategoryId,
    defaultUnit,
    name
  };
}

export function foodNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function normalizeOptionalText(value: string | null) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  return text.length > 0 ? text : null;
}
