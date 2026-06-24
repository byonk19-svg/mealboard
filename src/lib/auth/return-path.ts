export function resolveLoginReturnPath(value: string | null | undefined) {
  const fallback = "/dashboard";
  const path = value?.trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(path, "https://mealboard.local");

    if (parsed.origin !== "https://mealboard.local") {
      return fallback;
    }

    if (parsed.pathname === "/login" || parsed.pathname.startsWith("/login/")) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}
