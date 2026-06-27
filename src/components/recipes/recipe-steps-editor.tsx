"use client";

import { saveRecipeSteps } from "@/app/(app)/recipes/actions";
import type { RecipeStepDraft } from "@/lib/cooking-mode/domain";
import type { CookingModeRecipeStep } from "@/lib/cooking-mode/types";
import { useMemo, useState } from "react";

type RecipeStepEditorRow = {
  id: string | null;
  instruction: string;
  sectionLabel: string;
};

export function RecipeStepsEditor({
  draftSteps,
  recipeId,
  steps
}: {
  draftSteps: RecipeStepDraft[];
  recipeId: string;
  steps: CookingModeRecipeStep[];
}) {
  const initialRows = useMemo(
    () => buildInitialRows(steps, draftSteps),
    [draftSteps, steps]
  );
  const [rows, setRows] = useState<RecipeStepEditorRow[]>(initialRows);
  const hasReviewedSteps = steps.length > 0;

  function updateRow(index: number, patch: Partial<RecipeStepEditorRow>) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  }

  function removeRow(index: number) {
    setRows((currentRows) =>
      currentRows.length === 1
        ? [{ id: null, instruction: "", sectionLabel: "" }]
        : currentRows.filter((_row, rowIndex) => rowIndex !== index)
    );
  }

  function moveRow(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= rows.length) {
      return;
    }

    setRows((currentRows) => {
      const nextRows = [...currentRows];
      const [row] = nextRows.splice(index, 1);
      nextRows.splice(nextIndex, 0, row);
      return nextRows;
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cooking steps</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Reviewed steps are the Cooking Mode source of truth. Freeform
            instructions stay unchanged.
          </p>
        </div>
        <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
          {hasReviewedSteps ? `${steps.length} reviewed` : "Review required"}
        </span>
      </div>

      {!hasReviewedSteps && draftSteps.length > 0 ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Draft rows below came from the recipe instructions. Review and save
          them before starting Cooking Mode.
        </p>
      ) : null}

      <form action={saveRecipeSteps} className="mt-5 space-y-3">
        <input name="recipeId" type="hidden" value={recipeId} />

        {rows.map((row, index) => (
          <div
            className="grid gap-3 rounded-lg border border-border bg-background/70 p-3 md:grid-cols-[minmax(120px,180px)_minmax(0,1fr)_auto]"
            key={`${index}:${row.instruction}`}
          >
            <input name="stepId" type="hidden" value={row.id ?? ""} />
            <label className="text-sm font-medium">
              Section
              <input
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                name="stepSectionLabel"
                onChange={(event) =>
                  updateRow(index, { sectionLabel: event.target.value })
                }
                placeholder="Optional"
                value={row.sectionLabel}
              />
            </label>
            <label className="text-sm font-medium">
              Step {index + 1}
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                name="stepInstruction"
                onChange={(event) =>
                  updateRow(index, { instruction: event.target.value })
                }
                required
                value={row.instruction}
              />
            </label>
            <div className="flex items-end gap-2 md:flex-col md:items-stretch md:justify-end">
              <button
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                disabled={index === 0}
                onClick={() => moveRow(index, -1)}
                type="button"
              >
                Up
              </button>
              <button
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                disabled={index === rows.length - 1}
                onClick={() => moveRow(index, 1)}
                type="button"
              >
                Down
              </button>
              <button
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                onClick={() => removeRow(index)}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            onClick={() =>
              setRows((currentRows) => [
                ...currentRows,
                { id: null, instruction: "", sectionLabel: "" }
              ])
            }
            type="button"
          >
            Add step
          </button>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            type="submit"
          >
            Save cooking steps
          </button>
        </div>
      </form>
    </section>
  );
}

function buildInitialRows(
  steps: CookingModeRecipeStep[],
  draftSteps: RecipeStepDraft[]
): RecipeStepEditorRow[] {
  const sourceRows =
    steps.length > 0
      ? steps.map((step) => ({
          instruction: step.instruction,
          id: step.id,
          sectionLabel: step.sectionLabel ?? ""
        }))
      : draftSteps.map((step) => ({
          id: null,
          instruction: step.instruction,
          sectionLabel: step.sectionLabel ?? ""
        }));

  return sourceRows.length > 0
    ? sourceRows
    : [{ id: null, instruction: "", sectionLabel: "" }];
}
