"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  RecipeForm,
  type RecipeFormInitialValues
} from "@/components/recipes/recipe-form";
import { getRecipeImportReviewIssues } from "@/lib/recipes/import/import-review-issues";
import { normalizeExtensionCapturePayload } from "@/lib/recipes/import/normalize-extension-capture";
import type { RecipeImportDraft } from "@/lib/recipes/import/types";
import type { GroceryCategory } from "@/lib/recipes/types";
import type { Food, MealProfile } from "@/lib/settings/types";

type RecipeImportReviewClientProps = {
  categories: GroceryCategory[];
  foods: Food[];
  profiles: MealProfile[];
};

const extensionSource = "mealboard-recipe-capture-extension";
const extensionDraftMessage = "MEALBOARD_RECIPE_CAPTURE_DRAFT";
const appSource = "mealboard-app";
const appAckMessage = "MEALBOARD_RECIPE_CAPTURE_DRAFT_RECEIVED";

export function RecipeImportReviewClient({
  categories,
  foods,
  profiles
}: RecipeImportReviewClientProps) {
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<RecipeImportDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const draftKey = searchParams.get("draft");

  useEffect(() => {
    function updateFromStoredDraft() {
      if (!draftKey) {
        setMessage("No imported recipe draft was found.");
        return;
      }

      const storedDraft = window.sessionStorage.getItem(draftKey);
      if (storedDraft) {
        const parsedDraft = parseDraft(storedDraft, foods);
        if (parsedDraft) {
          setDraft(parsedDraft);
          setMessage(null);
          return;
        }
      }

      setMessage("Waiting for the recipe capture extension...");
    }

    queueMicrotask(updateFromStoredDraft);
  }, [draftKey, foods]);

  useEffect(() => {
    if (!draftKey) {
      return;
    }
    function handleExtensionDraft(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }

      const data = event.data as {
        draftKey?: string;
        payload?: unknown;
        source?: string;
        type?: string;
      };

      if (
        data.source !== extensionSource ||
        data.type !== extensionDraftMessage ||
        !data.draftKey ||
        data.draftKey !== draftKey
      ) {
        return;
      }

      const normalizedDraft = normalizeExtensionCapturePayload(data.payload, foods);
      if (!normalizedDraft) {
        setMessage(
          "The extension did not find structured recipe data. Select the recipe text on the page and capture again, or use manual entry."
        );
        return;
      }

      window.sessionStorage.setItem(data.draftKey, JSON.stringify(normalizedDraft));
      setDraft(normalizedDraft);
      setMessage(null);
      window.postMessage(
        {
          draftKey: data.draftKey,
          source: appSource,
          type: appAckMessage
        },
        window.location.origin
      );
    }

    window.addEventListener("message", handleExtensionDraft);
    return () => window.removeEventListener("message", handleExtensionDraft);
  }, [draftKey, foods]);

  const initialValues = useMemo(
    () => (draft ? toRecipeFormInitialValues(draft) : null),
    [draft]
  );
  const importReviewIssues = useMemo(
    () => (draft ? getRecipeImportReviewIssues(draft) : []),
    [draft]
  );
  const returnPath = useMemo(() => {
    const params = searchParams.toString();
    return params
      ? `/recipes/import/review?${params}`
      : "/recipes/import/review";
  }, [searchParams]);

  if (!draft || !initialValues) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Import review
        </p>
        <h2 className="mt-3 text-2xl font-semibold">No draft ready</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {message ??
            "Import a recipe URL or capture a page with the private extension."}
        </p>
        <Link
          className="mt-4 inline-flex rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
          href="/recipes/import"
        >
          Back to import
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Import confidence</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <ConfidenceItem label="Title" value={draft.confidence.name} />
          <ConfidenceItem
            label="Ingredients"
            value={draft.confidence.ingredients}
          />
          <ConfidenceItem
            label="Instructions"
            value={draft.confidence.instructions}
          />
          <ConfidenceItem label="Nutrition" value={draft.confidence.nutrition} />
        </dl>
        {draft.warnings.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {draft.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <RecipeForm
        categories={categories}
        foods={foods}
        initialValues={initialValues}
        importReviewIssues={importReviewIssues}
        profiles={profiles}
        returnPath={returnPath}
        submitLabel="Save imported recipe"
      />
    </div>
  );
}

function ConfidenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function parseDraft(value: string, foods: Food[]) {
  try {
    return normalizeUnknownDraft(JSON.parse(value), foods);
  } catch {
    return null;
  }
}

function normalizeUnknownDraft(value: unknown, foods: Food[]) {
  if (!isRecord(value)) {
    return null;
  }

  if (Array.isArray(value.ingredientReviewRows)) {
    return value as RecipeImportDraft;
  }

  if (Array.isArray(value.jsonLd)) {
    return normalizeExtensionCapturePayload(value, foods);
  }

  if (isRecord(value.fields) && Array.isArray(value.ingredients)) {
    return fromFieldDraft(value);
  }

  return null;
}

function fromFieldDraft(value: Record<string, unknown>): RecipeImportDraft {
  const fields = value.fields as Record<string, unknown>;

  return {
    confidence: {
      ingredients: "high",
      instructions: getConfidence(fields.instructions),
      name: getConfidence(fields.name),
      nutrition: getConfidence(fields.nutritionConfidence)
    },
    cookMinutes: getFieldNumber(fields.cookMinutes),
    description: getFieldString(fields.description),
    estimatedCaloriesPerServing: getFieldNumber(
      fields.estimatedCaloriesPerServing
    ),
    estimatedProteinGramsPerServing: getFieldNumber(
      fields.estimatedProteinGramsPerServing
    ),
    ingredientLines: [],
    ingredientReviewRows: (value.ingredients as RecipeImportDraft["ingredientReviewRows"]),
    instructions: getFieldString(fields.instructions) ?? "",
    mealType: "dinner",
    name: getFieldString(fields.name) ?? "",
    nutritionConfidence:
      getFieldString(fields.nutritionConfidence) === "medium" ? "medium" : "missing",
    prepMinutes: getFieldNumber(fields.prepMinutes),
    servings: getFieldNumber(fields.servings),
    sourceTitle:
      typeof value.sourceTitle === "string" ? value.sourceTitle : null,
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : null,
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter((warning): warning is string => typeof warning === "string")
      : []
  };
}

function toRecipeFormInitialValues(
  draft: RecipeImportDraft
): RecipeFormInitialValues {
  return {
    cook_minutes: draft.cookMinutes,
    description: draft.description,
    estimated_calories_per_serving: draft.estimatedCaloriesPerServing,
    estimated_protein_grams_per_serving:
      draft.estimatedProteinGramsPerServing,
    ingredients: draft.ingredientReviewRows,
    instructions: draft.instructions,
    meal_type: draft.mealType,
    name: draft.name,
    nutrition_confidence:
      draft.nutritionConfidence === "missing" ? null : draft.nutritionConfidence,
    prep_minutes: draft.prepMinutes,
    servings: draft.servings,
    source_title: draft.sourceTitle,
    source_url: draft.sourceUrl,
    status: "idea",
    tags: []
  };
}

function getFieldString(value: unknown) {
  return isRecord(value) && typeof value.value === "string" ? value.value : null;
}

function getFieldNumber(value: unknown) {
  return isRecord(value) && typeof value.value === "number" ? value.value : null;
}

function getConfidence(value: unknown) {
  return isRecord(value) && typeof value.confidence === "string"
    ? value.confidence
    : "missing";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
