import Link from "next/link";
import type { ReactNode } from "react";
import { getDashboardCurrentWeekSnapshot } from "@/lib/dashboard/data";
import { formatDashboardStatus } from "@/lib/dashboard/current-week-summary";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import { getWeekDates, getWeekStartDate } from "@/lib/weekly-plans/week-dates";

export default async function DashboardPage() {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    return null;
  }

  const weekStartDate = getWeekStartDate(new Date());
  const snapshot = await getDashboardCurrentWeekSnapshot({
    householdId: householdContext.household.id,
    weekStartDate
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Current Week
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {formatWeekRange(snapshot.weekStartDate)}
          </p>
        </div>
        <Link
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={snapshot.nextAction.href}
        >
          {snapshot.nextAction.label}
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Next best action
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          {snapshot.nextAction.label}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {snapshot.nextAction.description}
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-xl font-semibold">Needs attention</h2>
          <p className="text-sm text-muted-foreground">
            {snapshot.attentionItems.length}{" "}
            {snapshot.attentionItems.length === 1 ? "item" : "items"}
          </p>
        </div>
        {snapshot.attentionItems.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {snapshot.attentionItems.map((item) => (
              <article
                className="rounded-md border border-border bg-background p-4"
                key={item.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{item.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Link
                    className="w-fit rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    href={item.href}
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            No current week items need action.
          </p>
        )}
      </section>

      {snapshot.weeklyPlan &&
      snapshot.groceryList?.status === "completed" &&
      snapshot.weeklyWrapUp?.status !== "dismissed" &&
      snapshot.weeklyWrapUp?.status !== "completed" ? (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Optional wrap-up
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Review this week
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Capture quick notes only for meals or groceries that need
                attention.
              </p>
            </div>
            <Link
              className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              href={`/weekly-wrap-up/${snapshot.weeklyPlan.id}`}
            >
              Open weekly wrap-up
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard
          actionHref="/plan-week"
          actionLabel="Open Plan Week"
          eyebrow="Planning status"
          title={
            snapshot.weeklyPlan
              ? formatDashboardStatus(snapshot.weeklyPlan.status)
              : "No plan yet"
          }
        >
          {snapshot.weeklyPlan ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              <Metric
                label="Planned items"
                value={String(snapshot.weeklyPlan.totalPlanItemCount)}
              />
              <Metric
                label="Approved grocery inputs"
                value={String(snapshot.weeklyPlan.approvedGroceryInputItemCount)}
              />
              <Metric
                label="Needs review"
                value={String(snapshot.weeklyPlan.unapprovedPlanItemCount)}
              />
              <Metric
                label="Selected staples"
                value={String(snapshot.weeklyPlan.selectedStapleCount)}
              />
            </dl>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Create this week before adding meals, staples, and groceries.
            </p>
          )}
        </SummaryCard>

        <SummaryCard
          actionHref="/grocery-list"
          actionLabel="Open Grocery List"
          eyebrow="Grocery status"
          title={
            snapshot.groceryList
              ? formatDashboardStatus(snapshot.groceryList.status)
              : "No current list"
          }
        >
          {snapshot.groceryList ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Metric
                label="Checked"
                value={`${snapshot.groceryList.checkedItemCount} of ${snapshot.groceryList.itemCount}`}
              />
              <Metric
                label="Generated"
                value={
                  snapshot.groceryList.generatedAt
                    ? formatDisplayDate(snapshot.groceryList.generatedAt)
                    : "Not recorded"
                }
              />
            </dl>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Generate a grocery list from Plan Week when meals or staples are
              ready.
            </p>
          )}
        </SummaryCard>
      </div>

      <nav
        aria-label="Dashboard shortcuts"
        className="grid gap-3 sm:grid-cols-3"
      >
        <ShortcutCard
          description="Review meals, staples, and grocery generation readiness."
          href="/plan-week"
          label="Plan Week"
        />
        <ShortcutCard
          description="Shop the latest generated list and source context."
          href="/grocery-list"
          label="Grocery List"
        />
        <ShortcutCard
          description="Maintain recipes, nutrition estimates, and approvals."
          href="/recipes"
          label="Recipes"
        />
      </nav>
    </section>
  );
}

function SummaryCard({
  actionHref,
  actionLabel,
  children,
  eyebrow,
  title
}: {
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        </div>
        <Link
          className="w-fit rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function ShortcutCard({
  description,
  href,
  label
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      href={href}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
        {description}
      </span>
    </Link>
  );
}

function formatWeekRange(weekStartDate: string) {
  const weekDates = getWeekDates(weekStartDate);
  const start = weekDates[0]?.dateKey ?? weekStartDate;
  const end = weekDates[6]?.dateKey ?? weekStartDate;

  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}

function formatDisplayDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(parseDateKey(dateKey.slice(0, 10)));
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}
