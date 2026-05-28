import {
  createRecipe,
  updateRecipe
} from "@/app/(app)/recipes/actions";
import type { InputHTMLAttributes } from "react";
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
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <TextField
            defaultValue={recipe?.estimated_calories_per_serving ?? ""}
            label="Calories per serving"
            min="1"
            name="estimatedCaloriesPerServing"
            type="number"
          />
          <TextField
            defaultValue={recipe?.estimated_protein_grams_per_serving ?? ""}
            label="Protein grams"
            min="0"
            name="estimatedProteinGramsPerServing"
            type="number"
          />
          <SelectField
            defaultValue={recipe?.nutrition_confidence ?? ""}
            includeBlank="No estimate"
            label="Confidence"
            name="nutritionConfidence"
            options={estimateConfidences.map((confidence) => ({
              label: formatEstimateConfidence(confidence),
              value: confidence
            }))}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Structured ingredients</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter reviewed ingredient rows. Paste parsing and uncertain-row review
          are intentionally deferred to Task 06.
        </p>
        <div className="mt-4 space-y-4">
          {ingredientRows.map((ingredient, index) => (
            <IngredientRow
              categories={categories}
              foods={foods}
              index={index}
              ingredient={ingredient}
              key={index}
            />
          ))}
        </div>
      </section>

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

function buildIngredientRows(recipe?: RecipeWithDetails) {
  const existing = recipe?.ingredients ?? [];
  const blankCount = Math.max(minimumIngredientRows - existing.length, 3);

  return [
    ...existing,
    ...Array.from({ length: blankCount }, () => ({
      display_name: "",
      food_id: null,
      quantity: null,
      unit: null,
      grocery_category_id: null,
      preparation: null,
      notes: null,
      optional: false
    }))
  ];
}

function IngredientRow({
  categories,
  foods,
  index,
  ingredient
}: {
  categories: GroceryCategory[];
  foods: Food[];
  index: number;
  ingredient: {
    display_name: string;
    food_id: string | null;
    quantity: number | null;
    unit: string | null;
    grocery_category_id: string | null;
    preparation: string | null;
    notes: string | null;
    optional: boolean;
  };
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-sm font-medium text-muted-foreground">
        Ingredient {index + 1}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-6">
        <label className="block text-sm font-medium md:col-span-2">
          Display name
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={ingredient.display_name}
            name="ingredientDisplayName"
            placeholder="Chicken breast"
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Matched food
          <select
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={ingredient.food_id ?? ""}
            name="ingredientFoodId"
          >
            <option value="">No food match</option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Quantity
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={ingredient.quantity ?? ""}
            min="0.01"
            name="ingredientQuantity"
            step="0.01"
            type="number"
          />
        </label>
        <label className="block text-sm font-medium">
          Unit
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={ingredient.unit ?? ""}
            name="ingredientUnit"
            placeholder="lb"
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Category
          <select
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={ingredient.grocery_category_id ?? ""}
            name="ingredientCategoryId"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Preparation
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={ingredient.preparation ?? ""}
            name="ingredientPreparation"
            placeholder="diced, shredded, cooked"
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Notes
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            defaultValue={ingredient.notes ?? ""}
            name="ingredientNotes"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-6">
          <input
            defaultChecked={ingredient.optional}
            name="ingredientOptional"
            type="checkbox"
            value={index}
          />
          Optional ingredient
        </label>
      </div>
    </div>
  );
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
