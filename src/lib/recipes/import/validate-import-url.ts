export type RecipeImportUrlValidation =
  | {
      ok: true;
      url: URL;
    }
  | {
      error: string;
      ok: false;
    };

export function validateRecipeImportUrl(
  value: string
): RecipeImportUrlValidation {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return { error: "Enter a valid recipe URL.", ok: false };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Recipe URL must start with http:// or https://.", ok: false };
  }

  if (url.username || url.password) {
    return { error: "Recipe URL cannot include username or password.", ok: false };
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    return { error: "Recipe URL uses an unsupported port.", ok: false };
  }

  if (isBlockedHostname(url.hostname)) {
    return { error: "Recipe URL host is not allowed.", ok: false };
  }

  return { ok: true, url };
}

export function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized === "metadata.google.internal" ||
    isBlockedIpv4(normalized) ||
    isBlockedIpv6(normalized)
  );
}

function isBlockedIpv4(value: string) {
  const parts = value.split(".");

  if (parts.length !== 4) {
    return false;
  }

  const octets = parts.map((part) => Number(part));

  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedIpv6(value: string) {
  return (
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  );
}
