import Link from "next/link";

const settingsSections = [
  {
    eyebrow: "Shared access",
    href: "/settings/household",
    title: "Household",
    description:
      "Review current household members, link existing auth users, and remove member access when needed."
  },
  {
    eyebrow: "Meal profiles",
    href: "/settings/profiles",
    title: "Profiles",
    description:
      "View Brianna, Elaine, Baby, and Shared/Family profiles. Edit notes, adult calorie targets, and Baby stage setup."
  },
  {
    eyebrow: "Food rules",
    href: "/settings/preferences",
    title: "Preferences",
    description:
      "Set Love, Like, Okay, Dislike, Hard No, and Allergy preferences using saved household foods."
  },
  {
    eyebrow: "Household food list",
    href: "/settings/foods",
    title: "Saved Foods",
    description:
      "Create foods once, edit default units or grocery categories, and archive foods that should no longer be selected."
  },
  {
    eyebrow: "Solids setup",
    href: "/settings/baby",
    title: "Baby",
    description:
      "Review Baby age/stage context and update birthdate or manual stage override for solids planning."
  },
  {
    eyebrow: "Reusable groceries",
    href: "/settings/staples",
    title: "Staples",
    description:
      "Create household and profile staples with default quantity, category, frequency, and notes."
  }
];

export default function SettingsPage() {
  return (
    <section className="space-y-7">
      <div>
        <p className="calm-eyebrow">Household setup</p>
        <h1 className="calm-heading mt-3 text-4xl md:text-[40px] md:leading-[48px]">
          Settings
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Manage the MealBoard profiles, food preferences, and reusable
          staples that support weekly planning and grocery lists.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="calm-card h-fit p-3">
          <nav className="grid gap-1" aria-label="Settings sections">
            {settingsSections.map((section, index) => (
              <Link
                className={`rounded-lg px-4 py-3 text-sm font-bold ${
                  index === 0
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                }`}
                href={section.href}
                key={section.href}
              >
                {section.title}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => (
            <Link
              className="calm-card p-5 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={section.href}
              key={section.href}
            >
              <p className="calm-eyebrow">{section.eyebrow}</p>
              <h2 className="calm-heading mt-2 text-xl">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
