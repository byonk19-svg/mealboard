import type { RawRecipeCandidate } from "./types";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

type JsonLdObject = { [key: string]: JsonLdValue };

type RankedCandidate = {
  candidate: RawRecipeCandidate;
  documentOrder: number;
  score: number;
};

export function extractJsonLdRecipeCandidates(html: string): RawRecipeCandidate[] {
  const rankedCandidates: RankedCandidate[] = [];
  let documentOrder = 0;

  for (const scriptContent of extractJsonLdScriptContents(html)) {
    const parsed = parseJsonLd(scriptContent);

    if (parsed === null) {
      continue;
    }

    for (const recipe of collectRecipeObjects(parsed)) {
      rankedCandidates.push({
        candidate: normalizeRecipeObject(recipe),
        documentOrder,
        score: scoreRecipeObject(recipe)
      });
      documentOrder += 1;
    }
  }

  return rankedCandidates
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.documentOrder - right.documentOrder;
    })
    .map((ranked) => ranked.candidate);
}

function extractJsonLdScriptContents(html: string) {
  const scriptContents: string[] = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    const attributes = match[1] ?? "";

    if (hasJsonLdTypeAttribute(attributes)) {
      scriptContents.push(match[2] ?? "");
    }
  }

  return scriptContents;
}

function hasJsonLdTypeAttribute(attributes: string) {
  return /\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)(?:\s|$)/i.test(
    attributes
  );
}

function parseJsonLd(scriptContent: string): JsonLdValue | null {
  try {
    return JSON.parse(scriptContent) as JsonLdValue;
  } catch {
    const decodedScriptContent = decodeHtmlEntities(scriptContent);

    if (decodedScriptContent === scriptContent) {
      return null;
    }

    try {
      return JSON.parse(decodedScriptContent) as JsonLdValue;
    } catch {
      return null;
    }
  }
}

function collectRecipeObjects(value: JsonLdValue): JsonLdObject[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectRecipeObjects);
  }

  if (!isJsonLdObject(value)) {
    return [];
  }

  const graph = value["@graph"];
  const graphRecipes = Array.isArray(graph) ? graph.flatMap(collectRecipeObjects) : [];
  const directRecipes = isRecipeType(value["@type"]) ? [value] : [];

  return [...directRecipes, ...graphRecipes];
}

function normalizeRecipeObject(recipe: JsonLdObject): RawRecipeCandidate {
  const extractionWarnings: string[] = [];
  const servings = parseServings(recipe.recipeYield);
  const prepMinutes = parseDurationMinutes(recipe.prepTime);
  const cookMinutes = parseDurationMinutes(recipe.cookTime);
  const caloriesPerServing = parseNumericNutritionValue(getObject(recipe.nutrition)?.calories);
  const proteinGramsPerServing = parseNumericNutritionValue(
    getObject(recipe.nutrition)?.proteinContent
  );

  if (recipe.recipeYield !== undefined && servings === null) {
    extractionWarnings.push("Recipe yield could not be parsed.");
  }

  if (recipe.prepTime !== undefined && prepMinutes === null) {
    extractionWarnings.push("Prep time could not be parsed.");
  }

  if (recipe.cookTime !== undefined && cookMinutes === null) {
    extractionWarnings.push("Cook time could not be parsed.");
  }

  if (
    getObject(recipe.nutrition)?.calories !== undefined &&
    caloriesPerServing === null
  ) {
    extractionWarnings.push("Calories could not be parsed.");
  }

  if (
    getObject(recipe.nutrition)?.proteinContent !== undefined &&
    proteinGramsPerServing === null
  ) {
    extractionWarnings.push("Protein could not be parsed.");
  }

  return {
    name: firstText(recipe.name),
    description: firstText(recipe.description),
    servings,
    prepMinutes,
    cookMinutes,
    ingredients: getTextArray(recipe.recipeIngredient),
    instructions: getInstructionLines(recipe.recipeInstructions),
    caloriesPerServing,
    proteinGramsPerServing,
    extractionWarnings
  };
}

function scoreRecipeObject(recipe: JsonLdObject) {
  let score = 0;

  if (firstText(recipe.name)) {
    score += 8;
  }

  if (getTextArray(recipe.recipeIngredient).length > 0) {
    score += 8;
  }

  if (getInstructionLines(recipe.recipeInstructions).length > 0) {
    score += 8;
  }

  if (parseServings(recipe.recipeYield) !== null) {
    score += 1;
  }

  if (parseDurationMinutes(recipe.prepTime) !== null) {
    score += 1;
  }

  if (parseDurationMinutes(recipe.cookTime) !== null) {
    score += 1;
  }

  if (getObject(recipe.nutrition)) {
    score += 1;
  }

  return score;
}

function getInstructionLines(value: JsonLdValue | undefined): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === "string") {
    return [value].map(cleanText).filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap(getInstructionLines);
  }

  if (!isJsonLdObject(value)) {
    return [];
  }

  if (isHowToSection(value)) {
    return [
      firstText(value.name),
      ...getInstructionLines(value.itemListElement)
    ].filter((line): line is string => Boolean(line));
  }

  const text = firstText(value.text) ?? firstText(value.name);

  return text ? [text] : [];
}

function parseServings(value: JsonLdValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  const text = firstText(value);

  if (!text) {
    return null;
  }

  const match = text.match(/\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function parseDurationMinutes(value: JsonLdValue | undefined) {
  const text = firstText(value);

  if (!text) {
    return null;
  }

  const match = text.match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  );

  if (!match) {
    return null;
  }

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const totalMinutes = days * 24 * 60 + hours * 60 + minutes + seconds / 60;

  return totalMinutes > 0 ? Math.round(totalMinutes) : null;
}

function parseNumericNutritionValue(value: JsonLdValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = firstText(value);

  if (!text) {
    return null;
  }

  const match = text.match(/\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function getTextArray(value: JsonLdValue | undefined) {
  if (Array.isArray(value)) {
    return value.map(firstText).filter((line): line is string => Boolean(line));
  }

  const text = firstText(value);

  return text ? [text] : [];
}

function firstText(value: JsonLdValue | undefined): string | null {
  if (typeof value === "string") {
    const cleaned = cleanText(value);

    return cleaned.length > 0 ? cleaned : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstText(item);

      if (text) {
        return text;
      }
    }
  }

  return null;
}

function cleanText(value: string) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function isRecipeType(value: JsonLdValue | undefined): boolean {
  if (typeof value === "string") {
    return value.toLowerCase() === "recipe";
  }

  return Array.isArray(value) && value.some(isRecipeType);
}

function isHowToSection(value: JsonLdObject): boolean {
  return isType(value["@type"], "HowToSection") || value.itemListElement !== undefined;
}

function isType(value: JsonLdValue | undefined, expectedType: string): boolean {
  if (typeof value === "string") {
    return value.toLowerCase() === expectedType.toLowerCase();
  }

  return Array.isArray(value) && value.some((item) => isType(item, expectedType));
}

function getObject(value: JsonLdValue | undefined): JsonLdObject | null {
  return isJsonLdObject(value) ? value : null;
}

function isJsonLdObject(value: JsonLdValue | undefined): value is JsonLdObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      decodeNumericHtmlEntity(Number.parseInt(hex, 16), _match)
    )
    .replace(/&#(\d+);/g, (_match, decimal: string) =>
      decodeNumericHtmlEntity(Number.parseInt(decimal, 10), _match)
    )
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeNumericHtmlEntity(codePoint: number, fallback: string) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return fallback;
  }

  return String.fromCodePoint(codePoint);
}
