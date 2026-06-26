import Link from "next/link";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Household setup
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Settings
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Manage the MealBoard profiles, food preferences, and reusable
          staples that support weekly planning and grocery lists.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/settings/household"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Shared access
          </p>
          <h2 className="mt-2 text-xl font-semibold">Household</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Review current household members, link existing auth users, and
            remove member access when needed.
          </p>
        </Link>

        <Link
          className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/settings/profiles"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Meal profiles
          </p>
          <h2 className="mt-2 text-xl font-semibold">Profiles</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            View Brianna, Elaine, Baby, and Shared/Family profiles. Edit notes,
            adult calorie targets, and Baby stage setup.
          </p>
        </Link>

        <Link
          className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/settings/preferences"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Food rules
          </p>
          <h2 className="mt-2 text-xl font-semibold">Preferences</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Set Love, Like, Okay, Dislike, Hard No, and Allergy preferences
            using saved household foods.
          </p>
        </Link>

        <Link
          className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/settings/foods"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Household food list
          </p>
          <h2 className="mt-2 text-xl font-semibold">Saved Foods</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create foods once, edit default units or grocery categories, and
            archive foods that should no longer be selected.
          </p>
        </Link>

        <Link
          className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/settings/baby"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Solids setup
          </p>
          <h2 className="mt-2 text-xl font-semibold">Baby</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Review Baby age/stage context and update birthdate or manual stage
            override for solids planning.
          </p>
        </Link>

        <Link
          className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/settings/staples"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Reusable groceries
          </p>
          <h2 className="mt-2 text-xl font-semibold">Staples</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create household and profile staples with default quantity,
            category, frequency, and notes.
          </p>
        </Link>
      </div>
    </section>
  );
}
