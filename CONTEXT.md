# MealBoard

MealBoard is a private family meal-planning context for turning household preferences, recipes, weekly plans, and grocery needs into a practical shopping workflow.

## Language

**Recipe Ingestion**:
The process of bringing a recipe from an outside source into MealBoard as reviewed, structured recipe data.
_Avoid_: Recipe scraping, recipe automation

**Imported Recipe**:
A recipe draft created from an outside source that must be reviewed before it becomes a normal MealBoard recipe.
_Avoid_: Scraped recipe, auto-created recipe

**Recipe Import Review**:
The user approval step where an imported recipe draft is checked and corrected before it is saved.
_Avoid_: Background import, silent save

**Structured Nutrition**:
Nutrition values that come from an explicit recipe data field, not from MealBoard estimating ingredients.
_Avoid_: Inferred nutrition, calculated nutrition

**Source Page Content**:
Temporary recipe page text or structured page data used only during Recipe Import Review; MealBoard should not persist raw imported page HTML or full source text after saving.
_Avoid_: Archived page copy, stored scrape

**Private Recipe Capture Extension**:
A locally installed, unpacked Chrome extension used by the household to send the current recipe page into MealBoard review.
_Avoid_: Chrome Web Store release, public browser extension

**Recipe Source Attribution**:
The saved source URL and source title attached to a reviewed recipe so the household can recognize where it came from without storing the source page content.
_Avoid_: Page archive, source copy

**Import Confidence**:
A review signal that marks how trustworthy an imported field is before the user saves the recipe.
_Avoid_: Automation certainty, silent correction
