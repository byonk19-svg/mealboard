import type { GroceryListItem } from "./data";

export type GroceryItemContextGroup = {
  groupKey: string;
  groupName: string;
  items: GroceryListItem[];
};

const PROFILE_SORT_ORDER = new Map([
  ["Brianna", 1],
  ["Elaine", 2],
  ["Baby", 3],
  ["Shared", 4],
  ["Shared/Family", 4],
  ["Household", 5]
]);

export function groupGroceryItemsByProfile(
  items: GroceryListItem[]
): GroceryItemContextGroup[] {
  const groups = new Map<string, GroceryItemContextGroup>();

  for (const item of items) {
    const profileNames = uniqueValues(
      item.sources.length > 0
        ? item.sources.map((source) =>
            normalizeGroupName(source.mealProfileName, "Household")
          )
        : ["Household"]
    );

    for (const profileName of profileNames) {
      addItemToGroup(groups, {
        groupKey: `profile:${slugify(profileName)}`,
        groupName: profileName,
        item
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aOrder = PROFILE_SORT_ORDER.get(a.groupName) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = PROFILE_SORT_ORDER.get(b.groupName) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.groupName.localeCompare(b.groupName);
  });
}

export function groupGroceryItemsByMeal(
  items: GroceryListItem[]
): GroceryItemContextGroup[] {
  const groups = new Map<string, GroceryItemContextGroup>();

  for (const item of items) {
    const mealNames = uniqueValues(
      item.sources.length > 0
        ? item.sources.map((source) =>
            normalizeGroupName(
              source.label ?? source.recipeName ?? source.mealProfileName,
              "Other sources"
            )
          )
        : ["Other sources"]
    );

    for (const mealName of mealNames) {
      addItemToGroup(groups, {
        groupKey: `meal:${slugify(mealName)}`,
        groupName: mealName,
        item
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.groupName === "Other sources") {
      return 1;
    }

    if (b.groupName === "Other sources") {
      return -1;
    }

    return a.groupName.localeCompare(b.groupName);
  });
}

function addItemToGroup(
  groups: Map<string, GroceryItemContextGroup>,
  {
    groupKey,
    groupName,
    item
  }: {
    groupKey: string;
    groupName: string;
    item: GroceryListItem;
  }
) {
  const group = groups.get(groupKey) ?? {
    groupKey,
    groupName,
    items: []
  };

  if (!group.items.some((groupItem) => groupItem.id === item.id)) {
    group.items.push(item);
  }

  groups.set(groupKey, group);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeGroupName(value: string | null, fallback: string) {
  const name = value?.trim();
  return name && name.length > 0 ? name : fallback;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
