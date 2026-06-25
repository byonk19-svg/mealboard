import Link from "next/link";
import { RecipeImportForm } from "@/components/recipes/recipe-import-form";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type RecipeImportPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function RecipeImportPage({
  searchParams
}: RecipeImportPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message } = await searchParams;

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

      {message ? <RecipeImportMessage message={message} /> : null}

      <RecipeImportForm />

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Chrome capture fallback</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          If URL import cannot read the page, use the private Chrome extension
          while the recipe is visible in your browser.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>
            In Chrome extensions, load the unpacked extension from
            <span className="font-medium text-foreground">
              {" "}
              extension/mealboard-recipe-capture
            </span>
            .
          </li>
          <li>
            Open the recipe page, dismiss popups, and scroll until the recipe
            card or instructions are visible.
          </li>
          <li>
            Click the extension and choose Capture active tab. If a site blocks
            structured capture, select the visible recipe text and capture again.
          </li>
        </ol>
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

function RecipeImportMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
