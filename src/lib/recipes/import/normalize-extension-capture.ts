import { extractJsonLdRecipeCandidates } from "./extract-json-ld-recipes";
import { normalizeRecipeImportDraft } from "./normalize-recipe-import";
import { parseRecipeNutritionText } from "./parse-recipe-nutrition";
import { parseSelectedRecipeText } from "./parse-selected-recipe-text";
import { cleanRecipeSourceAttribution } from "./source-attribution";
import type { RawRecipeCandidate, RecipeImportDraft } from "./types";
import type { Food } from "@/lib/settings/types";

export function normalizeExtensionCapturePayload(
  value: unknown,
  foods: Food[]
): RecipeImportDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const jsonLd = Array.isArray(value.jsonLd)
    ? value.jsonLd.filter((script): script is string => typeof script === "string")
    : [];
  const sourceUrl = typeof value.sourceUrl === "string" ? value.sourceUrl : null;
  const sourceTitle =
    typeof value.sourceTitle === "string" ? value.sourceTitle : null;
  const blockedPage = value.blockedPage === true;

  if (jsonLd.length > 0) {
    const html = jsonLd
      .map((script) => `<script type="application/ld+json">${script}</script>`)
      .join("\n");
    const candidate = extractJsonLdRecipeCandidates(html)[0];

    if (candidate) {
      return normalizeRecipeImportDraft({
        candidate,
        foods,
        sourceTitle,
        sourceUrl
      });
    }
  }

  const visibleRecipeDraft = normalizeVisibleRecipeCapture({
    foods,
    sourceTitle,
    sourceUrl,
    value: value.visibleRecipe
  });

  if (visibleRecipeDraft) {
    return {
      ...visibleRecipeDraft,
      warnings: [
        ...visibleRecipeDraft.warnings,
        ...(blockedPage
          ? [
              "The extension captured visible recipe text after a site block signal. Review every field before saving."
            ]
          : [])
      ]
    };
  }

  const selectedText =
    typeof value.selectedText === "string" ? value.selectedText.trim() : "";

  if (!selectedText) {
    return null;
  }

  const source = cleanRecipeSourceAttribution({
    recipeName: null,
    sourceTitle,
    sourceUrl
  });
  const selectedTextCandidate = parseSelectedRecipeText(
    selectedText,
    source.sourceTitle
  );

  if (selectedTextCandidate) {
    const draft = normalizeRecipeImportDraft({
      candidate: selectedTextCandidate,
      foods,
      sourceTitle,
      sourceUrl
    });

    return {
      ...draft,
      confidence: {
        ...draft.confidence,
        ingredients: "low",
        instructions: "low",
        name: draft.name ? "low" : "missing",
        nutrition: "missing"
      },
      warnings: [
        "The extension did not find structured recipe data on this page.",
        ...draft.warnings
      ]
    };
  }

  return {
    confidence: {
      ingredients: "missing",
      instructions: "low",
      name: source.sourceTitle ? "low" : "missing",
      nutrition: "missing"
    },
    cookMinutes: null,
    description: null,
    estimatedCaloriesPerServing: null,
    estimatedProteinGramsPerServing: null,
    ingredientLines: [],
    ingredientReviewRows: [],
    instructions: selectedText,
    mealType: "dinner",
    name: source.sourceTitle ?? "",
    nutritionConfidence: "missing",
    prepMinutes: null,
    servings: null,
    sourceTitle: source.sourceTitle,
    sourceUrl: source.sourceUrl,
    warnings: [
      "The extension did not find structured recipe data on this page.",
      "Selected page text was added to instructions. Review the title, ingredients, servings, and nutrition before saving."
    ]
  };
}

function normalizeVisibleRecipeCapture({
  foods,
  sourceTitle,
  sourceUrl,
  value
}: {
  foods: Food[];
  sourceTitle: string | null;
  sourceUrl: string | null;
  value: unknown;
}) {
  if (!isRecord(value)) {
    return null;
  }

  const ingredients = getStringArray(value.ingredients);
  const instructions = getStringArray(value.instructions);
  const nutrition = parseRecipeNutritionText(getString(value.nutritionText) ?? "");

  if (ingredients.length === 0 && instructions.length === 0) {
    return null;
  }

  const title = getString(value.title) || sourceTitle;
  const candidate: RawRecipeCandidate = {
    caloriesPerServing: nutrition.caloriesPerServing,
    cookMinutes: parseLooseMinutes(getString(value.cookTimeText)),
    description: null,
    extractionWarnings: [
      "The extension captured visible recipe text instead of structured recipe data. Review imported fields before saving."
    ],
    ingredients,
    instructions,
    name: title,
    prepMinutes: parseLooseMinutes(getString(value.prepTimeText)),
    proteinGramsPerServing: nutrition.proteinGramsPerServing,
    servings: parseLooseNumber(getString(value.servingsText))
  };

  return normalizeRecipeImportDraft({
    candidate,
    foods,
    sourceTitle,
    sourceUrl
  });
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseLooseNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseLooseMinutes(value: string | null) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
