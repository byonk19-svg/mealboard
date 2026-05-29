import { describe, expect, it } from "vitest";
import type { GroceryListItem } from "./data";
import {
  groupGroceryItemsByMeal,
  groupGroceryItemsByProfile
} from "./group-grocery-list-items";

describe("group grocery list items", () => {
  it("groups items by source meal profile and allows multi-source items in multiple groups", () => {
    const tortillas = groceryItem("item-tortillas", "Tortillas", [
      source("source-1", {
        label: "Chicken tacos for Brianna dinner on 2026-06-01",
        mealProfileName: "Brianna",
        recipeName: "Chicken tacos"
      }),
      source("source-2", {
        label: "Chicken tacos for Elaine dinner on 2026-06-01",
        mealProfileName: "Elaine",
        recipeName: "Chicken tacos"
      })
    ]);
    const bananas = groceryItem("item-bananas", "Bananas", [
      source("source-3", {
        label: "Bananas for Baby snack on 2026-06-02",
        mealProfileName: "Baby",
        recipeName: null
      })
    ]);

    expect(groupGroceryItemsByProfile([tortillas, bananas])).toEqual([
      {
        groupKey: "profile:brianna",
        groupName: "Brianna",
        items: [tortillas]
      },
      {
        groupKey: "profile:elaine",
        groupName: "Elaine",
        items: [tortillas]
      },
      {
        groupKey: "profile:baby",
        groupName: "Baby",
        items: [bananas]
      }
    ]);
  });

  it("keeps the seeded shared profile before household fallback groups", () => {
    const rice = groceryItem("item-rice", "Rice", [
      source("source-1", {
        label: "Rice bowls for Shared/Family dinner on 2026-06-03",
        mealProfileName: "Shared/Family",
        recipeName: "Rice bowls"
      })
    ]);
    const napkins = groceryItem("item-napkins", "Napkins", [
      source("source-2", {
        label: "Household item",
        mealProfileName: null,
        recipeName: null
      })
    ]);

    expect(groupGroceryItemsByProfile([napkins, rice])).toEqual([
      {
        groupKey: "profile:shared-family",
        groupName: "Shared/Family",
        items: [rice]
      },
      {
        groupKey: "profile:household",
        groupName: "Household",
        items: [napkins]
      }
    ]);
  });

  it("places items without a meal profile in Household", () => {
    const paperTowels = groceryItem("item-paper-towels", "Paper towels", [
      source("source-1", {
        label: "Household item",
        mealProfileName: null,
        recipeName: null
      })
    ]);

    expect(groupGroceryItemsByProfile([paperTowels])).toEqual([
      {
        groupKey: "profile:household",
        groupName: "Household",
        items: [paperTowels]
      }
    ]);
  });

  it("keeps items without source rows visible in fallback context groups", () => {
    const salt = groceryItem("item-salt", "Salt", []);

    expect(groupGroceryItemsByProfile([salt])).toEqual([
      {
        groupKey: "profile:household",
        groupName: "Household",
        items: [salt]
      }
    ]);
    expect(groupGroceryItemsByMeal([salt])).toEqual([
      {
        groupKey: "meal:other-sources",
        groupName: "Other sources",
        items: [salt]
      }
    ]);
  });

  it("groups items by recipe or meal source context", () => {
    const tortillas = groceryItem("item-tortillas", "Tortillas", [
      source("source-1", {
        label: "Chicken tacos for Brianna dinner on 2026-06-01",
        mealProfileName: "Brianna",
        recipeName: "Chicken tacos"
      }),
      source("source-2", {
        label: "Breakfast burritos for Shared breakfast on 2026-06-02",
        mealProfileName: "Shared",
        recipeName: "Breakfast burritos"
      })
    ]);

    expect(groupGroceryItemsByMeal([tortillas])).toEqual([
      {
        groupKey: "meal:breakfast-burritos-for-shared-breakfast-on-2026-06-02",
        groupName: "Breakfast burritos for Shared breakfast on 2026-06-02",
        items: [tortillas]
      },
      {
        groupKey: "meal:chicken-tacos-for-brianna-dinner-on-2026-06-01",
        groupName: "Chicken tacos for Brianna dinner on 2026-06-01",
        items: [tortillas]
      }
    ]);
  });
});

function groceryItem(
  id: string,
  displayName: string,
  sources: GroceryListItem["sources"]
): GroceryListItem {
  return {
    alreadyHave: false,
    categoryName: "Pantry",
    categorySortOrder: 1,
    checked: false,
    displayName,
    id,
    needsReview: false,
    preferredQuantityText: null,
    quantity: 1,
    reviewReason: null,
    sortOrder: 1,
    sources,
    unit: "count"
  };
}

function source(
  id: string,
  overrides: Pick<
    GroceryListItem["sources"][number],
    "label" | "mealProfileName" | "recipeName"
  >
): GroceryListItem["sources"][number] {
  return {
    id,
    label: overrides.label,
    mealProfileName: overrides.mealProfileName,
    quantity: 1,
    recipeName: overrides.recipeName,
    sourceType: "meal_generated",
    unit: "count"
  };
}
