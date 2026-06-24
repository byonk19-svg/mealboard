import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { extractJsonLdRecipeCandidates } from "@/lib/recipes/import/extract-json-ld-recipes";
import { normalizeRecipeImportDraft } from "@/lib/recipes/import/normalize-recipe-import";
import {
  isBlockedHostname,
  validateRecipeImportUrl
} from "@/lib/recipes/import/validate-import-url";
import { getFoods } from "@/lib/settings/data";
import { getCurrentHouseholdContext } from "@/lib/supabase/household";

export const runtime = "nodejs";

const maxRedirects = 3;
const maxResponseBytes = 2_000_000;
const requestTimeoutMs = 8_000;

export async function POST(request: Request) {
  const householdContext = await getCurrentHouseholdContext();

  if (!householdContext.household) {
    return NextResponse.json({ error: "Sign in before importing recipes." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const validation = validateRecipeImportUrl(body?.url ?? "");

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const fetched = await fetchRecipeHtml(validation.url);

  if (!fetched.ok) {
    return NextResponse.json({ error: fetched.error }, { status: 400 });
  }

  const candidates = extractJsonLdRecipeCandidates(fetched.html);
  const candidate = candidates[0];

  if (!candidate) {
    return NextResponse.json(
      {
        error:
          "MealBoard did not find structured recipe data on that page. Try the Chrome capture extension or manual entry."
      },
      { status: 422 }
    );
  }

  const foods = await getFoods(householdContext.household.id);
  const draft = normalizeRecipeImportDraft({
    candidate,
    foods,
    sourceTitle: fetched.title,
    sourceUrl: fetched.finalUrl
  });

  return NextResponse.json({ draft });
}

async function fetchRecipeHtml(startUrl: URL): Promise<
  | {
      finalUrl: string;
      html: string;
      ok: true;
      title: string | null;
    }
  | {
      error: string;
      ok: false;
    }
> {
  let currentUrl = startUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const hostValidation = validateRecipeImportUrl(currentUrl.toString());
    if (!hostValidation.ok) {
      return { error: hostValidation.error, ok: false };
    }

    const resolved = await validateResolvedHost(currentUrl.hostname);
    if (!resolved.ok) {
      return resolved;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          accept: "text/html,application/ld+json;q=0.9"
        },
        redirect: "manual",
        signal: controller.signal
      });

      if (isRedirect(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return { error: "Recipe page redirected without a target.", ok: false };
        }

        if (redirectCount >= maxRedirects) {
          return { error: "Recipe page redirected too many times.", ok: false };
        }

        currentUrl = new URL(location, currentUrl);
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        return {
          error:
            "This recipe site blocked URL import. Open the recipe in Chrome, wait until the recipe is visible, then use the MealBoard capture extension.",
          ok: false
        };
      }

      if (!response.ok) {
        return { error: "MealBoard could not load that recipe page.", ok: false };
      }

      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      if (
        contentType &&
        !contentType.includes("text/html") &&
        !contentType.includes("application/ld+json") &&
        !contentType.includes("application/json")
      ) {
        return { error: "Recipe URL did not return a readable recipe page.", ok: false };
      }

      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > maxResponseBytes) {
        return { error: "Recipe page is too large to import safely.", ok: false };
      }

      const textResult = await readResponseTextWithLimit(response, maxResponseBytes);
      if (!textResult.ok) {
        return textResult;
      }

      return {
        finalUrl: currentUrl.toString(),
        html: textResult.text,
        ok: true,
        title: extractTitle(textResult.text)
      };
    } catch {
      return { error: "MealBoard could not load that recipe page.", ok: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { error: "Recipe page redirected too many times.", ok: false };
}

async function readResponseTextWithLimit(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();

  if (!reader) {
    const text = await response.text();
    return text.length > maxBytes
      ? ({ error: "Recipe page is too large to import safely.", ok: false } as const)
      : ({ ok: true, text } as const);
  }

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let byteCount = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    byteCount += value.byteLength;
    if (byteCount > maxBytes) {
      await reader.cancel();
      return { error: "Recipe page is too large to import safely.", ok: false } as const;
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());

  return { ok: true, text: chunks.join("") } as const;
}

async function validateResolvedHost(hostname: string) {
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (
      addresses.length === 0 ||
      addresses.some((address) => isBlockedHostname(address.address))
    ) {
      return { error: "Recipe URL host is not allowed.", ok: false } as const;
    }
  } catch {
    return { error: "MealBoard could not resolve that recipe URL.", ok: false } as const;
  }

  return { ok: true } as const;
}

function isRedirect(status: number) {
  return status >= 300 && status < 400;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}
