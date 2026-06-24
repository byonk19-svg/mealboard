self.importScripts("settings.js");

const Settings = self.MealBoardExtensionSettings;

function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

function storageSet(values) {
  return chrome.storage.local.set(values);
}

function storageRemove(keys) {
  return chrome.storage.local.remove(keys);
}

function getRuntimeErrorMessage() {
  return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
}

function setLastStatus(status) {
  return storageSet({
    [Settings.LAST_STATUS_KEY]: {
      ...status,
      updatedAt: new Date().toISOString()
    }
  });
}

async function getConfiguredMealBoardUrl() {
  const stored = await storageGet(Settings.SETTINGS_KEY);
  const settings = stored[Settings.SETTINGS_KEY] || {};
  return Settings.normalizeMealBoardUrl(settings.mealBoardUrl || Settings.DEFAULT_MEALBOARD_URL);
}

async function cleanupExpiredDrafts() {
  const now = Date.now();
  const items = await storageGet(null);
  const expiredKeys = Object.keys(items).filter(function isExpiredDraft(key) {
    const item = items[key];
    return (
      Settings.isDraftKey(key) &&
      item &&
      typeof item.expiresAt === "number" &&
      item.expiresAt <= now
    );
  });

  if (expiredKeys.length > 0) {
    await storageRemove(expiredKeys);
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab is available to capture.");
  }

  if (!tab.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error("Open a normal http or https recipe page before capturing.");
  }

  return tab;
}

async function captureTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/capture.js"]
  });

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: function runMealBoardCapture() {
      return globalThis.__mealboardCaptureActiveRecipePage();
    }
  });

  const payload = results && results[0] ? results[0].result : null;
  if (!payload || !payload.sourceUrl) {
    throw new Error("The active page did not return a capture payload.");
  }

  if (payload.blockedPage && !payload.selectedText && payload.jsonLd.length === 0 && !payload.visibleRecipe) {
    throw new Error(
      "This site is showing a browser-check page, not the recipe. Open the page normally, wait until the recipe is visible, then capture again."
    );
  }

  return payload;
}

async function captureActiveRecipeTab() {
  await cleanupExpiredDrafts();

  const mealBoardUrl = await getConfiguredMealBoardUrl();
  const tab = await getActiveTab();
  const payload = await captureTab(tab.id);
  const now = Date.now();
  const draftKey = Settings.createDraftKey(now);
  const reviewUrl = Settings.buildReviewUrl(mealBoardUrl, draftKey);

  await storageSet({
    [draftKey]: {
      version: 1,
      createdAt: now,
      expiresAt: now + Settings.DRAFT_TTL_MS,
      payload
    }
  });

  await setLastStatus({
    ok: true,
    message: "Captured page and opened MealBoard review.",
    draftKey,
    sourceUrl: payload.sourceUrl,
    reviewUrl
  });

  const openedTab = await chrome.tabs.create({ url: reviewUrl });
  return { draftKey, reviewUrl, tabId: openedTab.id };
}

chrome.runtime.onInstalled.addListener(function onInstalled() {
  cleanupExpiredDrafts().catch(function ignoreCleanupFailure() {});
});

chrome.runtime.onStartup.addListener(function onStartup() {
  cleanupExpiredDrafts().catch(function ignoreCleanupFailure() {});
});

chrome.runtime.onMessage.addListener(function onMessage(message, sender, sendResponse) {
  if (!message || message.type !== "MEALBOARD_CAPTURE_ACTIVE_TAB") {
    return false;
  }

  captureActiveRecipeTab()
    .then(function onSuccess(result) {
      sendResponse({ ok: true, result });
    })
    .catch(function onFailure(error) {
      const messageText = error && error.message ? error.message : getRuntimeErrorMessage() || "Capture failed.";
      setLastStatus({
        ok: false,
        message: messageText
      }).finally(function respond() {
        sendResponse({ ok: false, error: messageText });
      });
    });

  return true;
});
