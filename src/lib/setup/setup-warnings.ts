export type SetupWarning = {
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  title: string;
  tone: "info" | "warning";
};

export function getRecipeSetupWarning({
  approvedRecipeCount,
  totalRecipeCount
}: {
  approvedRecipeCount: number;
  totalRecipeCount: number;
}): SetupWarning | null {
  if (totalRecipeCount === 0) {
    return {
      body: "Add a few household favorites to start planning the week.",
      ctaHref: "/recipes/new",
      ctaLabel: "Add recipe",
      title: "No recipes yet",
      tone: "info"
    };
  }

  if (approvedRecipeCount === 0) {
    return {
      body: "You have recipes saved, but none are approved for planning yet. Approve a few to unlock better weekly suggestions.",
      ctaHref: "/recipes",
      ctaLabel: "Review recipes",
      title: "No approved recipes",
      tone: "warning"
    };
  }

  return null;
}

export function getBabySetupWarning({
  hasBabyProfile,
  setupWarning
}: {
  hasBabyProfile: boolean;
  setupWarning: string | null;
}): SetupWarning | null {
  if (!hasBabyProfile || !setupWarning) {
    return null;
  }

  return {
    body: "Baby age or stage is missing. Add it for better baby meal ideas.",
    ctaHref: "/settings/baby",
    ctaLabel: "Open baby settings",
    title: "Baby setup needs attention",
    tone: "info"
  };
}

export function getProtectedGroceryWarning({
  hasChanges,
  status
}: {
  hasChanges: boolean;
  status: string | null;
}): SetupWarning | null {
  if (!hasChanges || (status !== "finalized" && status !== "shopping_started")) {
    return null;
  }

  return {
    body: "This grocery list is already in progress. Review plan changes before updating it.",
    ctaHref: "/grocery-list",
    ctaLabel: "Open grocery list",
    title: "Grocery list is protected",
    tone: "warning"
  };
}
