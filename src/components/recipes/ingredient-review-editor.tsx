"use client";

import { useId, useState } from "react";
import { parseIngredientText } from "@/lib/recipes/parse-ingredient-lines";
import type { GroceryCategory } from "@/lib/recipes/types";
import type { Food } from "@/lib/settings/types";

export type IngredientFormRow = {
  display_name: string;
  food_id: string | null;
  quantity: number | null;
  unit: string | null;
  grocery_category_id: string | null;
  preparation: string | null;
  notes: string | null;
  optional: boolean;
  needsReview?: boolean;
  reviewReason?: string | null;
};

type IngredientReviewEditorProps = {
  categories: GroceryCategory[];
  foods: Food[];
  initialRows: IngredientFormRow[];
};

const blankRow: IngredientFormRow = {
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
};

export function IngredientReviewEditor({
  categories,
  foods,
  initialRows
}: IngredientReviewEditorProps) {
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState(initialRows);
  const foodOptionsId = useId();

  function parsePasteText() {
    const parsedRows = parseIngredientText(pasteText).map((ingredient) => ({
      display_name: ingredient.displayName,
      food_id: findFoodId(foods, ingredient.displayName),
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      grocery_category_id: null,
      preparation: ingredient.preparation,
      notes: ingredient.notes,
      optional: false,
      needsReview: ingredient.needsReview,
      reviewReason: ingredient.reviewReason
    }));

    if (parsedRows.length === 0) {
      return;
    }

    setRows((currentRows) => {
      const filledRows = currentRows.filter((row) => row.display_name.trim());
      const nextRows = filledRows.length > 0 ? [...filledRows, ...parsedRows] : parsedRows;
      return [...nextRows, blankRow, blankRow, blankRow];
    });
    setPasteText("");
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, { ...blankRow }]);
  }

  function deleteRow(indexToDelete: number) {
    setRows((currentRows) => {
      const nextRows = currentRows.filter((_, index) => index !== indexToDelete);
      return nextRows.length > 0 ? nextRows : [{ ...blankRow }];
    });
  }

  // TODO: Add explicit merge/split controls if review needs more than add/delete/edit.

  function updateRow(
    indexToUpdate: number,
    patch: Partial<IngredientFormRow>
  ) {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === indexToUpdate ? { ...row, ...patch } : row
      )
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Structured ingredients</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Paste ingredient lines, then review the structured rows before saving.
          </p>
        </div>
        <button
          className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          onClick={addRow}
          type="button"
        >
          Add row
        </button>
      </div>

      <div className="mt-5 rounded-md border border-border bg-muted/40 p-4">
        <label className="block text-sm font-medium">
          Paste ingredients
          <textarea
            className="mt-2 min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={"1 lb chicken breast, diced\n2 cups cooked rice\nsalt to taste"}
            value={pasteText}
          />
        </label>
        <button
          className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
          onClick={parsePasteText}
          type="button"
        >
          Parse ingredients
        </button>
      </div>

      <datalist id={foodOptionsId}>
        {foods.map((food) => (
          <option key={food.id} value={food.name} />
        ))}
      </datalist>

      <div className="mt-4 space-y-4">
        {rows.map((ingredient, index) => (
          <IngredientRow
            categories={categories}
            foodOptionsId={foodOptionsId}
            foods={foods}
            index={index}
            ingredient={ingredient}
            key={`${index}-${ingredient.display_name}`}
            onDelete={() => deleteRow(index)}
            onUpdate={(patch) => updateRow(index, patch)}
          />
        ))}
      </div>
    </section>
  );
}

function IngredientRow({
  categories,
  foodOptionsId,
  foods,
  index,
  ingredient,
  onDelete,
  onUpdate
}: {
  categories: GroceryCategory[];
  foodOptionsId: string;
  foods: Food[];
  index: number;
  ingredient: IngredientFormRow;
  onDelete: () => void;
  onUpdate: (patch: Partial<IngredientFormRow>) => void;
}) {
  const needsReview = ingredient.needsReview ?? false;

  return (
    <div
      className={`rounded-md border p-4 ${
        needsReview ? "border-amber-400 bg-amber-50" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Ingredient {index + 1}
          </p>
          {needsReview ? (
            <p className="mt-1 text-sm font-medium text-amber-800">
              {ingredient.reviewReason ?? "Review this parsed row."}
            </p>
          ) : null}
        </div>
        <button
          className="rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
          onClick={onDelete}
          type="button"
        >
          Delete
        </button>
      </div>

      <input
        name="ingredientNeedsReview"
        type="hidden"
        value={needsReview ? "true" : "false"}
      />

      <div className="mt-3 grid gap-3 md:grid-cols-6">
        <label className="block text-sm font-medium md:col-span-2">
          Display name
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="ingredientDisplayName"
            onChange={(event) =>
              onUpdate({
                display_name: event.target.value,
                food_id: ingredient.food_id ?? findFoodId(foods, event.target.value)
              })
            }
            placeholder="Chicken breast"
            value={ingredient.display_name}
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Matched food
          <select
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="ingredientFoodId"
            onChange={(event) =>
              onUpdate({ food_id: event.target.value || null })
            }
            value={ingredient.food_id ?? ""}
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
            min="0.01"
            name="ingredientQuantity"
            onChange={(event) =>
              onUpdate({
                quantity: event.target.value ? Number(event.target.value) : null
              })
            }
            step="0.01"
            type="number"
            value={ingredient.quantity ?? ""}
          />
        </label>
        <label className="block text-sm font-medium">
          Unit
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="ingredientUnit"
            onChange={(event) => onUpdate({ unit: event.target.value || null })}
            placeholder="lb"
            value={ingredient.unit ?? ""}
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Category
          <select
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="ingredientCategoryId"
            onChange={(event) =>
              onUpdate({ grocery_category_id: event.target.value || null })
            }
            value={ingredient.grocery_category_id ?? ""}
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
          Create food
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            list={foodOptionsId}
            name="ingredientNewFoodName"
            placeholder="New or existing food name"
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Preparation
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="ingredientPreparation"
            onChange={(event) =>
              onUpdate({ preparation: event.target.value || null })
            }
            placeholder="diced, shredded, cooked"
            value={ingredient.preparation ?? ""}
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Notes
          <input
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="ingredientNotes"
            onChange={(event) => onUpdate({ notes: event.target.value || null })}
            value={ingredient.notes ?? ""}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-3">
          <input
            checked={ingredient.optional}
            name="ingredientOptional"
            onChange={(event) => onUpdate({ optional: event.target.checked })}
            type="checkbox"
            value={index}
          />
          Optional ingredient
        </label>
        {needsReview ? (
          <label className="flex items-center gap-2 text-sm font-medium md:col-span-3">
            <input name="ingredientReviewed" type="checkbox" value={index} />
            Reviewed
          </label>
        ) : null}
      </div>
    </div>
  );
}

function findFoodId(foods: Food[], displayName: string) {
  const normalizedDisplayName = normalizeName(displayName);

  if (!normalizedDisplayName) {
    return null;
  }

  const exactMatch = foods.find(
    (food) => normalizeName(food.name) === normalizedDisplayName
  );

  if (exactMatch) {
    return exactMatch.id;
  }

  return (
    foods.find((food) => normalizedDisplayName.includes(normalizeName(food.name)))
      ?.id ?? null
  );
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
