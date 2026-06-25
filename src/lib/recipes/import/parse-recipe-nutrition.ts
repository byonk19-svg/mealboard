export type ParsedRecipeNutrition = {
  caloriesPerServing: number | null;
  proteinGramsPerServing: number | null;
};

export function parseRecipeNutritionText(text: string): ParsedRecipeNutrition {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  return {
    caloriesPerServing: parseNutritionNumber(normalizedText, [
      /(?:calories|energy)\s*:?\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*(?:kcal|calories)\b/i
    ]),
    proteinGramsPerServing: parseNutritionNumber(normalizedText, [
      /protein\s*:?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)?\b/i,
      /(\d+(?:\.\d+)?)\s*(?:g|grams?)\s+protein\b/i
    ])
  };
}

function parseNutritionNumber(text: string, patterns: RegExp[]) {
  if (!text) {
    return null;
  }

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return null;
}
