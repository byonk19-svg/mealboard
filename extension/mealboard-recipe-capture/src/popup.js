(function initializePopup(globalScope) {
  "use strict";

  const Settings = globalScope.MealBoardExtensionSettings;
  const mealBoardUrlInput = document.getElementById("mealboard-url");
  const saveUrlButton = document.getElementById("save-url");
  const captureButton = document.getElementById("capture-page");
  const openImportButton = document.getElementById("open-import");
  const statusNode = document.getElementById("status");

  function setStatus(message, state) {
    statusNode.textContent = message || "";
    if (state) {
      statusNode.dataset.state = state;
    } else {
      delete statusNode.dataset.state;
    }
  }

  function setBusy(isBusy) {
    saveUrlButton.disabled = isBusy;
    captureButton.disabled = isBusy;
    openImportButton.disabled = isBusy;
  }

  function getStored(keys) {
    return chrome.storage.local.get(keys);
  }

  function setStored(values) {
    return chrome.storage.local.set(values);
  }

  async function loadSettings() {
    const stored = await getStored([Settings.SETTINGS_KEY, Settings.LAST_STATUS_KEY]);
    const settings = stored[Settings.SETTINGS_KEY] || {};
    mealBoardUrlInput.value = settings.mealBoardUrl || Settings.DEFAULT_MEALBOARD_URL;

    const lastStatus = stored[Settings.LAST_STATUS_KEY];
    if (lastStatus && lastStatus.message) {
      setStatus(lastStatus.message, lastStatus.ok ? "success" : "error");
    }
  }

  async function saveSettings() {
    const mealBoardUrl = Settings.normalizeMealBoardUrl(mealBoardUrlInput.value);
    await setStored({
      [Settings.SETTINGS_KEY]: { mealBoardUrl }
    });
    mealBoardUrlInput.value = mealBoardUrl;
    setStatus("MealBoard URL saved.", "success");
  }

  async function openImportPage() {
    const mealBoardUrl = Settings.normalizeMealBoardUrl(mealBoardUrlInput.value);
    const importUrl = new URL("/recipes/import", mealBoardUrl + "/");
    await chrome.tabs.create({ url: importUrl.toString() });
  }

  async function captureActiveTab() {
    await saveSettings();
    setBusy(true);
    setStatus("Capturing active tab...", "");

    chrome.runtime.sendMessage({ type: "MEALBOARD_CAPTURE_ACTIVE_TAB" }, function onResponse(response) {
      setBusy(false);

      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message, "error");
        return;
      }

      if (!response || !response.ok) {
        setStatus(response && response.error ? response.error : "Capture failed.", "error");
        return;
      }

      setStatus("Captured page and opened MealBoard review.", "success");
    });
  }

  saveUrlButton.addEventListener("click", function onSaveClick() {
    saveSettings().catch(function onError(error) {
      setStatus(error.message || "Could not save MealBoard URL.", "error");
    });
  });

  openImportButton.addEventListener("click", function onOpenImportClick() {
    openImportPage().catch(function onError(error) {
      setStatus(error.message || "Could not open MealBoard.", "error");
    });
  });

  captureButton.addEventListener("click", function onCaptureClick() {
    captureActiveTab().catch(function onError(error) {
      setBusy(false);
      setStatus(error.message || "Capture failed.", "error");
    });
  });

  loadSettings().catch(function onError(error) {
    setStatus(error.message || "Could not load extension settings.", "error");
  });
})(globalThis);
