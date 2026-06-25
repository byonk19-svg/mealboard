# MealBoard Recipe Capture Extension

Private unpacked Chrome extension for sending the active recipe page to MealBoard Recipe Import Review.

## What It Captures

- Page URL
- Page title
- Text from `script[type="application/ld+json"]`
- Visible recipe-card text from common recipe layouts
- Visible calories/protein text when recipe cards expose it
- Current selected text as a fallback

It does not capture images, cookies, comments, ads, full page HTML, or background pages. Capture runs only after the user clicks the extension action.

## Permissions

Manifest permissions are limited to:

- `activeTab`
- `scripting`
- `storage`

Host permissions are limited to configured MealBoard app origins in `manifest.json`. The default private development origins are:

- `http://localhost/*`
- `http://127.0.0.1/*`

Do not add recipe-site host permissions. If a private deployed MealBoard origin is needed later, add only that exact MealBoard origin to both `host_permissions` and `content_scripts.matches`, then reload the unpacked extension.

## Local Load-Unpacked Setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `C:\dev\mealboard\extension\mealboard-recipe-capture`.
5. Pin **MealBoard Recipe Capture** if desired.
6. Open the extension popup and confirm the MealBoard URL, such as `http://localhost:3000`.

## Manual Smoke Checklist

1. Start MealBoard locally and sign in.
2. Open a recipe fixture or recipe page in Chrome.
3. Optional: select visible recipe text to exercise the fallback.
4. Click the extension and choose **Capture active tab**.
5. Confirm Chrome opens:
   - `/recipes/import/review?source=extension&draft=<draft-key>`
6. In the review page integration, listen for this window message from the content script:
   - `source: "mealboard-recipe-capture-extension"`
   - `type: "MEALBOARD_RECIPE_CAPTURE_DRAFT"`
   - `draftKey`
   - `payload`
7. After the app accepts the payload, it should post an acknowledgement back to the page:
   - `source: "mealboard-app"`
   - `type: "MEALBOARD_RECIPE_CAPTURE_DRAFT_RECEIVED"`
   - `draftKey`
8. Confirm the extension removes the one-time draft from `chrome.storage.local` after that acknowledgement.

The extension tries capture in this order:

1. Structured JSON-LD recipe data from the visible tab.
2. Visible recipe-card text from common recipe layouts.
3. User-selected text as a low-confidence fallback.

If a site is still showing a browser-check page such as "Just a moment...",
wait until the actual recipe is visible and capture again. If structured capture
is still incomplete, select the visible recipe text on the page and capture
again. MealBoard will split selected text into low-confidence ingredients,
instructions, and explicit calories/protein when recognizable section labels
are present, so the recipe can be cleaned up manually before saving.

## App Integration Contract

The extension stores the draft in `chrome.storage.local` under the draft key in the review URL. On configured MealBoard origins, `src/mealboard-bridge.js` reads that key and posts the captured payload to `window`.

Expected payload shape:

```json
{
  "version": 1,
  "sourceUrl": "https://example.test/recipe",
  "sourceTitle": "Recipe page title",
  "jsonLd": ["...raw JSON-LD script text..."],
  "visibleRecipe": {
    "title": "Visible recipe title",
    "ingredients": ["1 cup beans"],
    "instructions": ["Simmer beans."],
    "servingsText": "4 servings",
    "prepTimeText": "10 minutes",
    "cookTimeText": "20 minutes",
    "nutritionText": "Calories: 320 kcal Protein: 18g"
  },
  "selectedText": "Optional selected text fallback",
  "blockedPage": false,
  "capturedAt": "2026-06-24T00:00:00.000Z"
}
```

The app review page should validate the payload, move it into its own review/session state, then acknowledge receipt with `MEALBOARD_RECIPE_CAPTURE_DRAFT_RECEIVED`. The extension never writes recipes directly.
