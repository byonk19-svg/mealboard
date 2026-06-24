(function installMealBoardCapture(globalScope) {
  "use strict";

  const MAX_JSON_LD_SCRIPTS = 20;
  const MAX_JSON_LD_CHARS = 160000;
  const MAX_SELECTED_TEXT_CHARS = 12000;
  const MAX_TITLE_CHARS = 300;
  const MAX_URL_CHARS = 4096;

  function trimToLimit(value, limit) {
    const text = String(value || "").trim();
    if (text.length <= limit) {
      return text;
    }
    return text.slice(0, limit);
  }

  function collectJsonLdScripts() {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    let remainingChars = MAX_JSON_LD_CHARS;
    const jsonLd = [];

    for (const script of scripts.slice(0, MAX_JSON_LD_SCRIPTS)) {
      if (remainingChars <= 0) {
        break;
      }

      const text = trimToLimit(script.textContent || "", remainingChars);
      if (!text) {
        continue;
      }

      jsonLd.push(text);
      remainingChars -= text.length;
    }

    return jsonLd;
  }

  function collectSelectedText() {
    const selection = globalScope.getSelection ? globalScope.getSelection() : null;
    return trimToLimit(selection ? selection.toString() : "", MAX_SELECTED_TEXT_CHARS);
  }

  globalScope.__mealboardCaptureActiveRecipePage = function captureActiveRecipePage() {
    return {
      version: 1,
      sourceUrl: trimToLimit(globalScope.location.href, MAX_URL_CHARS),
      sourceTitle: trimToLimit(document.title, MAX_TITLE_CHARS),
      jsonLd: collectJsonLdScripts(),
      selectedText: collectSelectedText(),
      capturedAt: new Date().toISOString()
    };
  };
})(globalThis);
