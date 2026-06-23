import type { GroceryListItem } from "./data";

export function buildGroceryListCopyText({
  items,
  title,
  weekStartDate
}: {
  items: GroceryListItem[];
  title: string;
  weekStartDate: string | null;
}) {
  const lines = [title];

  if (weekStartDate) {
    lines.push(`Week of ${formatCopyDate(weekStartDate)}`);
  }

  if (items.length === 0) {
    lines.push("", "No grocery items.");
    return lines.join("\n");
  }

  for (const group of groupItemsForCopy(items)) {
    lines.push("", group.categoryName);

    for (const item of group.items) {
      lines.push(`- ${formatCopyItem(item)}`);
    }
  }

  return lines.join("\n");
}

function groupItemsForCopy(items: GroceryListItem[]) {
  const groupsByCategory = new Map<
    string,
    {
      categoryName: string;
      categorySortOrder: number;
      items: GroceryListItem[];
    }
  >();

  for (const item of items) {
    const categoryName = item.categoryName ?? "Needs category";
    const group = groupsByCategory.get(categoryName) ?? {
      categoryName,
      categorySortOrder:
        item.categoryName === null
          ? Number.MAX_SAFE_INTEGER
          : item.categorySortOrder ?? Number.MAX_SAFE_INTEGER,
      items: []
    };
    group.items.push(item);
    groupsByCategory.set(categoryName, group);
  }

  return Array.from(groupsByCategory.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return a.displayName.localeCompare(b.displayName);
      })
    }))
    .sort((a, b) => {
      if (a.categorySortOrder !== b.categorySortOrder) {
        return a.categorySortOrder - b.categorySortOrder;
      }

      return a.categoryName.localeCompare(b.categoryName);
    });
}

function formatCopyItem(item: GroceryListItem) {
  const quantity = formatCopyQuantity(item);
  const status = formatCopyStatus(item);

  return [quantity, item.displayName, status]
    .filter(Boolean)
    .join(" ");
}

function formatCopyQuantity(item: GroceryListItem) {
  if (item.preferredQuantityText) {
    return item.preferredQuantityText;
  }

  if (item.quantity === null && !item.unit) {
    return "";
  }

  return [item.quantity, item.unit]
    .filter((value) => value !== null && value !== "")
    .join(" ");
}

function formatCopyStatus(item: GroceryListItem) {
  if (item.needsReview) {
    return item.reviewReason
      ? `(needs review: ${item.reviewReason})`
      : "(needs review)";
  }

  if (item.alreadyHave) {
    return "(already have)";
  }

  if (item.checked) {
    return "(checked)";
  }

  return "";
}

function formatCopyDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}
