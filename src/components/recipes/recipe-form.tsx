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
import type { Food, MealProfile } from "@/lib/settings/types";

type RecipeFormProps = {
  categories: GroceryCategory[];
  foods: Food[];
  profiles: MealProfile[];
  recipe?: RecipeWithDetails;
};

const minimumIngredientRows = 6;

export function RecipeForm({
  categories,
  foods,
  profiles,
  recipe
}: RecipeFormProps) {
  const ingredientRows = buildIngredientRows(recipe);
  const approvedProfileIds = new Set(
    recipe?.approvals
      .filter((approval) => approval.approved_for_planning)
      .map((approval) => approval.meal_profile_id) ?? []
  );

  return (
    <form action={recipe ? updateRecipe : createRecipe} className="space-y-6">
      {recipe ? <input name="recipeId" type="hidden" value={recipe.id} /> : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Recipe details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={recipe?.name ?? ""}
            label="Name"
            name="name"
            required
          />
          <SelectField
            defaultValue={recipe?.status ?? "idea"}
            label="Status"
            name="status"
            options={recipeStatuses.map((status) => ({
              label: formatRecipeStatus(status),
              value: status
            }))}
          />
          <SelectField
            defaultValue={recipe?.meal_type ?? "dinner"}
            label="Meal type"
            name="mealType"
            options={mealTypes.map((mealType) => ({
              label: formatMealType(mealType),
              value: mealType
            }))}
          />
          <TextField
            defaultValue={recipe?.servings ?? ""}
            label="Servings"
            min="0.01"
            name="servings"
            step="0.01"
            type="number"
          />
          <TextField
            defaultValue={recipe?.prep_minutes ?? ""}
            label="Prep minutes"
            min="0"
            name="prepMinutes"
            type="number"
          />
          <TextField
            defaultValue={recipe?.cook_minutes ?? ""}
            label="Cook minutes"
            min="0"
            name="cookMinutes"
            type="number"
          />
          <TextField
            defaultValue={recipe?.effort_level ?? ""}
            label="Effort"
            name="effortLevel"
            placeholder="low, medium, high"
          />
          <SelectField
            defaultValue={recipe?.repeat_rule ?? ""}
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
            defaultValue={recipe?.description ?? ""}
            label="Description"
            name="description"
          />
          <TextAreaField
            defaultValue={recipe?.instructions ?? ""}
            label="Instructions"
            name="instructions"
          />
          <TextAreaField
            defaultValue={recipe?.notes ?? ""}
            label="Notes"
            name="notes"
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
            defaultValue={recipe?.estimated_calories_per_serving ?? ""}
            label="Estimated calories per serving"
            min="1"
            name="estimatedCaloriesPerServing"
            type="number"
          />
          <TextField
            defaultValue={recipe?.estimated_protein_grams_per_serving ?? ""}
            label="Estimated protein grams per serving"
            min="0"
            name="estimatedProteinGramsPerServing"
            type="number"
          />
          <SelectField
            defaultValue={recipe?.nutrition_confidence ?? ""}
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
            defaultValue={recipe?.tags.map((tag) => tag.tag).join(", ") ?? ""}
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

      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        type="submit"
      >
        {recipe ? "Save recipe" : "Create recipe"}
      </button>
    </form>
  );
}

function buildIngredientRows(recipe?: RecipeWithDetails): IngredientFormRow[] {
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
