export type NormalizedFoodCreateInput = {
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

export function foodNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
