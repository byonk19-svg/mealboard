(function initializeMealBoardExtensionSettings(globalScope) {
  "use strict";

  const DEFAULT_MEALBOARD_URL = "http://localhost:3000";
  const SETTINGS_KEY = "mealboardRecipeCaptureSettings";
  const LAST_STATUS_KEY = "mealboardRecipeCaptureLastStatus";
  const DRAFT_PREFIX = "mealboard-recipe-draft:";
  const DRAFT_TTL_MS = 60 * 60 * 1000;
  const REVIEW_PATH = "/recipes/import/review";

  const ALLOWED_MEALBOARD_ORIGINS = [
    "http://localhost",
    "http://127.0.0.1"
  ];

  function normalizeMealBoardUrl(value) {
    const rawValue = String(value || "").trim();
    const url = new URL(rawValue || DEFAULT_MEALBOARD_URL);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("MealBoard URL must use http or https.");
    }

    const allowed = ALLOWED_MEALBOARD_ORIGINS.some(function originAllowed(origin) {
      return url.origin === origin || url.origin.startsWith(origin + ":");
    });

    if (!allowed) {
      throw new Error(
        "This extension is currently permitted only for configured MealBoard dev origins."
      );
    }

    url.hash = "";
    url.search = "";
    url.pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");

    return url.toString().replace(/\/+$/, "");
  }

  function buildReviewUrl(baseUrl, draftKey) {
    const normalizedBaseUrl = normalizeMealBoardUrl(baseUrl);
    const reviewUrl = new URL(REVIEW_PATH, normalizedBaseUrl + "/");
    reviewUrl.searchParams.set("source", "extension");
    reviewUrl.searchParams.set("draft", draftKey);
    return reviewUrl.toString();
  }

  function createDraftKey(now) {
    const bytes = new Uint8Array(12);
    globalScope.crypto.getRandomValues(bytes);
    const token = Array.from(bytes, function toHex(byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
    return DRAFT_PREFIX + String(now || Date.now()) + ":" + token;
  }

  function isDraftKey(value) {
    return typeof value === "string" && value.indexOf(DRAFT_PREFIX) === 0;
  }

  globalScope.MealBoardExtensionSettings = {
    ALLOWED_MEALBOARD_ORIGINS,
    DEFAULT_MEALBOARD_URL,
    DRAFT_PREFIX,
    DRAFT_TTL_MS,
    LAST_STATUS_KEY,
    REVIEW_PATH,
    SETTINGS_KEY,
    buildReviewUrl,
    createDraftKey,
    isDraftKey,
    normalizeMealBoardUrl
  };
})(globalThis);
