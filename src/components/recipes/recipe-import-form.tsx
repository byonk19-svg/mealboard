"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function RecipeImportForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const url = String(formData.get("recipeUrl") ?? "").trim();

    try {
      const response = await fetch("/api/recipes/import", {
        body: JSON.stringify({ url }),
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as {
        draft?: unknown;
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        setError(payload.error ?? "Recipe import failed.");
        return;
      }

      const draftKey = `mealboard-recipe-import:${crypto.randomUUID()}`;
      window.sessionStorage.setItem(draftKey, JSON.stringify(payload.draft));
      router.push(
        `/recipes/import/review?source=url&draft=${encodeURIComponent(draftKey)}`
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Recipe import failed."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
      onSubmit={submitImport}
    >
      <label className="block text-sm font-medium">
        Recipe URL
        <input
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          name="recipeUrl"
          placeholder="https://example.com/recipe"
          required
          type="url"
        />
      </label>
      {error ? (
        <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Loading recipe..." : "Load recipe for review"}
        </button>
      </div>
    </form>
  );
}
