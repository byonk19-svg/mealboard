import Link from "next/link";
import {
  buildPantryCategoryGroups,
  classifyExpirationDate,
  getEffectiveStockStatus,
  getHouseholdDateString,
  searchPantryItems
} from "@/lib/pantry/domain";
import {
  getPantryItems,
  getPantryEventsByItemIds,
  getRecentPantryEvents
} from "@/lib/pantry/data";
import type {
  PantryCategoryGroup,
  PantryEvent,
  PantryExpirationStatus,
  PantryItem,
  PantryItemRollup,
  PantryStockStatus
} from "@/lib/pantry/types";
import { getGroceryCategories } from "@/lib/recipes/data";
import type { GroceryCategory } from "@/lib/recipes/types";
import { getFoods, getMealProfiles } from "@/lib/settings/data";
import type { Food, MealProfile } from "@/lib/settings/types";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  createPantryItemAction,
  discardPantryItemAction,
  updatePantryItemAction
} from "./actions";

type PantryPageProps = {
  searchParams: Promise<{
    categoryId?: string;
    message?: string;
    q?: string;
    view?: string;
  }>;
};

type PantryView = "all" | "low" | "expiring";

export default async function PantryPage({ searchParams }: PantryPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { categoryId, message, q, view: viewParam } = await searchParams;
  const view = parsePantryView(viewParam);

  if (!householdContext.household) {
    return null;
  }

  const householdId = householdContext.household.id;
  const [pantryItems, pantryEvents, foods, groceryCategories, mealProfiles] =
    await Promise.all([
      getPantryItems(householdId),
      getRecentPantryEvents(householdId, { limit: 16 }),
      getFoods(householdId, undefined, { limit: null }),
      getGroceryCategories(householdId),
      getMealProfiles(householdId)
    ]);
  const today = getHouseholdDateString();
  const pantryEventsByItemId = await getPantryEventsByItemIds({
    householdId,
    pantryItemIds: pantryItems.map((item) => item.id)
  });
  const searchedItems = searchPantryItems(pantryItems, q ?? "");
  const categoryFilteredItems = categoryId
    ? searchedItems.filter((item) => item.groceryCategoryId === categoryId)
    : searchedItems;
  const filteredItems = filterPantryItemsByView({
    items: categoryFilteredItems,
    today,
    view
  });
  const groups = buildPantryCategoryGroups({ items: filteredItems, today });
  const summary = buildPantrySummary(pantryItems, today);

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="calm-eyebrow">Smart Pantry</p>
          <h1 className="calm-heading mt-3 text-4xl md:text-[40px] md:leading-[48px]">
            Pantry
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Track household stock manually by item, category, status, storage,
            and expiration. Pantry changes stay separate from groceries,
            recipes, and Cooking Mode.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <SummaryTile label="Active items" value={summary.activeCount} />
          <SummaryTile label="Low or out" value={summary.lowOutCount} />
          <SummaryTile label="Expiring" value={summary.expiringCount} />
        </div>
      </div>

      {message ? <PantryMessage message={message} /> : null}

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="calm-heading text-xl">Add pantry item</h2>
        <PantryItemForm
          action={createPantryItemAction}
          foods={foods}
          groceryCategories={groceryCategories}
          mealProfiles={mealProfiles}
          mode="create"
          submitLabel="Add pantry item"
        />
      </section>

      <PantryFilters
        categoryId={categoryId ?? ""}
        groceryCategories={groceryCategories}
        query={q ?? ""}
        view={view}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {groups.length === 0 ? (
            <EmptyPantryState
              hasPantryItems={pantryItems.length > 0}
              query={q ?? ""}
              view={view}
            />
          ) : (
            groups.map((group) => (
          <PantryCategorySection
            foods={foods}
            groceryCategories={groceryCategories}
            group={group}
            key={group.categoryId ?? "uncategorized"}
            mealProfiles={mealProfiles}
            pantryEventsByItemId={pantryEventsByItemId}
            today={today}
          />
            ))
          )}
        </section>

        <RecentPantryEvents events={pantryEvents} />
      </div>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}

function PantryFilters({
  categoryId,
  groceryCategories,
  query,
  view
}: {
  categoryId: string;
  groceryCategories: GroceryCategory[];
  query: string;
  view: PantryView;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/pantry", label: "All", value: "all" },
          { href: "/pantry?view=low", label: "Low & out", value: "low" },
          {
            href: "/pantry?view=expiring",
            label: "Expiring soon",
            value: "expiring"
          }
        ].map((item) => (
          <Link
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              view === item.value
                ? "border-primary bg-secondary text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
            href={item.href}
            key={item.value}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_auto]">
        <input name="view" type="hidden" value={view} />
        <label className="block text-sm font-medium">
          Search pantry
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={query}
            name="q"
            placeholder="Search item, package, notes, category, storage"
            type="search"
          />
        </label>

        <label className="block text-sm font-medium">
          Category
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={categoryId}
            name="categoryId"
          >
            <option value="">All categories</option>
            {groceryCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <button
          className="self-end rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          type="submit"
        >
          Apply
        </button>
      </form>
    </section>
  );
}

function PantryCategorySection({
  foods,
  groceryCategories,
  group,
  mealProfiles,
  pantryEventsByItemId,
  today
}: {
  foods: Food[];
  groceryCategories: GroceryCategory[];
  group: PantryCategoryGroup;
  mealProfiles: MealProfile[];
  pantryEventsByItemId: Map<string, PantryEvent[]>;
  today: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="calm-heading text-2xl">{group.categoryName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {group.rollups.length} pantry{" "}
          {group.rollups.length === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="grid gap-4">
        {group.rollups.map((rollup) => (
          <PantryRollupCard
            foods={foods}
            groceryCategories={groceryCategories}
            key={rollup.foodId}
            mealProfiles={mealProfiles}
            pantryEventsByItemId={pantryEventsByItemId}
            rollup={rollup}
            today={today}
          />
        ))}
      </div>
    </section>
  );
}

function PantryRollupCard({
  foods,
  groceryCategories,
  mealProfiles,
  pantryEventsByItemId,
  rollup,
  today
}: {
  foods: Food[];
  groceryCategories: GroceryCategory[];
  mealProfiles: MealProfile[];
  pantryEventsByItemId: Map<string, PantryEvent[]>;
  rollup: PantryItemRollup;
  today: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">{rollup.foodName}</h3>
            <StatusBadge status={rollup.effectiveStockStatus} />
            {rollup.nearestExpirationDate ? (
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Next expires {rollup.nearestExpirationDate}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {rollup.items.length} {rollup.items.length === 1 ? "lot" : "lots"}
            {rollup.categoryName ? ` - ${rollup.categoryName}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {rollup.items.map((pantryItem) => (
          <PantryItemDetails
            foods={foods}
            groceryCategories={groceryCategories}
            item={pantryItem}
            key={pantryItem.id}
            mealProfiles={mealProfiles}
            pantryEvents={pantryEventsByItemId.get(pantryItem.id) ?? []}
            today={today}
          />
        ))}
      </div>
    </article>
  );
}

function PantryItemDetails({
  foods,
  groceryCategories,
  item,
  mealProfiles,
  pantryEvents,
  today
}: {
  foods: Food[];
  groceryCategories: GroceryCategory[];
  item: PantryItem;
  mealProfiles: MealProfile[];
  pantryEvents: PantryEvent[];
  today: string;
}) {
  return (
    <details className="rounded-lg border border-border bg-background p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{item.displayName}</h4>
              <StatusBadge status={getEffectiveStockStatus(item)} />
              <ExpirationBadge item={item} today={today} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatPantryItemDetails(item)}
            </p>
          </div>
          <span className="text-sm font-semibold text-primary">Edit</span>
        </div>
      </summary>

      <div className="mt-4 border-t border-border pt-4">
        <PantryItemForm
          action={updatePantryItemAction}
          foods={foods}
          groceryCategories={groceryCategories}
          item={item}
          mealProfiles={mealProfiles}
          mode="edit"
          submitLabel="Save pantry item"
        />

        <form action={discardPantryItemAction} className="mt-4 flex flex-col gap-3">
          <input name="pantryItemId" type="hidden" value={item.id} />
          <label className="block text-sm font-medium">
            Discard note
            <input
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              name="eventNote"
              placeholder="Used up, expired, donated"
              type="text"
            />
          </label>
          <button
            className="w-fit rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
            type="submit"
          >
            Discard from active pantry
          </button>
        </form>

        <PantryItemEventHistory events={pantryEvents} />
      </div>
    </details>
  );
}

function PantryItemForm({
  action,
  foods,
  groceryCategories,
  item,
  mealProfiles,
  mode,
  submitLabel
}: {
  action: (formData: FormData) => void | Promise<void>;
  foods: Food[];
  groceryCategories: GroceryCategory[];
  item?: PantryItem;
  mealProfiles: MealProfile[];
  mode: "create" | "edit";
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-4 space-y-4">
      {item ? <input name="pantryItemId" type="hidden" value={item.id} /> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="block text-sm font-medium">
          Household item
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.foodId ?? ""}
            name="foodId"
          >
            <option value="">Choose existing item</option>
            {foods.map((food) => (
              <option key={food.id} value={food.id}>
                {food.name}
              </option>
            ))}
          </select>
        </label>

        {mode === "create" ? (
          <label className="block text-sm font-medium">
            Or create household item
            <input
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              name="newFoodName"
              placeholder="Paper towels, yogurt, wipes"
              type="text"
            />
          </label>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <label className="block text-sm font-medium">
          Pantry display name
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.displayName ?? ""}
            name="displayName"
            placeholder="Daisy sour cream 16 oz"
            required
            type="text"
          />
        </label>

        <label className="block text-sm font-medium">
          Package detail
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.packageDetail ?? ""}
            name="packageDetail"
            placeholder="16 oz tub, 8-count pack"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="block text-sm font-medium">
          Quantity
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.quantity ?? ""}
            min="0"
            name="quantity"
            step="any"
            type="number"
          />
        </label>

        <label className="block text-sm font-medium">
          Unit
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.unit ?? ""}
            name="unit"
            placeholder="count, oz, lb"
            type="text"
          />
        </label>

        <label className="block text-sm font-medium md:col-span-2">
          Quantity note
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.quantityNote ?? ""}
            name="quantityNote"
            placeholder="half bag, one unopened box"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="block text-sm font-medium">
          Status
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.stockStatus ?? "in_stock"}
            name="stockStatus"
          >
            <option value="in_stock">In stock</option>
            <option value="low">Low</option>
            <option value="out">Out</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <label className="block text-sm font-medium">
          Low threshold
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.lowStockThresholdQuantity ?? ""}
            min="0"
            name="lowStockThresholdQuantity"
            step="any"
            type="number"
          />
        </label>

        <label className="block text-sm font-medium">
          Threshold unit
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.lowStockThresholdUnit ?? ""}
            name="lowStockThresholdUnit"
            placeholder="count"
            type="text"
          />
        </label>

        <label className="block text-sm font-medium">
          Expiration
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.expirationDate ?? ""}
            name="expirationDate"
            type="date"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="block text-sm font-medium">
          Storage
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.storageLocation ?? ""}
            name="storageLocation"
            placeholder="pantry, fridge, freezer"
            type="text"
          />
        </label>

        <label className="block text-sm font-medium">
          Category
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.groceryCategoryId ?? ""}
            name="groceryCategoryId"
          >
            <option value="">Uncategorized</option>
            {groceryCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Profile context
          <select
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.mealProfileId ?? ""}
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

        <label className="flex items-end gap-2 pb-3 text-sm font-medium">
          <input
            className="h-4 w-4"
            defaultChecked={item?.isOpen ?? false}
            name="isOpen"
            type="checkbox"
          />
          Opened
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Opened date
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue={item?.openedAt ? item.openedAt.slice(0, 10) : ""}
            name="openedAt"
            type="date"
          />
        </label>

        <label className="block text-sm font-medium">
          Event note
          <input
            className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="eventNote"
            placeholder="Optional reason for this change"
            type="text"
          />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Notes
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          defaultValue={item?.notes ?? ""}
          name="notes"
          placeholder="Anything helpful for this stock lot"
        />
      </label>

      <button
        className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function RecentPantryEvents({ events }: { events: PantryEvent[] }) {
  return (
    <aside className="space-y-3">
      <div>
        <h2 className="calm-heading text-xl">Recent changes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantry events explain changes without replacing current stock truth.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No pantry events yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <article
              className="rounded-lg border border-border bg-card p-4 text-sm shadow-sm"
              key={event.id}
            >
              <p className="font-semibold text-primary">
                {formatEventType(event.eventType)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {getEventDisplayName(event)}
              </p>
              {event.note ? (
                <p className="mt-2 text-muted-foreground">{event.note}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

function PantryItemEventHistory({ events }: { events: PantryEvent[] }) {
  return (
    <section className="mt-5 space-y-3 border-t border-border pt-4">
      <div>
        <h5 className="font-semibold">Item history</h5>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent pantry events for this stock lot.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          No item events yet.
        </p>
      ) : (
        <div className="grid gap-2">
          {events.map((event) => (
            <article
              className="rounded-lg border border-border bg-muted/30 p-3 text-sm"
              key={event.id}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-primary">
                  {formatEventType(event.eventType)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </p>
              </div>
              {event.note ? (
                <p className="mt-2 text-muted-foreground">{event.note}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: PantryStockStatus }) {
  const labels: Record<PantryStockStatus, string> = {
    in_stock: "In stock",
    low: "Low",
    out: "Out",
    unknown: "Unknown"
  };
  const className: Record<PantryStockStatus, string> = {
    in_stock: "border-emerald-200 bg-emerald-50 text-emerald-800",
    low: "border-amber-200 bg-amber-50 text-amber-800",
    out: "border-rose-200 bg-rose-50 text-rose-800",
    unknown: "border-border bg-muted text-muted-foreground"
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ExpirationBadge({ item, today }: { item: PantryItem; today: string }) {
  const status = classifyExpirationDate({
    expirationDate: item.expirationDate,
    today
  });

  if (status === "missing" || status === "not_expiring") {
    return null;
  }

  const labels: Record<Exclude<PantryExpirationStatus, "missing" | "not_expiring">, string> = {
    expired: "Expired",
    expiring_soon: "Expiring soon",
    today: "Expires today"
  };

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
      {labels[status]} {item.expirationDate}
    </span>
  );
}

function EmptyPantryState({
  hasPantryItems,
  query,
  view
}: {
  hasPantryItems: boolean;
  query: string;
  view: PantryView;
}) {
  const message = !hasPantryItems
    ? "No pantry items yet."
    : query
      ? "No pantry items match that search."
      : view === "low"
        ? "No low or out pantry items."
        : view === "expiring"
          ? "No expired or expiring-soon pantry items."
          : "No pantry items match this view.";

  return (
    <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function PantryMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function filterPantryItemsByView({
  items,
  today,
  view
}: {
  items: PantryItem[];
  today: string;
  view: PantryView;
}) {
  if (view === "low") {
    return items.filter((item) =>
      ["low", "out"].includes(getEffectiveStockStatus(item))
    );
  }

  if (view === "expiring") {
    return items.filter((item) =>
      ["expired", "today", "expiring_soon"].includes(
        classifyExpirationDate({ expirationDate: item.expirationDate, today })
      )
    );
  }

  return items;
}

function buildPantrySummary(items: PantryItem[], today: string) {
  return {
    activeCount: items.length,
    expiringCount: filterPantryItemsByView({ items, today, view: "expiring" })
      .length,
    lowOutCount: filterPantryItemsByView({ items, today, view: "low" }).length
  };
}

function parsePantryView(value: string | undefined): PantryView {
  return value === "low" || value === "expiring" ? value : "all";
}

function formatPantryItemDetails(item: PantryItem) {
  const quantityText = formatQuantity(item);
  const parts = [
    quantityText,
    item.packageDetail,
    item.storageLocation ? `Storage: ${item.storageLocation}` : null,
    item.mealProfileName ? `For ${item.mealProfileName}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : "No extra lot details";
}

function formatQuantity(item: PantryItem) {
  if (item.quantityNote) {
    return item.quantityNote;
  }

  if (item.quantity === null && !item.unit) {
    return null;
  }

  return [item.quantity, item.unit].filter(Boolean).join(" ");
}

function formatEventType(type: PantryEvent["eventType"]) {
  const labels: Record<PantryEvent["eventType"], string> = {
    adjusted: "Adjusted",
    category_changed: "Category changed",
    created: "Created",
    discarded: "Discarded",
    expiration_changed: "Expiration changed",
    notes_changed: "Notes changed",
    status_changed: "Status changed",
    storage_changed: "Storage changed"
  };

  return labels[type];
}

function getEventDisplayName(event: PantryEvent) {
  const state = event.afterState ?? event.beforeState;
  const displayName =
    state && typeof state.displayName === "string" ? state.displayName : null;

  return displayName ?? "Pantry item";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
