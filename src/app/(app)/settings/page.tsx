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
          Manage the MealBoard profile, preference, and staple foundation.
          Planning and grocery review settings come in later task slices.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/settings/profiles"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Meal profiles
          </p>
          <h2 className="mt-2 text-xl font-semibold">Profiles</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            View Brianna, Elaine, Baby, and Shared/Family profiles. Edit notes
            and existing target fields.
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
            using seeded foods.
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
