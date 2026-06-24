(function bridgeMealBoardRecipeDraft(globalScope) {
  "use strict";

  const DRAFT_PREFIX = "mealboard-recipe-draft:";
  const MESSAGE_SOURCE = "mealboard-recipe-capture-extension";
  const DRAFT_MESSAGE_TYPE = "MEALBOARD_RECIPE_CAPTURE_DRAFT";
  const ACK_MESSAGE_TYPE = "MEALBOARD_RECIPE_CAPTURE_DRAFT_RECEIVED";
  const MAX_POST_ATTEMPTS = 20;
  const POST_INTERVAL_MS = 1000;

  function getDraftKeyFromUrl() {
    const url = new URL(globalScope.location.href);
    const draftKey = url.searchParams.get("draft");
    const source = url.searchParams.get("source");

    if (
      source !== "extension" ||
      !draftKey ||
      draftKey.indexOf(DRAFT_PREFIX) !== 0 ||
      !url.pathname.endsWith("/recipes/import/review")
    ) {
      return "";
    }

    return draftKey;
  }

  function postDraft(draftKey, storedDraft) {
    globalScope.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: DRAFT_MESSAGE_TYPE,
        draftKey,
        payload: storedDraft.payload,
        createdAt: storedDraft.createdAt,
        expiresAt: storedDraft.expiresAt
      },
      globalScope.location.origin
    );
  }

  const draftKey = getDraftKeyFromUrl();
  if (!draftKey || !chrome.storage || !chrome.storage.local) {
    return;
  }

  chrome.storage.local.get([draftKey], function onDraftLoaded(items) {
    const storedDraft = items[draftKey];
    if (!storedDraft || !storedDraft.payload) {
      return;
    }

    let attempts = 0;
    const intervalId = globalScope.setInterval(function postUntilReceived() {
      attempts += 1;
      postDraft(draftKey, storedDraft);

      if (attempts >= MAX_POST_ATTEMPTS) {
        globalScope.clearInterval(intervalId);
      }
    }, POST_INTERVAL_MS);

    postDraft(draftKey, storedDraft);

    globalScope.addEventListener("message", function onPageMessage(event) {
      if (event.source !== globalScope || event.origin !== globalScope.location.origin) {
        return;
      }

      const data = event.data || {};
      if (
        data.source !== "mealboard-app" ||
        data.type !== ACK_MESSAGE_TYPE ||
        data.draftKey !== draftKey
      ) {
        return;
      }

      globalScope.clearInterval(intervalId);
      chrome.storage.local.remove([draftKey]);
      globalScope.removeEventListener("message", onPageMessage);
    });
  });
})(globalThis);
