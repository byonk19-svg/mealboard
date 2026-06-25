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
  "boneless",
  "fresh",
  "frozen",
  "grated",
  "ground",
  "large",
  "medium",
  "minced",
  "rinsed",
  "shredded",
  "skinless",
  "sliced",
  "small"
]);

export function parseIngredientText(text: string): ParsedIngredientLine[] {
  return text
    .split(/\r?\n/)
    .map(cleanIngredientLine)
    .filter(Boolean)
    .map(parseIngredientLine);
}

function cleanIngredientLine(line: string) {
  return normalizeLine(line)
    .replace(
      /^[-*\u2022\u25a1\u25a2\u25a3\u25aa\u25ab\u25fb-\u25fe\u2610-\u2612]\s*/,
      ""
    )
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s*\(\$[\d.,]+\)\s*/g, " ")
    .replace(/([A-Za-z])\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIngredientLine(line: string): ParsedIngredientLine {
  const originalLine = line;
  const packageMatch = line.match(/\(([^)]+)\)/);
  const packageNote = packageMatch?.[1]?.trim() ?? null;
  let remaining = normalizeUnicodeFractions(
    line.replace(/\([^)]+\)/g, " ").replace(/\s+/g, " ").trim()
  );
  remaining = normalizeDescriptorCommas(remaining);
  const commaParts = remaining.split(",").map((part) => part.trim());
  remaining = commaParts[0] ?? remaining;
  const commaPreparation = commaParts.slice(1).join(", ") || null;
  const toTasteMatch = remaining.match(/\bto taste\b/i);
  const toTasteNote = toTasteMatch ? "to taste" : null;
  remaining = remaining.replace(/\bto taste\b/gi, "").trim();
  const tokens = remaining.split(/\s+/).filter(Boolean);
  const quantityResult = parseQuantity(tokens);
  const packageSizeResult = parsePackageSize(tokens, quantityResult.nextIndex);
  const unitResult = parseUnit(tokens, packageSizeResult.nextIndex);
  const words = tokens.slice(unitResult.nextIndex);
  const leadingPreparation = extractLeadingPreparation(words);
  const trailingPreparation = extractTrailingPreparation(leadingPreparation.words);
  const displayName = trailingPreparation.words.join(" ").trim();
  const unit =
    unitResult.unit ??
    (quantityResult.value !== null && displayName.length > 0 ? "count" : null);
  const notes =
    [packageNote, packageSizeResult.note, toTasteNote]
      .filter(Boolean)
      .join("; ") || null;
  const preparation = [
    leadingPreparation.preparation,
    trailingPreparation.preparation,
    commaPreparation
  ]
    .filter(Boolean)
    .join(", ") || null;
  const needsReview = displayName.length === 0 || quantityResult.value === null || unit === null;

  return {
    originalLine,
    displayName: displayName || remaining || originalLine,
    quantity: quantityResult.value,
    unit,
    preparation,
    notes,
    needsReview,
    reviewReason: needsReview ? "Quantity or unit needs review." : null
  };
}

function normalizeUnicodeFractions(value: string) {
  return value
    .replace(
      /(\d)([\u00bc\u00bd\u00be\u2153\u2154\u215b\u215c\u215d\u215e])/g,
      "$1 $2"
    )
    .replace(
      /[\u00bc\u00bd\u00be\u2153\u2154\u215b\u215c\u215d\u215e]/g,
      (fraction) => unicodeFractions[fraction] ?? fraction
    );
}

function normalizeDescriptorCommas(value: string) {
  return value.replace(/\bboneless,\s+skinless\b/gi, "boneless skinless");
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

function parsePackageSize(tokens: string[], index: number) {
  const token = tokens[index];
  const match = token?.match(/^(\d+(?:\.\d+)?)[- ]?(oz|g|gram|grams|lb|lbs|ml)$/i);

  if (match) {
    return {
      nextIndex: index + 1,
      note: `${match[1]} ${match[2].toLowerCase()}`
    };
  }

  const nextToken = tokens[index + 1];

  if (isNumber(token) && isPackageSizeUnit(nextToken)) {
    return {
      nextIndex: index + 2,
      note: `${token} ${nextToken.toLowerCase()}`
    };
  }

  return { nextIndex: index, note: null };
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

function extractTrailingPreparation(words: string[]) {
  const preparation: string[] = [];
  let index = words.length - 1;

  while (index >= 0) {
    const word = words[index]?.toLowerCase().replace(/,$/, "") ?? "";

    if (!preparationWords.has(word)) {
      break;
    }

    preparation.unshift(words[index]);
    index -= 1;
  }

  return {
    preparation: preparation.join(" ") || null,
    words: words.slice(0, index + 1)
  };
}

function isNumber(value: string | undefined) {
  return value !== undefined && /^\d+(\.\d+)?$/.test(value);
}

function isFraction(value: string | undefined) {
  return value !== undefined && /^\d+\/\d+$/.test(value);
}

function isPackageSizeUnit(value: string | undefined) {
  return (
    value !== undefined && /^(oz|g|gram|grams|lb|lbs|ml)$/i.test(value)
  );
}

function parseFraction(value: string) {
  const [numerator, denominator] = value.split("/").map(Number);

  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}

const unicodeFractions: Record<string, string> = {
  "\u00bc": "1/4",
  "\u00bd": "1/2",
  "\u00be": "3/4",
  "\u2153": "1/3",
  "\u2154": "2/3",
  "\u215b": "1/8",
  "\u215c": "3/8",
  "\u215d": "5/8",
  "\u215e": "7/8"
};
