import Link from "next/link";
import { RecipeImportForm } from "@/components/recipes/recipe-import-form";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

export default async function RecipeImportPage() {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Recipe library
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Import recipe
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Load structured recipe data from a URL, then review and correct it
          before saving. MealBoard stores only the reviewed recipe and source
          attribution.
        </p>
      </div>

      <RecipeImportForm />

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Other options</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          If URL import cannot read the page, use the private Chrome capture
          extension or paste ingredients into a manual recipe.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
            href="/recipes/new"
          >
            Add recipe manually
          </Link>
        </div>
      </section>
    </section>
  );
}
