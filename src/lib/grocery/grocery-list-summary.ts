export type GroceryListSummaryItem = {
  alreadyHave: boolean;
  checked: boolean;
  needsReview: boolean;
};

export type GroceryListSummary = {
  alreadyHaveItemCount: number;
  checkedItemCount: number;
  needsReviewItemCount: number;
  remainingItemCount: number;
  totalItemCount: number;
};

export function buildGroceryListSummary(
  items: GroceryListSummaryItem[]
): GroceryListSummary {
  return {
    alreadyHaveItemCount: items.filter((item) => item.alreadyHave).length,
    checkedItemCount: items.filter((item) => item.checked).length,
    needsReviewItemCount: items.filter((item) => item.needsReview).length,
    remainingItemCount: items.filter(
      (item) => !item.checked && !item.alreadyHave
    ).length,
    totalItemCount: items.length
  };
}
