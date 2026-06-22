import type { MealType, RecipeStatus } from "@/lib/recipes/types";

export type WrapUpPlanItem = {
  displayName: string;
  isTryThis: boolean;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: MealType;
  planDate: string;
  recipeId: string | null;
  recipeName: string | null;
  recipeStatus: RecipeStatus | null;
  weeklyPlanItemId: string;
};

export type WrapUpGroceryItem = {
  alreadyHave: boolean;
  checked: boolean;
  displayName: string;
  groceryListItemId: string;
  manualItem: boolean;
  sources: WrapUpGroceryItemSource[];
};

export type WrapUpGroceryItemSource = {
  label: string | null;
  mealProfileName: string | null;
  notes: string | null;
  quantity: number | null;
  recipeName: string | null;
  sourceId: string | null;
  sourceType: string;
  unit: string | null;
};

export type RecipeReviewWrapUpCandidate = {
  displayName: string;
  mealProfileId: string | null;
  mealProfileName: string | null;
  mealType: MealType;
  planDate: string;
  promptType: "recipe_review";
  recipeId: string;
  recipeName: string;
  weeklyPlanItemId: string;
};

export type UnusedGroceryWrapUpCandidate = {
  actionHref: string | null;
  actionLabel: string | null;
  classification: UnusedGroceryClassification;
  displayName: string;
  groceryListItemId: string;
  promptType: "unused_grocery_item";
  sourceKinds: UnusedGrocerySourceKind[];
  sources: WrapUpGroceryItemSource[];
};

export type WeeklyWrapUpCandidates = {
  recipeReviewCandidates: RecipeReviewWrapUpCandidate[];
  unusedGroceryCandidates: UnusedGroceryWrapUpCandidate[];
};

export type UnusedGrocerySourceKind = "baby" | "manual" | "meal" | "staple";
export type UnusedGroceryClassification =
  | "baby"
  | "manual"
  | "meal"
  | "mixed"
  | "staple"
  | null;

export function buildWeeklyWrapUpCandidates({
  existingReviewedPlanItemIds,
  groceryItems,
  planItems
}: {
  existingReviewedPlanItemIds: Set<string>;
  groceryItems: WrapUpGroceryItem[];
  planItems: WrapUpPlanItem[];
}): WeeklyWrapUpCandidates {
  return {
    recipeReviewCandidates: planItems
      .filter((item) => item.recipeId)
      .filter((item) => !existingReviewedPlanItemIds.has(item.weeklyPlanItemId))
      .map((item) => ({
        displayName: item.displayName,
        mealProfileId: item.mealProfileId,
        mealProfileName: item.mealProfileName,
        mealType: item.mealType,
        planDate: item.planDate,
        promptType: "recipe_review",
        recipeId: item.recipeId ?? "",
        recipeName: item.recipeName ?? item.displayName,
        weeklyPlanItemId: item.weeklyPlanItemId
      })),
    unusedGroceryCandidates: groceryItems
      .filter((item) => !item.checked && !item.alreadyHave)
      .map(toUnusedGroceryCandidate)
  };
}

export function toUnusedGroceryCandidate(
  item: WrapUpGroceryItem
): UnusedGroceryWrapUpCandidate {
  const sourceKinds = resolveSourceKinds(item);
  const classification = resolveClassification(sourceKinds);
  const action = resolveUnusedGroceryAction(classification);

  return {
    actionHref: action.href,
    actionLabel: action.label,
    classification,
    displayName: item.displayName,
    groceryListItemId: item.groceryListItemId,
    promptType: "unused_grocery_item",
    sourceKinds,
    sources: item.sources
  };
}

function resolveSourceKinds(
  item: WrapUpGroceryItem
): UnusedGrocerySourceKind[] {
  const kinds = new Set<UnusedGrocerySourceKind>();

  for (const source of item.sources) {
    const kind = resolveSourceKind(source.sourceType);

    if (kind) {
      kinds.add(kind);
    }
  }

  if (item.manualItem) {
    kinds.add("manual");
  }

  const orderedKinds: UnusedGrocerySourceKind[] = [
    "meal",
    "baby",
    "staple",
    "manual"
  ];

  return orderedKinds.filter((kind) =>
    kinds.has(kind)
  );
}

function resolveSourceKind(sourceType: string): UnusedGrocerySourceKind | null {
  if (sourceType === "meal_generated") {
    return "meal";
  }

  if (sourceType === "baby_item") {
    return "baby";
  }

  if (sourceType === "staple") {
    return "staple";
  }

  if (sourceType === "manual_add") {
    return "manual";
  }

  return null;
}

function resolveClassification(
  sourceKinds: UnusedGrocerySourceKind[]
): UnusedGroceryClassification {
  if (sourceKinds.length === 0) {
    return null;
  }

  if (sourceKinds.length > 1) {
    return "mixed";
  }

  return sourceKinds[0] ?? null;
}

function resolveUnusedGroceryAction(
  classification: UnusedGroceryClassification
): { href: string | null; label: string | null } {
  if (classification === "staple") {
    return { href: "/settings/staples", label: "Review staples" };
  }

  if (classification === "baby") {
    return { href: "/settings/baby", label: "Review Baby foods" };
  }

  if (classification === "manual") {
    return { href: "/grocery-list", label: "Review grocery list" };
  }

  if (classification === "meal") {
    return { href: "/plan-week", label: "Review plan" };
  }

  return { href: null, label: null };
}
