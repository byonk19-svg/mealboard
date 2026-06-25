import type { RawRecipeCandidate } from "./types";
import { parseRecipeNutritionText } from "./parse-recipe-nutrition";

const SECTION_LABELS = [
  "ingredients",
  "ingredient",
  "instructions",
  "instruction",
  "directions",
  "direction",
  "method"
] as const;

const METADATA_LABELS = [
  "nutrition",
  "servings",
  "serves",
  "yield",
  "prep time",
  "preparation time",
  "cook time"
] as const;

type ActiveSection = "ingredients" | "instructions" | null;

export function parseSelectedRecipeText(
  text: string,
  fallbackName: string | null
): RawRecipeCandidate | null {
  const lines = normalizeSelectedText(text);
  const ingredients: string[] = [];
  const instructions: string[] = [];
  let activeSection: ActiveSection = null;
  let name: string | null = null;
  let servings: number | null = null;
  let prepMinutes: number | null = null;
  let cookMinutes: number | null = null;
  const nutrition = parseRecipeNutritionText(text);

  for (const line of lines) {
    const section = parseSectionLine(line);

    if (section) {
      if (section.type === "ingredients" || section.type === "instructions") {
        activeSection = section.type;
        addSectionValue(section.value, activeSection, ingredients, instructions);
        continue;
      }

      activeSection = null;
      if (section.type === "servings") {
        servings = servings ?? parseLooseNumber(section.value);
      }
      if (section.type === "prep") {
        prepMinutes = prepMinutes ?? parseLooseMinutes(section.value);
      }
      if (section.type === "cook") {
        cookMinutes = cookMinutes ?? parseLooseMinutes(section.value);
      }
      continue;
    }

    if (!activeSection && !name && looksLikeRecipeTitle(line)) {
      name = line;
      continue;
    }

    if (activeSection === "ingredients") {
      ingredients.push(...splitIngredientText(line));
      continue;
    }

    if (activeSection === "instructions") {
      instructions.push(stripLeadingMarker(line));
    }
  }

  if (ingredients.length === 0 || instructions.length === 0) {
    return null;
  }

  return {
    caloriesPerServing: nutrition.caloriesPerServing,
    cookMinutes,
    description: null,
    extractionWarnings: [
      "Selected page text was split into ingredients and instructions. Review imported fields before saving."
    ],
    ingredients,
    instructions,
    name: name ?? fallbackName,
    prepMinutes,
    proteinGramsPerServing: nutrition.proteinGramsPerServing,
    servings
  };
}

function normalizeSelectedText(text: string) {
  return expandInlineLabels(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function expandInlineLabels(text: string) {
  let expanded = text;

  for (const label of SECTION_LABELS) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\s*:`, "gi");
    expanded = expanded.replace(pattern, (match) => `\n${match}\n`);
  }

  for (const label of METADATA_LABELS) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\s*:`, "gi");
    expanded = expanded.replace(pattern, (match) => `\n${match}`);
  }

  return expanded;
}

function parseSectionLine(line: string):
  | { type: "ingredients" | "instructions"; value: string }
  | { type: "nutrition" | "servings" | "prep" | "cook"; value: string }
  | null {
  const match = line.match(/^([a-z ]+):?\s*(.*)$/i);
  const label = match?.[1]?.trim().toLowerCase() ?? "";
  const value = match?.[2]?.trim() ?? "";

  if (label === "ingredient" || label === "ingredients") {
    return { type: "ingredients", value };
  }

  if (
    label === "instruction" ||
    label === "instructions" ||
    label === "direction" ||
    label === "directions" ||
    label === "method"
  ) {
    return { type: "instructions", value };
  }

  if (label === "servings" || label === "serves" || label === "yield") {
    return { type: "servings", value };
  }

  if (label === "nutrition") {
    return { type: "nutrition", value };
  }

  if (label === "prep time" || label === "preparation time") {
    return { type: "prep", value };
  }

  if (label === "cook time") {
    return { type: "cook", value };
  }

  return null;
}

function addSectionValue(
  value: string,
  section: "ingredients" | "instructions",
  ingredients: string[],
  instructions: string[]
) {
  if (!value) {
    return;
  }

  if (section === "ingredients") {
    ingredients.push(...splitIngredientText(value));
    return;
  }

  instructions.push(stripLeadingMarker(value));
}

function splitIngredientText(value: string) {
  return value
    .split(
      /(?:\s*[;\u2022]\s*|\.\s+(?=(?:\d+|\d+\/\d+|[\u00bc\u00bd\u00be\u2153\u2154\u215b\u215c\u215d\u215e])\b))/
    )
    .map(stripLeadingMarker)
    .map((line) => line.replace(/[.]$/, "").trim())
    .filter(Boolean);
}

function stripLeadingMarker(line: string) {
  return line
    .replace(/^[-*\u2022]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function looksLikeRecipeTitle(line: string) {
  return (
    line.length >= 3 &&
    line.length <= 120 &&
    !/[.!?]$/.test(line) &&
    !/^\d/.test(line) &&
    parseSectionLine(line) === null
  );
}

function parseLooseNumber(value: string) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseLooseMinutes(value: string) {
  if (!value) {
    return null;
  }

  const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minuteMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/i);
  const totalMinutes =
    Number(hourMatch?.[1] ?? 0) * 60 + Number(minuteMatch?.[1] ?? 0);

  if (totalMinutes > 0) {
    return Math.round(totalMinutes);
  }

  return parseLooseNumber(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
