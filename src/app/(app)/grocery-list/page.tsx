import Link from "next/link";
import type { GroceryListItem, GroceryListStatus } from "@/lib/grocery/data";
import { getLatestGroceryList } from "@/lib/grocery/data";
import {
  buildGroceryListSummary,
  type GroceryListSummary
} from "@/lib/grocery/grocery-list-summary";
import {
  groupGroceryItemsByMeal,
  groupGroceryItemsByProfile,
  type GroceryItemContextGroup
} from "@/lib/grocery/group-grocery-list-items";
import { getNextGroceryListStatus } from "@/lib/grocery/lifecycle";
import { getGroceryCategories } from "@/lib/recipes/data";
import type { GroceryCategory } from "@/lib/recipes/types";
import { getMealProfiles } from "@/lib/settings/data";
import type { MealProfile } from "@/lib/settings/types";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  addManualGroceryItemAction,
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

  const [groceryList, groceryCategories, mealProfiles] = await Promise.all([
    getLatestGroceryList(householdContext.household.id),
    getGroceryCategories(householdContext.household.id),
    getMealProfiles(householdContext.household.id)
  ]);
  const categoryGroups = groceryList
    ? groupItemsByCategory(groceryList.items)
    : [];
  const profileGroups = groceryList
    ? groupGroceryItemsByProfile(groceryList.items)
    : [];
  const mealGroups = groceryList
    ? groupGroceryItemsByMeal(groceryList.items)
    : [];
  const groceryListSummary = buildGroceryListSummary(groceryList?.items ?? []);

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
          <GroceryListOverview
            groceryListId={groceryList.id}
            name={groceryList.name}
            status={groceryList.status}
            summary={groceryListSummary}
            view={view}
            weekStartDate={groceryList.weekStartDate}
          />

          <ManualGroceryItemForm
            groceryCategories={groceryCategories}
            groceryListId={groceryList.id}
            listStatus={groceryList.status}
            mealProfiles={mealProfiles}
            view={view}
          />

          <ViewSelector view={view} />

          {groceryListSummary.totalItemCount === 0 ? (
            <EmptyCurrentListState />
          ) : null}

          {view === "shopping" && groceryListSummary.totalItemCount > 0 ? (
            <CategoryGroupList
              groups={categoryGroups}
              listStatus={groceryList.status}
              view={view}
            />
          ) : null}

          {view === "profile" && groceryListSummary.totalItemCount > 0 ? (
            <ContextGroupList
              emptyMessage="No profile source context is available for this grocery list."
              groups={profileGroups}
              listStatus={groceryList.status}
              note="Profile View is source context. Consolidated items can appear under more than one profile."
              view={view}
            />
          ) : null}

          {view === "meal" && groceryListSummary.totalItemCount > 0 ? (
            <ContextGroupList
              emptyMessage="No meal source context is available for this grocery list."
              groups={mealGroups}
              listStatus={groceryList.status}
              note="Meal View is source context. Consolidated items can appear under more than one meal."
              view={view}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function GroceryListOverview({
  groceryListId,
  name,
  status,
  summary,
  view,
  weekStartDate
}: {
  groceryListId: string;
  name: string | null;
  status: GroceryListStatus;
  summary: GroceryListSummary;
  view: GroceryListView;
  weekStartDate: string | null;
}) {
  return (
    <section className="sticky top-0 z-10 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {name ?? "Generated grocery list"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {weekStartDate
              ? `Week of ${formatDisplayDate(weekStartDate)}`
              : "No weekly plan attached"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium">
              {formatStatus(status)}
            </span>
            <span className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
              {formatItemCount(summary.remainingItemCount)} left to buy
            </span>
            {summary.needsReviewItemCount > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900">
                {formatItemCount(summary.needsReviewItemCount)} need review
              </span>
            ) : null}
          </div>
        </div>
        <LifecycleAction
          groceryListId={groceryListId}
          status={status}
          view={view}
        />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryMetric label="Total items" value={summary.totalItemCount} />
        <SummaryMetric
          label="Remaining"
          value={summary.remainingItemCount}
        />
        <SummaryMetric label="Checked" value={summary.checkedItemCount} />
        <SummaryMetric
          label="Already have"
          value={summary.alreadyHaveItemCount}
        />
      </dl>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold sm:text-2xl">{value}</dd>
    </div>
  );
}

function EmptyGroceryListState() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-semibold">No grocery list yet</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Open Plan Week, approve a recipe item or select a staple, then generate
        a draft grocery list.
      </p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        href="/plan-week"
      >
        Open Plan Week
      </Link>
    </div>
  );
}

function EmptyCurrentListState() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-semibold">This list has no items</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Add a manual item here, or return to Plan Week and generate groceries
        from approved recipes and selected staples.
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

function ManualGroceryItemForm({
  groceryCategories,
  groceryListId,
  listStatus,
  mealProfiles,
  view
}: {
  groceryCategories: GroceryCategory[];
  groceryListId: string;
  listStatus: GroceryListStatus;
  mealProfiles: MealProfile[];
  view: GroceryListView;
}) {
  const canAddItems = canAddManualItems(listStatus);

  return (
    <details className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <summary className="min-h-11 cursor-pointer list-none text-lg font-semibold">
        Add grocery item
        <span className="mt-1 block text-sm font-normal text-muted-foreground">
          Open when something extra comes up while shopping.
        </span>
      </summary>
      {!canAddItems ? (
        <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Manual items are paused for this list status.
        </p>
      ) : null}
      <form action={addManualGroceryItemAction} className="mt-4 space-y-4">
        <input name="groceryListId" type="hidden" value={groceryListId} />
        <input name="view" type="hidden" value={view} />
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.7fr)]">
          <label className="text-sm font-medium">
            Grocery item name
            <input
              className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
              name="displayName"
              required
              type="text"
            />
          </label>
          <label className="text-sm font-medium">
            Grocery item quantity
            <input
              className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
              min="0.01"
              name="quantity"
              step="any"
              type="number"
            />
          </label>
          <label className="text-sm font-medium">
            Grocery item unit
            <input
              className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
              name="unit"
              type="text"
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Grocery category
            <select
              className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
              name="groceryCategoryId"
            >
              <option value="">Needs category</option>
              {groceryCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Grocery context
            <select
              className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
              name="mealProfileId"
            >
              <option value="">Household</option>
              {mealProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Grocery item note
          <input
            className="mt-1 min-h-12 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
            name="note"
            type="text"
          />
        </label>
        <button
          className="min-h-12 w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground md:w-auto"
          disabled={!canAddItems}
          type="submit"
        >
          Add item
        </button>
      </form>
    </details>
  );
}

function CategoryGroupList({
  groups,
  listStatus,
  view
}: {
  groups: GroceryCategoryGroup[];
  listStatus: GroceryListStatus;
  view: GroceryListView;
}) {
  return (
    <>
      {groups.map((group) => {
        const summary = buildGroceryListSummary(group.items);

        return (
          <details
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
            key={group.categoryName}
            open
          >
            <summary className="cursor-pointer">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xl font-semibold">
                  {group.categoryName}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {formatItemCount(summary.remainingItemCount)} left of{" "}
                  {formatItemCount(summary.totalItemCount)}
                </span>
              </div>
            </summary>
            <div className="mt-4 divide-y divide-border">
              {group.items.map((item) => (
                <GroceryItemRow
                  item={item}
                  key={item.id}
                  listStatus={listStatus}
                  view={view}
                />
              ))}
            </div>
          </details>
        );
      })}
    </>
  );
}

function ContextGroupList({
  emptyMessage,
  groups,
  listStatus,
  note,
  view
}: {
  emptyMessage: string;
  groups: GroceryItemContextGroup[];
  listStatus: GroceryListStatus;
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
          <summary className="cursor-pointer">
            <span className="text-xl font-semibold">{group.groupName}</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatItemCount(group.items.length)}
            </span>
          </summary>
          <div className="mt-4 divide-y divide-border">
            {group.items.map((item) => (
              <GroceryItemRow
                item={item}
                key={`${group.groupKey}:${item.id}`}
                listStatus={listStatus}
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
  listStatus,
  view
}: {
  item: GroceryListItem;
  listStatus: GroceryListStatus;
  view: GroceryListView;
}) {
  const canToggleItems = canToggleGroceryItems(listStatus);

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
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {formatItemShoppingState(item)}
          </p>
          {item.sources.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              From: {formatInlineSourceSummary(item.sources)}
            </p>
          ) : null}
          {item.reviewReason ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {item.reviewReason}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 md:min-w-64">
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
              disabled={!canToggleItems}
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
              className={`min-h-12 w-full rounded-md border px-4 py-3 text-left text-sm font-medium transition hover:bg-muted ${
                item.alreadyHave
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-border bg-card"
              }`}
              disabled={!canToggleItems}
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
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {item.sources.map((source) => (
              <div
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                key={source.id}
              >
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {formatSourceType(source.sourceType)}
                </p>
                <p className="mt-1 font-medium">{formatSourceLabel(source)}</p>
                {formatSourceQuantity(source) ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source amount: {formatSourceQuantity(source)}
                  </p>
                ) : null}
                {source.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {source.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function canToggleGroceryItems(status: GroceryListStatus) {
  return status === "draft" || status === "shopping_started";
}

function canAddManualItems(status: GroceryListStatus) {
  return status === "draft" || status === "shopping_started";
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
    <p
      aria-live="polite"
      className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
      role="status"
    >
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

function formatSourceType(sourceType: string) {
  if (sourceType === "meal_generated") {
    return "Recipe";
  }

  if (sourceType === "manual_add") {
    return "Manual add";
  }

  if (sourceType === "staple") {
    return "Selected staple";
  }

  return sourceType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatInlineSourceSummary(sources: GroceryListItem["sources"]) {
  const labels = Array.from(
    new Set(sources.map((source) => formatSourceType(source.sourceType)))
  );

  return labels.slice(0, 3).join(", ");
}

function formatSourceQuantity(source: GroceryListItem["sources"][number]) {
  if (source.quantity === null && !source.unit) {
    return null;
  }

  return [source.quantity, source.unit]
    .filter((value) => value !== null && value !== "")
    .join(" ");
}

function formatItemShoppingState(item: GroceryListItem) {
  if (item.checked) {
    return "Checked off";
  }

  if (item.alreadyHave) {
    return "Already have at home";
  }

  return "Still needed";
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
