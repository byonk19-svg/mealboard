const appOrigin = "https://mealboard.local";

export function resolveRecipeFormReturnPath(
  value: string | null | undefined,
  fallback: string
) {
  const path = value?.trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(path, appOrigin);

    if (parsed.origin !== appOrigin) {
      return fallback;
    }

    if (parsed.pathname === "/recipes/new" || parsed.pathname === "/recipes/import") {
      return `${parsed.pathname}${parsed.search}`;
    }

    if (
      parsed.pathname === "/recipes/import/review" &&
      parsed.searchParams.has("draft")
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function buildRecipeMessagePath(path: string, message: string) {
  const parsed = new URL(path, appOrigin);
  parsed.searchParams.set("message", message);

  return `${parsed.pathname}${parsed.search}`;
}
