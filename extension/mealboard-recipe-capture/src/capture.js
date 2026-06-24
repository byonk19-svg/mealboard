(function installMealBoardCapture(globalScope) {
  "use strict";

  const MAX_JSON_LD_SCRIPTS = 20;
  const MAX_JSON_LD_CHARS = 160000;
  const MAX_SELECTED_TEXT_CHARS = 12000;
  const MAX_VISIBLE_RECIPE_TEXT_CHARS = 18000;
  const MAX_VISIBLE_ITEMS = 80;
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

  function collectVisibleRecipe() {
    const root = findRecipeRoot();

    if (!root) {
      return null;
    }

    const title = firstText([
      root.querySelector(".wprm-recipe-name"),
      root.querySelector(".tasty-recipes-title"),
      root.querySelector('[class*="recipe-title" i]'),
      document.querySelector("h1")
    ]);
    const ingredients = collectListText(root, [
      ".wprm-recipe-ingredient",
      ".tasty-recipes-ingredients li",
      ".mv-create-ingredients li",
      '[class*="ingredient" i] li',
      '[class*="ingredient" i]'
    ]);
    const instructions = collectListText(root, [
      ".wprm-recipe-instruction",
      ".tasty-recipes-instructions li",
      ".mv-create-instructions li",
      '[class*="instruction" i] li',
      '[class*="direction" i] li',
      '[class*="method" i] li',
      '[class*="instruction" i]',
      '[class*="direction" i]'
    ]);
    const rootText = normalizeText(root.innerText || root.textContent || "");

    if (ingredients.length === 0 && instructions.length === 0) {
      return null;
    }

    return {
      title: trimToLimit(title, MAX_TITLE_CHARS),
      ingredients,
      instructions,
      servingsText:
        firstText([
          root.querySelector(".wprm-recipe-servings"),
          root.querySelector('[class*="serving" i]'),
          root.querySelector('[class*="yield" i]')
        ]) ||
        extractLabeledText(rootText, /(?:servings?|yield)\s*:?\s*([^\n.]{1,80})/i),
      prepTimeText:
        firstText([
          root.querySelector('[class*="prep_time" i]'),
          root.querySelector('[class*="prep-time" i]'),
          root.querySelector('[class*="prep" i]')
        ]) ||
        extractLabeledText(rootText, /prep(?:aration)?\s*time\s*:?\s*([^\n.]{1,80})/i),
      cookTimeText:
        firstText([
          root.querySelector('[class*="cook_time" i]'),
          root.querySelector('[class*="cook-time" i]'),
          root.querySelector('[class*="cook" i]')
        ]) ||
        extractLabeledText(rootText, /cook\s*time\s*:?\s*([^\n.]{1,80})/i)
    };
  }

  function findRecipeRoot() {
    const selectors = [
      '[itemtype*="Recipe" i]',
      ".wprm-recipe",
      ".tasty-recipes",
      ".mv-create-card",
      ".recipe-card",
      '[class*="recipe-card" i]',
      '[class*="recipe" i]'
    ];

    let best = null;
    let bestScore = 0;

    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        const text = normalizeText(element.innerText || element.textContent || "");
        const lowerText = text.toLowerCase();
        let score = 0;

        if (lowerText.includes("ingredient")) {
          score += 3;
        }

        if (lowerText.includes("instruction") || lowerText.includes("direction")) {
          score += 3;
        }

        score += Math.min(4, collectListText(element, ['[class*="ingredient" i] li']).length);
        score += Math.min(4, collectListText(element, ['[class*="instruction" i] li', '[class*="direction" i] li']).length);

        if (score > bestScore) {
          best = element;
          bestScore = score;
        }
      }
    }

    return bestScore >= 3 ? best : null;
  }

  function collectListText(root, selectors) {
    const values = [];
    const seen = new Set();
    let remainingChars = MAX_VISIBLE_RECIPE_TEXT_CHARS;

    for (const selector of selectors) {
      for (const element of Array.from(root.querySelectorAll(selector))) {
        if (values.length >= MAX_VISIBLE_ITEMS || remainingChars <= 0) {
          return values;
        }

        const text = normalizeText(element.innerText || element.textContent || "");
        if (!text || seen.has(text) || text.length < 2) {
          continue;
        }

        const clipped = trimToLimit(text, remainingChars);
        values.push(clipped);
        seen.add(text);
        remainingChars -= clipped.length;
      }

      if (values.length > 0) {
        return values;
      }
    }

    return values;
  }

  function firstText(elements) {
    for (const element of elements) {
      const text = normalizeText(element ? element.innerText || element.textContent || "" : "");
      if (text) {
        return text;
      }
    }

    return "";
  }

  function extractLabeledText(text, pattern) {
    const match = text.match(pattern);
    return trimToLimit(match && match[1] ? match[1] : "", 100);
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectBlockedPage() {
    const title = normalizeText(document.title).toLowerCase();
    const bodyText = normalizeText(document.body ? document.body.innerText : "").toLowerCase();
    const blockedPatterns = [
      "just a moment",
      "checking your browser",
      "enable javascript and cookies",
      "attention required",
      "verify you are human",
      "cloudflare"
    ];

    return blockedPatterns.some(function matchesBlockedPattern(pattern) {
      return title.includes(pattern) || bodyText.includes(pattern);
    });
  }

  globalScope.__mealboardCaptureActiveRecipePage = function captureActiveRecipePage() {
    return {
      version: 1,
      sourceUrl: trimToLimit(globalScope.location.href, MAX_URL_CHARS),
      sourceTitle: trimToLimit(document.title, MAX_TITLE_CHARS),
      jsonLd: collectJsonLdScripts(),
      visibleRecipe: collectVisibleRecipe(),
      selectedText: collectSelectedText(),
      blockedPage: detectBlockedPage(),
      capturedAt: new Date().toISOString()
    };
  };
})(globalThis);
