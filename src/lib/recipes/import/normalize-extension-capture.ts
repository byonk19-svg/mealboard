import { extractJsonLdRecipeCandidates } from "./extract-json-ld-recipes";
import { normalizeRecipeImportDraft } from "./normalize-recipe-import";
import { cleanRecipeSourceAttribution } from "./source-attribution";
import type { RecipeImportDraft } from "./types";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
