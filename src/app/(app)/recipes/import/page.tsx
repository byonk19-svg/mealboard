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
    <section className="space-y-7">
      <div>
        <p className="calm-eyebrow">Recipe library</p>
        <h1 className="calm-heading mt-3 text-4xl md:text-[40px] md:leading-[48px]">
          Import recipe
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Load structured recipe data from a URL, then review and correct it
          before saving. MealBoard stores only the reviewed recipe and source
          attribution.
        </p>
      </div>

      {message ? <RecipeImportMessage message={message} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <RecipeImportForm />

        <section className="calm-card p-5 md:p-6">
          <p className="calm-eyebrow">Fallback</p>
          <h2 className="calm-heading mt-2 text-2xl">
            Chrome capture fallback
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            If URL import cannot read the page, use the private Chrome
            extension while the recipe is visible in your browser.
          </p>
          <ol className="mt-5 grid gap-3 text-sm leading-6 text-muted-foreground">
            {[
              "Load the unpacked extension from extension/mealboard-recipe-capture.",
              "Open the recipe page, dismiss popups, and scroll until the recipe card or instructions are visible.",
              "Click the extension and choose Capture active tab. If needed, select the visible recipe text and capture again."
            ].map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-extrabold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="calm-button-secondary px-4 py-2 hover:bg-muted"
              href="/recipes/new"
            >
              Add recipe manually
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

function RecipeImportMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
