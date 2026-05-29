import Link from "next/link";
import type { GroceryListItem, GroceryListStatus } from "@/lib/grocery/data";
import { getLatestGroceryList } from "@/lib/grocery/data";
import {
  groupGroceryItemsByMeal,
  groupGroceryItemsByProfile,
  type GroceryItemContextGroup
} from "@/lib/grocery/group-grocery-list-items";
import { getNextGroceryListStatus } from "@/lib/grocery/lifecycle";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  advanceGroceryListLifecycleAction,
  updateGroceryItemAlreadyHave,
  updateGroceryItemChecked
} from "./actions";

type GroceryListPageProps = {
  searchParams: Promise<{
    message?: string;
    view?: string;
  }>;
};

type GroceryListView = "shopping" | "profile" | "meal";

type GroceryCategoryGroup = {
  categoryName: string;
  categorySortOrder: number;
  items: GroceryListItem[];
};

export default async function GroceryListPage({
  searchParams
}: GroceryListPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message, view: viewParam } = await searchParams;
  const view = parseGroceryListView(viewParam);

  if (!householdContext.household) {
    return null;
  }

  const groceryList = await getLatestGroceryList(householdContext.household.id);
  const categoryGroups = groceryList
    ? groupItemsByCategory(groceryList.items)
    : [];
  const profileGroups = groceryList
    ? groupGroceryItemsByProfile(groceryList.items)
    : [];
  const mealGroups = groceryList
    ? groupGroceryItemsByMeal(groceryList.items)
    : [];
  const completedItemCount =
    groceryList?.items.filter((item) => item.checked).length ?? 0;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Grocery List
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Current Grocery List
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Shop from the current generated list by category. Check off items,
          mark what you already have, and keep source context visible while you
          shop.
        </p>
      </div>

      {message ? <GroceryListMessage message={message} /> : null}

      {!groceryList ? (
        <EmptyGroceryListState />
      ) : (
        <>
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {groceryList.name ?? "Generated grocery list"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {groceryList.weekStartDate
                    ? `Week of ${formatDisplayDate(groceryList.weekStartDate)}`
                    : "No weekly plan attached"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium">
                    {formatStatus(groceryList.status)}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
                    {completedItemCount} of {groceryList.items.length} checked
                  </span>
                </div>
              </div>
              <LifecycleAction
                groceryListId={groceryList.id}
                status={groceryList.status}
                view={view}
              />
            </div>
          </section>

          <ViewSelector view={view} />

          {view === "shopping" ? (
            <CategoryGroupList groups={categoryGroups} view={view} />
          ) : null}

          {view === "profile" ? (
            <ContextGroupList
              emptyMessage="No profile source context is available for this grocery list."
              groups={profileGroups}
              note="Profile View is source context. Consolidated items can appear under more than one profile."
              view={view}
            />
          ) : null}

          {view === "meal" ? (
            <ContextGroupList
              emptyMessage="No meal source context is available for this grocery list."
              groups={mealGroups}
              note="Meal View is source context. Consolidated items can appear under more than one meal."
              view={view}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function EmptyGroceryListState() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-semibold">No grocery list yet</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Open Plan Week, approve at least one recipe item, and generate a draft
        grocery list.
      </p>
    </div>
  );
}

function ViewSelector({ view }: { view: GroceryListView }) {
  const options: Array<{
    href: string;
    label: string;
    view: GroceryListView;
  }> = [
    { href: "/grocery-list", label: "Shopping", view: "shopping" },
    { href: "/grocery-list?view=profile", label: "Profile", view: "profile" },
    { href: "/grocery-list?view=meal", label: "Meal", view: "meal" }
  ];

  return (
    <nav
      aria-label="Grocery list view"
      className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-2 shadow-sm"
    >
      {options.map((option) => {
        const isActive = option.view === view;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`min-h-12 rounded-md px-3 py-3 text-center text-sm font-medium transition ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            href={option.href}
            key={option.view}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

function CategoryGroupList({
  groups,
  view
}: {
  groups: GroceryCategoryGroup[];
  view: GroceryListView;
}) {
  return (
    <>
      {groups.map((group) => (
        <details
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
          key={group.categoryName}
          open
        >
          <summary className="cursor-pointer list-none text-xl font-semibold">
            <span>{group.categoryName}</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatItemCount(group.items.length)}
            </span>
          </summary>
          <div className="mt-4 divide-y divide-border">
            {group.items.map((item) => (
              <GroceryItemRow item={item} key={item.id} view={view} />
            ))}
          </div>
        </details>
      ))}
    </>
  );
}

function ContextGroupList({
  emptyMessage,
  groups,
  note,
  view
}: {
  emptyMessage: string;
  groups: GroceryItemContextGroup[];
  note: string;
  view: GroceryListView;
}) {
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        {note}
      </p>
      {groups.map((group) => (
        <details
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
          key={group.groupKey}
          open
        >
          <summary className="cursor-pointer list-none text-xl font-semibold">
            <span>{group.groupName}</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatItemCount(group.items.length)}
            </span>
          </summary>
          <div className="mt-4 divide-y divide-border">
            {group.items.map((item) => (
              <GroceryItemRow
                item={item}
                key={`${group.groupKey}:${item.id}`}
                view={view}
              />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}

function GroceryItemRow({
  item,
  view
}: {
  item: GroceryListItem;
  view: GroceryListView;
}) {
  return (
    <article
      className={`py-4 first:pt-0 last:pb-0 ${
        item.checked || item.alreadyHave ? "opacity-75" : ""
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-medium ${
                item.checked ? "text-muted-foreground line-through" : ""
              }`}
            >
              {item.displayName}
            </h3>
            {item.needsReview ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                Review
              </span>
            ) : null}
            {item.alreadyHave ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900">
                Already Have
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatQuantity(item)}
          </p>
          {item.reviewReason ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {item.reviewReason}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:min-w-64">
          <form action={updateGroceryItemChecked}>
            <input name="itemId" type="hidden" value={item.id} />
            <input name="view" type="hidden" value={view} />
            <input
              name="checked"
              type="hidden"
              value={String(!item.checked)}
            />
            <button
              className={`min-h-12 w-full rounded-md border px-4 py-3 text-left text-sm font-medium transition ${
                item.checked
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-primary bg-primary text-primary-foreground"
              }`}
              type="submit"
            >
              {item.checked ? "Uncheck" : "Check off"}
            </button>
          </form>
          <form action={updateGroceryItemAlreadyHave}>
            <input name="itemId" type="hidden" value={item.id} />
            <input name="view" type="hidden" value={view} />
            <input
              name="alreadyHave"
              type="hidden"
              value={String(!item.alreadyHave)}
            />
            <button
              className="min-h-12 w-full rounded-md border border-border bg-card px-4 py-3 text-left text-sm font-medium transition hover:bg-muted"
              type="submit"
            >
              {item.alreadyHave ? "Need to buy" : "Already have"}
            </button>
          </form>
        </div>
      </div>

      {item.sources.length > 0 ? (
        <details className="mt-3 rounded-md border border-border bg-muted px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Why is this on the list?
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.sources.map((source) => (
              <span
                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
                key={source.id}
              >
                {formatSourceLabel(source)}
              </span>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function LifecycleAction({
  groceryListId,
  status,
  view
}: {
  groceryListId: string;
  status: GroceryListStatus;
  view: GroceryListView;
}) {
  const nextStatus = getNextGroceryListStatus(status);

  if (!nextStatus) {
    return (
      <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        This grocery list is completed.
      </p>
    );
  }

  return (
    <form action={advanceGroceryListLifecycleAction}>
      <input name="groceryListId" type="hidden" value={groceryListId} />
      <input name="view" type="hidden" value={view} />
      <button
        className="min-h-12 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        type="submit"
      >
        {formatLifecycleAction(nextStatus)}
      </button>
    </form>
  );
}

function parseGroceryListView(value: string | undefined): GroceryListView {
  if (value === "profile" || value === "meal") {
    return value;
  }

  return "shopping";
}

function GroceryListMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function groupItemsByCategory(items: GroceryListItem[]) {
  const groupsByCategory = new Map<string, GroceryCategoryGroup>();

  for (const item of items) {
    const categoryName = item.categoryName ?? "Needs category";
    const group = groupsByCategory.get(categoryName) ?? {
      categoryName,
      categorySortOrder: item.categorySortOrder ?? Number.MAX_SAFE_INTEGER,
      items: []
    };
    group.items.push(item);
    groupsByCategory.set(categoryName, group);
  }

  return Array.from(groupsByCategory.values()).sort((a, b) => {
    if (a.categorySortOrder !== b.categorySortOrder) {
      return a.categorySortOrder - b.categorySortOrder;
    }

    return a.categoryName.localeCompare(b.categoryName);
  });
}

function formatItemCount(count: number) {
  return `${count} item${count === 1 ? "" : "s"}`;
}

function formatQuantity(item: GroceryListItem) {
  if (item.preferredQuantityText) {
    return item.preferredQuantityText;
  }

  if (item.quantity === null && !item.unit) {
    return "Quantity needs review";
  }

  return [item.quantity, item.unit].filter((value) => value !== null).join(" ");
}

function formatSourceLabel(source: GroceryListItem["sources"][number]) {
  const fallbackLabel = [source.recipeName, source.mealProfileName]
    .filter(Boolean)
    .join(" - ");

  return source.label ?? (fallbackLabel || "Grocery source");
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLifecycleAction(status: string) {
  if (status === "finalized") {
    return "Finalize list";
  }

  if (status === "shopping_started") {
    return "Start shopping";
  }

  return "Complete shopping";
}

function formatDisplayDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(parseDateKey(dateKey));
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}
