import { describe, expect, it } from "vitest";
import { buildGroceryListSummary } from "./grocery-list-summary";

describe("buildGroceryListSummary", () => {
  it("summarizes checked, already-have, remaining, and review counts", () => {
    expect(
      buildGroceryListSummary([
        groceryItem({ checked: true }),
        groceryItem({ alreadyHave: true }),
        groceryItem({ needsReview: true }),
        groceryItem({ alreadyHave: true, checked: true })
      ])
    ).toEqual({
      alreadyHaveItemCount: 2,
      checkedItemCount: 2,
      needsReviewItemCount: 1,
      remainingItemCount: 1,
      totalItemCount: 4
    });
  });

  it("treats already-have items as not remaining even when unchecked", () => {
    expect(
      buildGroceryListSummary([
        groceryItem({ alreadyHave: true, checked: false }),
        groceryItem({ alreadyHave: false, checked: false })
      ]).remainingItemCount
    ).toBe(1);
  });

  it("handles an empty grocery list", () => {
    expect(buildGroceryListSummary([])).toEqual({
      alreadyHaveItemCount: 0,
      checkedItemCount: 0,
      needsReviewItemCount: 0,
      remainingItemCount: 0,
      totalItemCount: 0
    });
  });
});

function groceryItem({
  alreadyHave = false,
  checked = false,
  needsReview = false
}: {
  alreadyHave?: boolean;
  checked?: boolean;
  needsReview?: boolean;
}) {
  return {
    alreadyHave,
    checked,
    needsReview
  };
}
