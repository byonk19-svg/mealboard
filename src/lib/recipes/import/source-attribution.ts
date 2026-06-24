export type RecipeSourceAttribution = {
  sourceTitle: string | null;
  sourceUrl: string | null;
};

const trackingParams = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "msclkid"
]);

export function cleanRecipeSourceAttribution({
  recipeName,
  sourceTitle,
  sourceUrl
}: {
  recipeName?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
}): RecipeSourceAttribution {
  return {
    sourceTitle: cleanSourceTitle(sourceTitle, recipeName),
    sourceUrl: cleanSourceUrl(sourceUrl)
  };
}

export function cleanSourceUrl(value: string | null | undefined) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return null;
  }

  try {
    const url = new URL(rawValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hash = "";

    for (const param of Array.from(url.searchParams.keys())) {
      const lowerParam = param.toLowerCase();
      if (lowerParam.startsWith("utm_") || trackingParams.has(lowerParam)) {
        url.searchParams.delete(param);
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function cleanSourceTitle(
  value: string | null | undefined,
  recipeName?: string | null
) {
  const title = cleanText(value);
  const normalizedRecipeName = normalizeTitle(recipeName);

  if (!title) {
    return null;
  }

  if (
    normalizedRecipeName &&
    normalizeTitle(title).includes(normalizedRecipeName)
  ) {
    return cleanText(recipeName) ?? title;
  }

  return stripSiteSuffix(title);
}

function stripSiteSuffix(title: string) {
  for (const separator of [" | ", " - ", " – ", " — "]) {
    const parts = title.split(separator).map((part) => part.trim()).filter(Boolean);

    if (parts.length > 1) {
      return parts[0] ?? title;
    }
  }

  return title;
}

function cleanText(value: string | null | undefined) {
  const text = value
    ?.replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  return text || null;
}

function normalizeTitle(value: string | null | undefined) {
  return cleanText(value)?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ?? "";
}
