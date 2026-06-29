import Link from "next/link";
import Image from "next/image";
import type {
  CompletedGroceryListSummary,
  GroceryListItem,
  GroceryListStatus
} from "@/lib/grocery/data";
import {
  getCompletedGroceryListById,
  getLatestGroceryList,
  getRecentCompletedGroceryLists
} from "@/lib/grocery/data";
import {
  buildGroceryListSummary,
  type GroceryListSummary
} from "@/lib/grocery/grocery-list-summary";
import { buildGroceryListCopyText } from "@/lib/grocery/copy-grocery-list";
import { getGroceryProgressStorageKey } from "@/lib/grocery/mobile-progress";
import {
  groupGroceryItemsByMeal,
  groupGroceryItemsByProfile,
  type GroceryItemContextGroup
} from "@/lib/grocery/group-grocery-list-items";
import { getNextGroceryListStatus } from "@/lib/grocery/lifecycle";
import { getPantryIntakeCandidates } from "@/lib/pantry/data";
import type { PantryIntakeCandidate } from "@/lib/pantry/intake-candidates";
import { getGroceryCategories } from "@/lib/recipes/data";
import type { GroceryCategory } from "@/lib/recipes/types";
import { getMealProfiles } from "@/lib/settings/data";
import type { MealProfile } from "@/lib/settings/types";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  addManualGroceryItemAction,
  advanceGroceryListLifecycleAction,
  confirmPantryIntakeCandidateAction,
  skipPantryIntakeCandidateAction
} from "./actions";
import { CopyGroceryListButton } from "./copy-grocery-list-button";
import { GroceryItemStateControls } from "./grocery-item-state-controls";

const groceryCtaImageUrl =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCNzTsXI0Ku10zSBGGamdNWC_RanwSg3R_8MNuJn0lnRsAkCMYlhGwtrkpe3MscUiMj5fvOP0jcOeOzClQKTLP2qwTaC2btC7NDfC9CEiodw8p6brWlY2abk4bp2vNxoN2Bk3P3L3SNjaLoZwg_yCgDfrzXrrqM0z36-COZUiLy6tkNIdMsU_Csr5LHnCCyN12UyHzOm61Z1kSWCqboq8SXHoFovj6LtTgwX8eMSAU5jEhspBEUcRWJJQ";

type GroceryListPageProps = {
  searchParams: Promise<{
    listId?: string;
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
  const { listId, message, view: viewParam } = await searchParams;
  const view = parseGroceryListView(viewParam);

  if (!householdContext.household) {
    return null;
  }

  const householdId = householdContext.household.id;
  const [groceryList, recentCompletedLists, groceryCategories, mealProfiles] =
    await Promise.all([
      listId
        ? getCompletedGroceryListById({
            groceryListId: listId,
            householdId
          })
        : getLatestGroceryList(householdId),
      getRecentCompletedGroceryLists({ householdId }),
      getGroceryCategories(householdContext.household.id),
      getMealProfiles(householdContext.household.id)
    ]);
  const isHistoricalList = Boolean(listId);
  const pantryIntakeCandidates =
    groceryList && isHistoricalList
      ? await getPantryIntakeCandidates({
          groceryListId: groceryList.id,
          householdId
        })
      : [];
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
  const copyText = groceryList
    ? buildGroceryListCopyText({
        items: groceryList.items,
        title: groceryList.name ?? "MealBoard grocery list",
        weekStartDate: groceryList.weekStartDate
      })
    : "";
  const progressStorageKey = groceryList
    ? getGroceryProgressStorageKey({
        generatedAt: groceryList.generatedAt,
        groceryListId: groceryList.id
      })
    : null;

  return (
    <section className="space-y-7">
      <div>
        <p className="calm-eyebrow">Grocery List</p>
        <h1 className="calm-heading mt-3 text-4xl md:text-[40px] md:leading-[48px]">
          Groceries
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Shop from the current generated list by category. Check off items,
          mark what you already have, and keep source context visible while you
          shop.
        </p>
      </div>

      {message ? <GroceryListMessage message={message} /> : null}

      {!groceryList ? (
        isHistoricalList ? (
          <UnavailableHistoricalListState lists={recentCompletedLists} />
        ) : (
          <EmptyGroceryListState />
        )
      ) : (
        <>
          <GroceryListOverview
            copyText={copyText}
            groceryListId={groceryList.id}
            isHistoricalList={isHistoricalList}
            name={groceryList.name}
            status={groceryList.status}
            summary={groceryListSummary}
            view={view}
            weekStartDate={groceryList.weekStartDate}
          />

          {isHistoricalList ? (
            <PantryIntakeReviewSection
              candidates={pantryIntakeCandidates}
              groceryCategories={groceryCategories}
              listId={groceryList.id}
              view={view}
            />
          ) : null}

          <ManualGroceryItemForm
            groceryCategories={groceryCategories}
            groceryListId={groceryList.id}
            isHistoricalList={isHistoricalList}
            listStatus={groceryList.status}
            mealProfiles={mealProfiles}
            view={view}
          />

          <ViewSelector listId={listId} view={view} />

          <RecentCompletedLists
            currentListId={groceryList.id}
            lists={recentCompletedLists}
          />

          <GroceryRecipeCta />

          {groceryListSummary.totalItemCount === 0 ? (
            <EmptyCurrentListState />
          ) : null}

          {view === "shopping" && groceryListSummary.totalItemCount > 0 ? (
            <CategoryGroupList
              groups={categoryGroups}
              listStatus={groceryList.status}
              progressStorageKey={progressStorageKey}
            />
          ) : null}

          {view === "profile" && groceryListSummary.totalItemCount > 0 ? (
            <ContextGroupList
              emptyMessage="No profile source context is available for this grocery list."
              groups={profileGroups}
              listStatus={groceryList.status}
              note="Profile View is source context. Consolidated items can appear under more than one profile."
              progressStorageKey={progressStorageKey}
            />
          ) : null}

          {view === "meal" && groceryListSummary.totalItemCount > 0 ? (
            <ContextGroupList
              emptyMessage="No meal source context is available for this grocery list."
              groups={mealGroups}
              listStatus={groceryList.status}
              note="Meal View is source context. Consolidated items can appear under more than one meal."
              progressStorageKey={progressStorageKey}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function GroceryListOverview({
  copyText,
  groceryListId,
  isHistoricalList,
  name,
  status,
  summary,
  view,
  weekStartDate
}: {
  copyText: string;
  groceryListId: string;
  isHistoricalList: boolean;
  name: string | null;
  status: GroceryListStatus;
  summary: GroceryListSummary;
  view: GroceryListView;
  weekStartDate: string | null;
}) {
  return (
    <section className="calm-card p-5 lg:sticky lg:top-32 lg:z-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="calm-heading text-xl">
            {name ?? "Generated grocery list"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {weekStartDate
              ? `Week of ${formatDisplayDate(weekStartDate)}`
              : "No weekly plan attached"}
          </p>
          {isHistoricalList ? (
            <p className="mt-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Viewing a completed list from history. Use the current grocery
              list for new shopping changes.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <CopyGroceryListButton
            copyText={copyText}
            disabled={summary.totalItemCount === 0}
          />
          {isHistoricalList ? (
            <Link
              className="min-h-12 rounded-lg border border-primary/30 bg-card px-4 py-3 text-sm font-bold text-primary hover:border-primary hover:bg-muted"
              href="/grocery-list"
            >
              Back to current list
            </Link>
          ) : (
            <LifecycleAction
              groceryListId={groceryListId}
              status={status}
              view={view}
            />
          )}
        </div>
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
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-3">
      <dt className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-bold text-primary sm:text-2xl">
        {value}
      </dd>
    </div>
  );
}

function GroceryRecipeCta() {
  return (
    <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_36px_rgba(22,56,38,0.18)]">
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="p-6 md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground/70">
            Meal planning
          </p>
          <h2 className="mt-3 font-['Manrope'] text-3xl font-bold">
            Plan your next feast?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/80">
            Turn approved meals and selected staples into the next organized
            grocery run.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary-foreground px-5 py-3 text-sm font-bold text-primary"
            href="/recipes"
          >
            Browse Recipes
          </Link>
        </div>
        <div className="relative min-h-56 overflow-hidden">
          <Image
            alt="A bright salad on a dark green background."
            className="h-full w-full object-cover"
            fill
            sizes="(min-width: 768px) 260px, 100vw"
            src={groceryCtaImageUrl}
          />
        </div>
      </div>
    </section>
  );
}

function EmptyGroceryListState() {
  return (
    <div className="calm-card p-5">
      <h2 className="calm-heading text-xl">No grocery list yet</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Open Plan Week, approve a recipe item or select a staple, then generate
        a draft grocery list.
      </p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
        href="/plan-week"
      >
        Open Plan Week
      </Link>
    </div>
  );
}

function EmptyCurrentListState() {
  return (
    <div className="calm-card p-5">
      <h2 className="calm-heading text-xl">This list has no items</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Add a manual item here, or return to Plan Week and generate groceries
        from approved recipes and selected staples.
      </p>
    </div>
  );
}

function UnavailableHistoricalListState({
  lists
}: {
  lists: CompletedGroceryListSummary[];
}) {
  return (
    <div className="space-y-4">
      <section className="calm-card p-5">
        <h2 className="calm-heading text-xl">
          Completed grocery list unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This completed grocery list link no longer matches an available
          completed list. It may have been deleted, replaced, or it may still be
          the current shopping list.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            href="/grocery-list"
          >
            Open current grocery list
          </Link>
          {lists.length > 0 ? (
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary/30 px-4 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-muted"
              href="#recent-completed-grocery-lists"
            >
              Review recent completed lists
            </a>
          ) : null}
        </div>
      </section>

      {lists.length > 0 ? (
        <RecentCompletedLists currentListId={null} lists={lists} />
      ) : (
        <section className="calm-card p-5">
          <h2 className="calm-heading text-xl">
            No completed grocery history yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Complete a current grocery list to make it available here later.
          </p>
        </section>
      )}
    </div>
  );
}

function PantryIntakeReviewSection({
  candidates,
  groceryCategories,
  listId,
  view
}: {
  candidates: PantryIntakeCandidate[];
  groceryCategories: GroceryCategory[];
  listId: string;
  view: GroceryListView;
}) {
  const candidate = candidates[0] ?? null;

  return (
    <section className="calm-card p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="calm-heading text-xl">Pantry intake review</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Checked items from this completed list can become pantry stock only
            after you confirm them. Skipping keeps them out of future review.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatItemCount(candidates.length)}
        </span>
      </div>

      {!candidate ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-3">
          <h3 className="font-bold text-primary">
            No pantry intake candidates in this completed list.
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Already-have items, unchecked items, items without a linked food, and
            already reviewed items do not appear here.
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-primary/30 px-4 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-muted"
            href="/pantry"
          >
            Open Pantry
          </Link>
        </div>
      ) : (
        <article className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-primary">
                {candidate.displayName}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPantryIntakeQuantity(candidate)}
                {candidate.groceryCategoryName
                  ? ` - ${candidate.groceryCategoryName}`
                  : ""}
              </p>
              {candidate.sources.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Source:{" "}
                  {candidate.sources
                    .map((source) => source.sourceLabel ?? source.sourceType)
                    .join(", ")}
                </p>
              ) : null}
            </div>
            {candidates.length > 1 ? (
              <span className="text-sm text-muted-foreground">
                {formatItemCount(candidates.length - 1)} after this
              </span>
            ) : null}
          </div>

          <form
            action={confirmPantryIntakeCandidateAction}
            className="mt-4 space-y-4"
          >
            <input
              name="groceryListItemId"
              type="hidden"
              value={candidate.groceryListItemId}
            />
            <input name="listId" type="hidden" value={listId} />
            <input name="view" type="hidden" value={view} />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.55fr)_minmax(0,0.6fr)]">
              <label className="text-sm font-medium">
                Pantry display name
                <input
                  className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                  defaultValue={candidate.displayName}
                  name="displayName"
                  required
                  type="text"
                />
              </label>
              <label className="text-sm font-medium">
                Quantity
                <input
                  className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                  defaultValue={candidate.quantity ?? ""}
                  min="0.01"
                  name="quantity"
                  step="any"
                  type="number"
                />
              </label>
              <label className="text-sm font-medium">
                Unit
                <input
                  className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                  defaultValue={candidate.unit ?? ""}
                  name="unit"
                  type="text"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-medium">
                Category
                <select
                  className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                  defaultValue={candidate.groceryCategoryId ?? ""}
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
              <label className="text-sm font-medium">
                Storage location
                <input
                  className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                  name="storageLocation"
                  type="text"
                />
              </label>
              <label className="text-sm font-medium">
                Expiration date
                <input
                  className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                  name="expirationDate"
                  type="date"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Note
              <input
                className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
                name="note"
                type="text"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
                type="submit"
              >
                Confirm and create pantry item
              </button>
            </div>
          </form>

          <form action={skipPantryIntakeCandidateAction} className="mt-3">
            <input
              name="groceryListItemId"
              type="hidden"
              value={candidate.groceryListItemId}
            />
            <input name="listId" type="hidden" value={listId} />
            <input name="view" type="hidden" value={view} />
            <button
              className="min-h-11 w-full rounded-lg border border-primary/30 px-5 py-3 text-sm font-bold text-primary hover:border-primary hover:bg-muted sm:w-auto"
              type="submit"
            >
              Skip this item
            </button>
          </form>
        </article>
      )}
    </section>
  );
}

function ViewSelector({
  listId,
  view
}: {
  listId?: string;
  view: GroceryListView;
}) {
  const options: Array<{
    href: string;
    label: string;
    view: GroceryListView;
  }> = [
    {
      href: buildGroceryListHref({ listId, view: "shopping" }),
      label: "Shopping",
      view: "shopping"
    },
    {
      href: buildGroceryListHref({ listId, view: "profile" }),
      label: "Profile",
      view: "profile"
    },
    {
      href: buildGroceryListHref({ listId, view: "meal" }),
      label: "Meal",
      view: "meal"
    }
  ];

  return (
    <nav
      aria-label="Grocery list view"
      className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-card p-2 shadow-[0_4px_20px_rgba(45,79,60,0.05)]"
    >
      {options.map((option) => {
        const isActive = option.view === view;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`min-h-12 rounded-md px-3 py-3 text-center text-sm font-medium transition ${
              isActive
                ? "bg-secondary text-primary"
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

function RecentCompletedLists({
  currentListId,
  lists
}: {
  currentListId?: string | null;
  lists: CompletedGroceryListSummary[];
}) {
  if (lists.length === 0) {
    return null;
  }

  return (
    <section className="calm-card p-5">
      <span className="sr-only" id="recent-completed-grocery-lists">
        Recent completed grocery lists
      </span>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="calm-heading text-xl">
            Recent completed grocery lists
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reopen completed lists for source context or copy a previous trip.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatItemCount(lists.length)}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {lists.map((list) => (
          <article
            className={`rounded-lg border px-3 py-3 ${
              list.id === currentListId
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
            key={list.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-primary">
                  {list.name ?? "Completed grocery list"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {list.weekStartDate
                    ? `Week of ${formatDisplayDate(list.weekStartDate)}`
                    : "No weekly plan attached"}{" "}
                  - {formatItemCount(list.itemCount)}
                </p>
                {list.completedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Completed {formatDisplayDate(list.completedAt)}
                  </p>
                ) : null}
              </div>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary/30 px-3 py-2 text-sm font-bold text-primary hover:border-primary hover:bg-muted"
                href={buildGroceryListHref({
                  listId: list.id,
                  view: "shopping"
                })}
              >
                View completed list
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ManualGroceryItemForm({
  groceryCategories,
  groceryListId,
  isHistoricalList,
  listStatus,
  mealProfiles,
  view
}: {
  groceryCategories: GroceryCategory[];
  groceryListId: string;
  isHistoricalList: boolean;
  listStatus: GroceryListStatus;
  mealProfiles: MealProfile[];
  view: GroceryListView;
}) {
  const canAddItems = !isHistoricalList && canAddManualItems(listStatus);

  return (
    <details className="calm-card p-5">
      <summary className="min-h-11 cursor-pointer list-none text-lg font-semibold">
        Add grocery item
        <span className="mt-1 block text-sm font-normal text-muted-foreground">
          Open when something extra comes up while shopping.
        </span>
      </summary>
      {!canAddItems ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {isHistoricalList
            ? "Manual items stay with the current grocery list, not completed history."
            : "Manual items are paused for this list status."}
        </p>
      ) : null}
      <form action={addManualGroceryItemAction} className="mt-4 space-y-4">
        <input name="groceryListId" type="hidden" value={groceryListId} />
        <input name="view" type="hidden" value={view} />
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.7fr)]">
          <label className="text-sm font-medium">
            Grocery item name
            <input
              className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
              name="displayName"
              required
              type="text"
            />
          </label>
          <label className="text-sm font-medium">
            Grocery item quantity
            <input
              className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
              min="0.01"
              name="quantity"
              step="any"
              type="number"
            />
          </label>
          <label className="text-sm font-medium">
            Grocery item unit
            <input
              className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
              name="unit"
              type="text"
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Grocery category
            <select
              className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
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
              className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
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
            className="mt-1 min-h-12 w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
            name="note"
            type="text"
          />
        </label>
        <button
          className="min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground md:w-auto"
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
  progressStorageKey
}: {
  groups: GroceryCategoryGroup[];
  listStatus: GroceryListStatus;
  progressStorageKey: string | null;
}) {
  return (
    <>
      {groups.map((group) => {
        const summary = buildGroceryListSummary(group.items);

        return (
          <details
            className="calm-card p-5"
            key={group.categoryName}
            open
          >
            <summary className="cursor-pointer">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="calm-heading text-xl">
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
                  progressStorageKey={progressStorageKey}
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
  progressStorageKey
}: {
  emptyMessage: string;
  groups: GroceryItemContextGroup[];
  listStatus: GroceryListStatus;
  note: string;
  progressStorageKey: string | null;
}) {
  if (groups.length === 0) {
    return (
      <p className="calm-card p-5 text-sm text-muted-foreground">
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
          className="calm-card p-5"
          key={group.groupKey}
          open
        >
          <summary className="cursor-pointer">
            <span className="calm-heading text-xl">{group.groupName}</span>
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
                progressStorageKey={progressStorageKey}
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
  progressStorageKey
}: {
  item: GroceryListItem;
  listStatus: GroceryListStatus;
  progressStorageKey: string | null;
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

        <div className="md:min-w-64">
          <GroceryItemStateControls
            canEdit={canToggleItems && Boolean(progressStorageKey)}
            initialAlreadyHave={item.alreadyHave}
            initialChecked={item.checked}
            itemId={item.id}
            storageKey={progressStorageKey ?? "mealboard:grocery-progress:missing"}
          />
        </div>
      </div>

      {item.sources.length > 0 ? (
        <details className="mt-3 rounded-lg border border-border bg-muted px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Why is this on the list?
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {item.sources.map((source) => (
              <div
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
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
        className="min-h-12 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
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

function buildGroceryListHref({
  listId,
  view
}: {
  listId?: string;
  view: GroceryListView;
}) {
  const params = new URLSearchParams();

  if (listId) {
    params.set("listId", listId);
  }

  if (view !== "shopping") {
    params.set("view", view);
  }

  const query = params.toString();
  return query ? `/grocery-list?${query}` : "/grocery-list";
}

function GroceryListMessage({ message }: { message: string }) {
  return (
    <p
      aria-live="polite"
      className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
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

function formatPantryIntakeQuantity(item: PantryIntakeCandidate) {
  if (item.preferredQuantityText) {
    return item.preferredQuantityText;
  }

  if (item.quantity === null && !item.unit) {
    return "Quantity needs review";
  }

  return [item.quantity, item.unit]
    .filter((value) => value !== null && value !== "")
    .join(" ");
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
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    ? parseDateKey(dateKey)
    : new Date(dateKey);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(date);
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}
