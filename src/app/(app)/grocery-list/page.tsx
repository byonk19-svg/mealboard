import type { GroceryListItem } from "@/lib/grocery/data";
import { getLatestGroceryList } from "@/lib/grocery/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

type GroceryListPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type GroceryCategoryGroup = {
  categoryName: string;
  categorySortOrder: number;
  items: GroceryListItem[];
};

export default async function GroceryListPage({
  searchParams
}: GroceryListPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { message } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const groceryList = await getLatestGroceryList(householdContext.household.id);
  const groups = groceryList ? groupItemsByCategory(groceryList.items) : [];

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
          Review the latest generated draft list. This view stays simple for
          Task 10B: generation, categories, review flags, and source context.
        </p>
      </div>

      {message ? <GroceryListMessage message={message} /> : null}

      {!groceryList ? (
        <EmptyGroceryListState />
      ) : (
        <>
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {groceryList.name ?? "Generated grocery list"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {groceryList.weekStartDate
                    ? `Week of ${formatDisplayDate(groceryList.weekStartDate)}`
                    : "No weekly plan attached"}
                  {" · "}
                  Status: {formatStatus(groceryList.status)}
                </p>
              </div>
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {groceryList.items.length} item
                {groceryList.items.length === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          {groups.map((group) => (
            <section
              className="rounded-lg border border-border bg-card p-5 shadow-sm"
              key={group.categoryName}
            >
              <h2 className="text-xl font-semibold">{group.categoryName}</h2>
              <div className="mt-4 divide-y divide-border">
                {group.items.map((item) => (
                  <GroceryItemRow item={item} key={item.id} />
                ))}
              </div>
            </section>
          ))}
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

function GroceryItemRow({ item }: { item: GroceryListItem }) {
  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{item.displayName}</h3>
            {item.needsReview ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                Review
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
      </div>

      {item.sources.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.sources.map((source) => (
            <span
              className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              key={source.id}
            >
              {source.label ??
                [source.recipeName, source.mealProfileName]
                  .filter(Boolean)
                  .join(" · ")}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
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

function formatQuantity(item: GroceryListItem) {
  if (item.preferredQuantityText) {
    return item.preferredQuantityText;
  }

  if (item.quantity === null && !item.unit) {
    return "Quantity needs review";
  }

  return [item.quantity, item.unit].filter((value) => value !== null).join(" ");
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
