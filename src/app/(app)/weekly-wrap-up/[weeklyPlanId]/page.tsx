import Link from "next/link";
import {
  acknowledgeUnusedGroceryItem,
  dismissWeeklyWrapUp,
  saveRecipeWrapUpReview
} from "@/app/(app)/weekly-wrap-up/actions";
import { formatMealType } from "@/lib/recipes/types";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";
import {
  getOrCreateWeeklyWrapUp,
  type WeeklyWrapUpItem
} from "@/lib/weekly-wrap-up/data";

type WeeklyWrapUpPageProps = {
  params: Promise<{
    weeklyPlanId: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function WeeklyWrapUpPage({
  params,
  searchParams
}: WeeklyWrapUpPageProps) {
  const householdContext = await getCurrentHouseholdContext();
  const { weeklyPlanId } = await params;
  const { message } = await searchParams;

  if (!householdContext.household) {
    return null;
  }

  const wrapUp = await getOrCreateWeeklyWrapUp({
    householdId: householdContext.household.id,
    weeklyPlanId
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Weekly Wrap-Up
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          Review what needs attention
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Optional feedback from completed shopping and meals. This keeps future
          suggestions practical without turning wrap-up into homework.
        </p>
      </div>

      {message ? <WrapUpMessage message={message} /> : null}

      {!wrapUp.eligible ? (
        <NotEligibleState reason={wrapUp.reason} />
      ) : wrapUp.status === "dismissed" ? (
        <ClosedState message="This weekly wrap-up was dismissed." />
      ) : wrapUp.status === "completed" || wrapUp.pendingItemCount === 0 ? (
        <ClosedState message="Nothing needs attention for this wrap-up." />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {wrapUp.pendingItemCount} pending{" "}
              {wrapUp.pendingItemCount === 1 ? "item" : "items"}.
            </p>
            <form action={dismissWeeklyWrapUp}>
              <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
              <input name="wrapUpId" type="hidden" value={wrapUp.wrapUpId} />
              <button
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                type="submit"
              >
                Dismiss wrap-up
              </button>
            </form>
          </div>

          <RecipeReviewSection
            items={wrapUp.items.filter(
              (item) =>
                item.promptType === "recipe_review" &&
                item.status === "pending"
            )}
            weeklyPlanId={weeklyPlanId}
            wrapUpId={wrapUp.wrapUpId}
          />

          <UnusedGrocerySection
            items={wrapUp.items.filter(
              (item) =>
                item.promptType === "unused_grocery_item" &&
                item.status === "pending"
            )}
            weeklyPlanId={weeklyPlanId}
            wrapUpId={wrapUp.wrapUpId}
          />
        </>
      )}
    </section>
  );
}

function RecipeReviewSection({
  items,
  weeklyPlanId,
  wrapUpId
}: {
  items: WeeklyWrapUpItem[];
  weeklyPlanId: string;
  wrapUpId: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Made, skipped, and leftovers</h2>
      {items.map((item) => (
        <article
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
          key={item.id}
        >
          <h3 className="text-lg font-semibold">{item.displayName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {[item.mealProfileName, item.mealType ? formatMealType(item.mealType) : null, item.planDate]
              .filter(Boolean)
              .join(" / ")}
          </p>
          <form action={saveRecipeWrapUpReview} className="mt-4 grid gap-3">
            <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
            <input name="wrapUpId" type="hidden" value={wrapUpId} />
            <input name="wrapUpItemId" type="hidden" value={item.id} />
            <input
              name="weeklyPlanItemId"
              type="hidden"
              value={item.weeklyPlanItemId ?? ""}
            />
            <input name="recipeId" type="hidden" value={item.recipeId ?? ""} />
            <input
              name="mealProfileId"
              type="hidden"
              value={item.mealProfileId ?? ""}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-medium">
                Outcome
                <select
                  className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
                  name="outcome"
                >
                  <option value="made">Made</option>
                  <option value="skipped">Skipped</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Profile status
                <select
                  className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
                  name="profileStatus"
                >
                  <option value="tried">Tried</option>
                  <option value="approved">Approved</option>
                  <option value="favorite">Favorite</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Rating
                <select
                  className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
                  name="rating"
                >
                  <option value="">No rating</option>
                  <option value="love">Love</option>
                  <option value="like">Like</option>
                  <option value="okay">Okay</option>
                  <option value="dislike">Dislike</option>
                  <option value="hard_no">Hard no</option>
                </select>
              </label>
            </div>
            <label className="text-sm font-medium">
              Notes
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
                name="notes"
                placeholder="What should change next time?"
                type="text"
              />
            </label>
            <label className="text-sm font-medium">
              Leftovers
              <select
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
                name="leftovers"
              >
                <option value="none">No leftovers</option>
                <option value="some">Some leftovers</option>
                <option value="too_much">Too much leftover</option>
                <option value="used_leftovers">Used leftovers instead</option>
              </select>
            </label>
            <button
              className="min-h-11 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-fit"
              type="submit"
            >
              Save feedback
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}

function UnusedGrocerySection({
  items,
  weeklyPlanId,
  wrapUpId
}: {
  items: WeeklyWrapUpItem[];
  weeklyPlanId: string;
  wrapUpId: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Unused groceries and staples</h2>
      {items.map((item) => (
        <article
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
          key={item.id}
        >
          <h3 className="text-lg font-semibold">{item.displayName}</h3>
          {item.sourceKinds.length > 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Source context: {formatSourceKinds(item.sourceKinds)}
            </p>
          ) : null}
          {item.actionHref && item.actionLabel ? (
            <Link
              className="mt-3 inline-flex w-fit rounded-md border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
              href={item.actionHref}
            >
              {item.actionLabel}
            </Link>
          ) : null}
          <form action={acknowledgeUnusedGroceryItem} className="mt-4 grid gap-3">
            <input name="weeklyPlanId" type="hidden" value={weeklyPlanId} />
            <input name="wrapUpId" type="hidden" value={wrapUpId} />
            <input name="wrapUpItemId" type="hidden" value={item.id} />
            <label className="text-sm font-medium">
              Future adjustment
              <select
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
                name="resolution"
              >
                <option value="acknowledged">Keep as-is</option>
                <option value="use_later">Use later this week</option>
                <option value="reduce_future_amount">Review staple amount</option>
                <option value="pause_future_buy">
                  Review whether to pause this staple
                </option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Note
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
                name="notes"
                placeholder="Optional staple or quantity note"
                type="text"
              />
            </label>
            <button
              className="min-h-11 w-full rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted sm:w-fit"
              type="submit"
            >
              Noted
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}

function formatSourceKinds(sourceKinds: string[]) {
  const labels: Record<string, string> = {
    baby: "Baby item",
    manual: "Manual add-on",
    meal: "Planned meal",
    staple: "Staple"
  };

  return sourceKinds.map((kind) => labels[kind] ?? kind).join(", ");
}

function NotEligibleState({ reason }: { reason: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Wrap-up is not ready</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{reason}</p>
      <Link
        className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        href="/grocery-list"
      >
        Open grocery list
      </Link>
    </section>
  );
}

function ClosedState({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Wrap-up closed</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      <Link
        className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        href="/dashboard"
      >
        Back to dashboard
      </Link>
    </section>
  );
}

function WrapUpMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
