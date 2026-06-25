"use client";

import {
  createRecipe,
  updateRecipe
} from "@/app/(app)/recipes/actions";
import type { InputHTMLAttributes } from "react";
import {
  IngredientReviewEditor,
  type IngredientFormRow
} from "@/components/recipes/ingredient-review-editor";
import {
  estimateConfidences,
  formatEstimateConfidence,
  formatMealType,
  formatRecipeRepeatRule,
  formatRecipeStatus,
  mealTypes,
  recipeRepeatRules,
  recipeStatuses,
  type GroceryCategory,
  type RecipeWithDetails
} from "@/lib/recipes/types";
import {
  requiresRecipeImportAcknowledgement,
  type RecipeImportReviewIssue
} from "@/lib/recipes/import/import-review-issues";
import type { Food, MealProfile } from "@/lib/settings/types";

type RecipeFormProps = {
  categories: GroceryCategory[];
  foods: Food[];
  initialValues?: RecipeFormInitialValues;
  importReviewIssues?: RecipeImportReviewIssue[];
  onBeforeSubmit?: (form: HTMLFormElement) => void;
  profiles: MealProfile[];
  recipe?: RecipeWithDetails;
  returnPath?: string;
  submitLabel?: string;
};

const minimumIngredientRows = 6;

export type RecipeFormInitialValues = {
  cook_minutes?: number | null;
  description?: string | null;
  estimated_calories_per_serving?: number | null;
  estimated_protein_grams_per_serving?: number | null;
  effort_level?: string | null;
  ingredients?: IngredientFormRow[];
  instructions?: string | null;
  meal_type?: string | null;
  name?: string | null;
  notes?: string | null;
  nutrition_confidence?: string | null;
  prep_minutes?: number | null;
  repeat_rule?: string | null;
  servings?: number | null;
  source_title?: string | null;
  source_url?: string | null;
  status?: string | null;
  tags?: string[];
};

export function RecipeForm({
  categories,
  foods,
  initialValues,
  importReviewIssues = [],
  onBeforeSubmit,
  profiles,
  recipe,
  returnPath,
  submitLabel
}: RecipeFormProps) {
  const ingredientRows = buildIngredientRows(recipe, initialValues);
  const approvedProfileIds = new Set(
    recipe?.approvals
      .filter((approval) => approval.approved_for_planning)
      .map((approval) => approval.meal_profile_id) ?? []
  );
  const importAcknowledgementRequired =
    importReviewIssues.length > 0 &&
    requiresRecipeImportAcknowledgement(importReviewIssues);

  return (
    <form
      action={recipe ? updateRecipe : createRecipe}
      className="space-y-6"
      onSubmit={(event) => onBeforeSubmit?.(event.currentTarget)}
    >
      {recipe ? <input name="recipeId" type="hidden" value={recipe.id} /> : null}
      {returnPath ? (
        <input name="recipeFormPath" type="hidden" value={returnPath} />
      ) : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Recipe details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={initialValues?.name ?? recipe?.name ?? ""}
            label="Recipe name"
            name="name"
            required
          />
          <SelectField
            defaultValue={initialValues?.status ?? recipe?.status ?? "idea"}
            label="Status"
            name="status"
            options={recipeStatuses.map((status) => ({
              label: formatRecipeStatus(status),
              value: status
            }))}
          />
          <SelectField
            defaultValue={initialValues?.meal_type ?? recipe?.meal_type ?? "dinner"}
            label="Meal type"
            name="mealType"
            options={mealTypes.map((mealType) => ({
              label: formatMealType(mealType),
              value: mealType
            }))}
          />
          <TextField
            defaultValue={initialValues?.servings ?? recipe?.servings ?? ""}
            label="Recipe servings"
            min="0.01"
            name="servings"
            step="0.01"
            type="number"
          />
          <TextField
            defaultValue={initialValues?.prep_minutes ?? recipe?.prep_minutes ?? ""}
            label="Prep minutes"
            min="0"
            name="prepMinutes"
            type="number"
          />
          <TextField
            defaultValue={initialValues?.cook_minutes ?? recipe?.cook_minutes ?? ""}
            label="Cook minutes"
            min="0"
            name="cookMinutes"
            type="number"
          />
          <TextField
            defaultValue={initialValues?.effort_level ?? recipe?.effort_level ?? ""}
            label="Effort"
            name="effortLevel"
            placeholder="low, medium, high"
          />
          <SelectField
            defaultValue={initialValues?.repeat_rule ?? recipe?.repeat_rule ?? ""}
            includeBlank="No repeat rule"
            label="Repeat rule"
            name="repeatRule"
            options={recipeRepeatRules.map((rule) => ({
              label: formatRecipeRepeatRule(rule),
              value: rule
            }))}
          />
          <TextField
            className="md:col-span-2"
            defaultValue={initialValues?.description ?? recipe?.description ?? ""}
            label="Description"
            name="description"
          />
          <TextAreaField
            defaultValue={initialValues?.instructions ?? recipe?.instructions ?? ""}
            label="Instructions"
            name="instructions"
          />
          <TextAreaField
            defaultValue={initialValues?.notes ?? recipe?.notes ?? ""}
            label="Notes"
            name="notes"
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Source attribution</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Optional URL and title for recipes imported from another page.
          MealBoard saves only attribution, not the original page content.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={initialValues?.source_title ?? recipe?.source_title ?? ""}
            label="Source title"
            name="sourceTitle"
          />
          <TextField
            autoComplete="url"
            defaultValue={initialValues?.source_url ?? recipe?.source_url ?? ""}
            inputMode="url"
            label="Source URL"
            name="sourceUrl"
            placeholder="https://example.com/recipe"
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Nutrition estimates</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Optional per-serving estimates used by Plan Week profile/day
          summaries. Leave values blank when they are unknown.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <TextField
            defaultValue={
              initialValues?.estimated_calories_per_serving ??
              recipe?.estimated_calories_per_serving ??
              ""
            }
            label="Estimated recipe calories per serving"
            min="1"
            name="estimatedCaloriesPerServing"
            type="number"
          />
          <TextField
            defaultValue={
              initialValues?.estimated_protein_grams_per_serving ??
              recipe?.estimated_protein_grams_per_serving ??
              ""
            }
            label="Estimated recipe protein grams per serving"
            min="0"
            name="estimatedProteinGramsPerServing"
            type="number"
          />
          <SelectField
            defaultValue={
              initialValues?.nutrition_confidence ??
              recipe?.nutrition_confidence ??
              ""
            }
            includeBlank="No estimate"
            label="Estimate confidence"
            name="nutritionConfidence"
            options={estimateConfidences.map((confidence) => ({
              label: formatEstimateConfidence(confidence),
              value: confidence
            }))}
          />
        </div>
      </section>

      <IngredientReviewEditor
        categories={categories}
        foods={foods}
        initialRows={ingredientRows}
      />

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Tags and profile approvals</h2>
        <label className="mt-4 block text-sm font-medium">
          Tags
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={
              initialValues?.tags?.join(", ") ??
              recipe?.tags.map((tag) => tag.tag).join(", ") ??
              ""
            }
            name="tags"
            placeholder="safe_default, work_lunch, low_effort"
          />
        </label>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">
            Approved for planning
          </legend>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Select each profile that can use this recipe in weekly planning.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {profiles.map((profile) => (
              <label
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                key={profile.id}
              >
                <input
                  defaultChecked={approvedProfileIds.has(profile.id)}
                  name="approvedProfileIds"
                  type="checkbox"
                  value={profile.id}
                />
                {profile.name}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {importReviewIssues.length > 0 ? (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <h2 className="text-xl font-semibold">Review before saving</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {importReviewIssues.map((issue, index) => (
              <li key={`${issue.id}-${index}`}>{issue.message}</li>
            ))}
          </ul>
          {importAcknowledgementRequired ? (
            <label className="mt-4 flex items-start gap-2 text-sm font-medium">
              <input
                className="mt-1"
                name="importReviewAcknowledged"
                required
                type="checkbox"
                value="yes"
              />
              I reviewed the imported method and still want to save this recipe.
            </label>
          ) : null}
          {importAcknowledgementRequired ? (
            <input
              name="importReviewAcknowledgementRequired"
              type="hidden"
              value="true"
            />
          ) : null}
        </section>
      ) : null}

      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        type="submit"
      >
        {submitLabel ?? (recipe ? "Save recipe" : "Create recipe")}
      </button>
    </form>
  );
}

function buildIngredientRows(
  recipe?: RecipeWithDetails,
  initialValues?: RecipeFormInitialValues
): IngredientFormRow[] {
  if (initialValues?.ingredients && initialValues.ingredients.length > 0) {
    const blankCount = Math.max(
      minimumIngredientRows - initialValues.ingredients.length,
      3
    );

    return [
      ...initialValues.ingredients,
      ...Array.from({ length: blankCount }, () => ({
        display_name: "",
        food_id: null,
        quantity: null,
        unit: null,
        grocery_category_id: null,
        preparation: null,
        notes: null,
        optional: false,
        needsReview: false,
        reviewReason: null
      }))
    ];
  }

  const existing = recipe?.ingredients ?? [];
  const blankCount = Math.max(minimumIngredientRows - existing.length, 3);

  return [
    ...existing.map((ingredient) => ({
      display_name: ingredient.display_name,
      food_id: ingredient.food_id,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      grocery_category_id: ingredient.grocery_category_id,
      preparation: ingredient.preparation,
      notes: ingredient.notes,
      optional: ingredient.optional,
      needsReview: false,
      reviewReason: null
    })),
    ...Array.from({ length: blankCount }, () => ({
      display_name: "",
      food_id: null,
      quantity: null,
      unit: null,
      grocery_category_id: null,
      preparation: null,
      notes: null,
      optional: false,
      needsReview: false,
      reviewReason: null
    }))
  ];
}

function TextField({
  className = "",
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text",
  ...inputProps
}: {
  className?: string;
  defaultValue: string | number;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      <input
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
        {...inputProps}
      />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name
}: {
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        className="mt-2 min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  includeBlank,
  label,
  name,
  options
}: {
  defaultValue: string;
  includeBlank?: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        defaultValue={defaultValue}
        name={name}
      >
        {includeBlank ? <option value="">{includeBlank}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
