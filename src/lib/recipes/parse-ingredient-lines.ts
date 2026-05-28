export type ParsedIngredientLine = {
  originalLine: string;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  notes: string | null;
  needsReview: boolean;
  reviewReason: string | null;
};

const knownUnits = new Set([
  "bag",
  "bags",
  "bottle",
  "bottles",
  "box",
  "boxes",
  "bunch",
  "bunches",
  "can",
  "cans",
  "clove",
  "cloves",
  "container",
  "containers",
  "count",
  "cup",
  "cups",
  "g",
  "gram",
  "grams",
  "lb",
  "lbs",
  "oz",
  "pack",
  "package",
  "packages",
  "packs",
  "packet",
  "packets",
  "piece",
  "pieces",
  "pint",
  "pints",
  "qt",
  "quart",
  "quarts",
  "slice",
  "slices",
  "tbsp",
  "teaspoon",
  "teaspoons",
  "tablespoon",
  "tablespoons",
  "tsp"
]);

const preparationWords = new Set([
  "chopped",
  "cooked",
  "crushed",
  "diced",
  "drained",
  "fresh",
  "frozen",
  "grated",
  "ground",
  "large",
  "medium",
  "minced",
  "rinsed",
  "shredded",
  "sliced",
  "small"
]);

export function parseIngredientText(text: string): ParsedIngredientLine[] {
  return text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)
    .map(parseIngredientLine);
}

function parseIngredientLine(line: string): ParsedIngredientLine {
  const originalLine = line;
  const packageMatch = line.match(/\(([^)]+)\)/);
  const packageNote = packageMatch?.[1]?.trim() ?? null;
  let remaining = line.replace(/\([^)]+\)/g, " ").replace(/\s+/g, " ").trim();
  const commaParts = remaining.split(",").map((part) => part.trim());
  remaining = commaParts[0] ?? remaining;
  const commaPreparation = commaParts.slice(1).join(", ") || null;
  const toTasteMatch = remaining.match(/\bto taste\b/i);
  const toTasteNote = toTasteMatch ? "to taste" : null;
  remaining = remaining.replace(/\bto taste\b/gi, "").trim();
  const tokens = remaining.split(/\s+/).filter(Boolean);
  const quantityResult = parseQuantity(tokens);
  const unitResult = parseUnit(tokens, quantityResult.nextIndex);
  const words = tokens.slice(unitResult.nextIndex);
  const extractedPreparation = extractLeadingPreparation(words);
  const displayName = extractedPreparation.words.join(" ").trim();
  const notes = [packageNote, toTasteNote].filter(Boolean).join("; ") || null;
  const preparation = [extractedPreparation.preparation, commaPreparation]
    .filter(Boolean)
    .join(", ") || null;
  const needsReview = displayName.length === 0 || quantityResult.value === null || unitResult.unit === null;

  return {
    originalLine,
    displayName: displayName || remaining || originalLine,
    quantity: quantityResult.value,
    unit: unitResult.unit,
    preparation,
    notes,
    needsReview,
    reviewReason: needsReview ? "Quantity or unit needs review." : null
  };
}

function normalizeLine(line: string) {
  return line
    .trim()
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function parseQuantity(tokens: string[]) {
  const first = tokens[0];
  const second = tokens[1];

  if (!first) {
    return { value: null, nextIndex: 0 };
  }

  if (isNumber(first) && isFraction(second)) {
    return {
      value: Number(first) + parseFraction(second),
      nextIndex: 2
    };
  }

  if (isFraction(first)) {
    return {
      value: parseFraction(first),
      nextIndex: 1
    };
  }

  if (isNumber(first)) {
    return {
      value: Number(first),
      nextIndex: 1
    };
  }

  return { value: null, nextIndex: 0 };
}

function parseUnit(tokens: string[], index: number) {
  const unit = tokens[index]?.toLowerCase().replace(/[.]/g, "") ?? null;

  if (unit && knownUnits.has(unit)) {
    return { unit, nextIndex: index + 1 };
  }

  return { unit: null, nextIndex: index };
}

function extractLeadingPreparation(words: string[]) {
  const preparation: string[] = [];
  let index = 0;

  while (index < words.length) {
    const word = words[index]?.toLowerCase().replace(/,$/, "") ?? "";

    if (!preparationWords.has(word)) {
      break;
    }

    preparation.push(words[index]);
    index += 1;
  }

  return {
    preparation: preparation.join(" ") || null,
    words: words.slice(index)
  };
}

function isNumber(value: string | undefined) {
  return value !== undefined && /^\d+(\.\d+)?$/.test(value);
}

function isFraction(value: string | undefined) {
  return value !== undefined && /^\d+\/\d+$/.test(value);
}

function parseFraction(value: string) {
  const [numerator, denominator] = value.split("/").map(Number);

  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}
