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

**Staple**:
A recurring planning preference for something the household often wants available. A staple suggests what to consider buying; it is not proof that the household currently has stock.
_Avoid_: Pantry item, inventory count

**Grocery Item**:
A purchase/checkoff line on a grocery list. A grocery item answers what should be bought for a plan, staple, baby food, manual add-on, or household need.
Already Have is grocery-list state meaning the household does not need to buy that item for this list. It does not create or update pantry stock by itself.
_Avoid_: Pantry item, recipe ingredient

**Recipe Ingredient**:
A recipe-specific input that describes what the recipe calls for. A recipe ingredient may generate a grocery item, but it is not itself a pantry record.
_Avoid_: Pantry item, grocery item

**Household Item**:
The household catalog identity for food and non-food goods that may appear in preferences, recipes, staples, grocery lists, or pantry stock. The current implementation may still use the existing foods table for this concept until a future rename is justified.
_Avoid_: Pantry item, grocery item

**Recipe Step**:
A reviewed, ordered cooking instruction for a saved recipe. Recipe steps support Cooking Mode, while freeform recipe instructions may be used as source text for a review-first step conversion flow.
Once reviewed recipe steps exist, they are the source of truth for Cooking Mode. Freeform recipe instructions remain display/source text and do not silently rewrite cooking steps.
Recipe steps may carry an optional section label. Sections are lightweight grouping labels in v1, not separate domain records.
Recipe steps are linear in v1. Conditional or alternative instructions may be written in step text, but Cooking Mode does not model branching steps yet.
_Avoid_: Cooking session step, imported instruction text

**Pantry Item**:
A current household stock record for food or household goods the household believes it has on hand. Pantry items are lot/package-aware when expiration, opened state, or storage location differs, while the UI may roll them up by food for scanning.
Pantry items are linked to the household item catalog for identity; package, product, storage, opened state, and expiration details describe the stock lot.
Pantry items are household stock. They may carry optional meal profile context for items primarily intended for one profile, but profile context does not mean exclusive ownership.
Automatic pantry matching uses shared Household Item identity. Product names, display names, and aliases may suggest possible matches for review, but they are not enough for silent matching.
Pantry items have a stock status such as in stock, low, out, or unknown. Precise quantity and unit are optional; household-friendly quantity notes are valid when exact measurement is not useful.
Pantry items may distinguish package quantity from usable contents when known, such as one pack containing eight tortillas. Package-to-contents conversion should only happen when explicitly known.
Low stock may be manually marked or derived from optional thresholds when units are compatible. Low-stock signals create grocery review candidates rather than silently changing grocery lists.
Expiration belongs to pantry item lots and is date-based in the household timezone. Optional opened or prepared timestamps may support later freshness notes. Food-level pantry rollups may show the nearest relevant expiration. Expired items should not count as available for recipe matching unless explicitly marked usable.
Pantry can annotate grocery review with likely already-have, low-stock, expiring-soon, or out signals, but pantry does not silently subtract or remove grocery items in v1.
Storage location belongs to the pantry item lot, using simple household-facing locations such as pantry, fridge, freezer, counter, or other. Storage location is not a grocery category or store aisle.
Pantry may track food and non-food household goods. Recipe matching, nutrition, baby food status, and cooking consumption apply only to food-backed pantry items.
Pantry items should track recency or confidence such as last confirmed, last observed, or high/medium/low confidence. Low-confidence pantry stock can qualify recipe and grocery suggestions but should not suppress grocery items automatically.
Planned meal use may annotate pantry stock, but v1 does not reserve or lock pantry quantities for future recipes.
Prepared leftovers are not part of the first Smart Pantry slice. Cooking notes and weekly wrap-up can capture leftover context until a dedicated leftovers concept is justified.
_Avoid_: Staple, grocery item

**Pantry Event**:
An inventory-changing fact for a pantry item, such as bought, used, adjusted, expired, or discarded.
Pantry events explain changes, but Pantry Item current state is the editable source of truth for current stock. MealBoard should not require pantry state to be perfectly rebuilt from event history.
Normal corrections should create a new adjusted event and update current pantry state rather than deleting prior events.
Pantry event source links explain origin or use, such as grocery list item, cooking session, cooking session ingredient, or manual adjustment. Source links belong on events rather than pantry item identity.
Pantry events are domain-specific. MealBoard should not use a generic catch-all event table for pantry, cooking, grocery, and wrap-up behavior unless a later analytics/audit need justifies it.
_Avoid_: Notification, grocery source

**Pantry Intake Candidate**:
A reviewed suggestion to add checked grocery items into pantry stock after shopping is completed. Intake candidates are not inventory until the user confirms, edits, or skips them.
_Avoid_: Automatic pantry item, grocery item

**Cooking Session**:
A live or historical execution of a recipe or planned meal, including checked ingredients, checked steps, timers, and cooking notes.
Checking ingredients or steps in a cooking session does not mutate pantry stock. Ingredient checks mean ready/prepped for the session. Step checks mean the instruction is done. Pantry use is proposed at session completion and only becomes inventory change after user review.
Cooking Mode uses an ingredient readiness checklist and ordered recipe steps. Prep notes may display on ingredient rows, while actions like preheating or chopping as instructions belong in recipe steps.
Ingredient substitutions during cooking are session-scoped by default. They can alter pantry consumption candidates for that session and may be offered for recipe review, but they do not automatically edit the saved recipe.
Cooking Session v1 is backed by a saved recipe. It may link to a weekly plan item, but ad hoc non-recipe cooking belongs in manual pantry use or adjustment flows.
Cooking sessions use an explicit lifecycle: active, paused, completed, or abandoned. Abandoned sessions do not update recipe history, weekly wrap-up, or pantry. Timer expiry does not complete a session.
Completing a cooking session does not require every ingredient or step to be checked. Unchecked items may be shown as a warning, but completion is an explicit user action.
A cooking session should use a snapshot of the effective recipe ingredients and reviewed recipe steps available when the session starts, including any planned scale factor or serving adjustment, so later recipe or plan edits do not rewrite the active session.
If the underlying recipe changes during an active session, the session keeps its snapshot; new sessions use the edited recipe.
Cooking sessions should be resumable across devices, but v1 does not require real-time collaborative conflict handling. Voice controls later act on the current active session on the current device.
Completing a cooking session can record made/tried evidence and mark a linked weekly plan item as made, but approval and favorite status require explicit recipe review.
Cooking sessions may capture text notes that feed recipe review or wrap-up, but notes do not automatically edit the saved recipe. Cooking Mode first slice does not include photos.
Voice controls should initially operate only inside the active cooking session for navigation, checklist toggles, reading steps, and timer controls. Voice should not complete sessions, mutate pantry, change grocery lists, or edit recipes without explicit reviewed actions.
_Avoid_: Recipe, weekly plan item

**Cooking Timer**:
A timer owned by a cooking session. A cooking timer may be linked to a recipe step or be ad hoc, and it has its own lifecycle such as ready, running, paused, expired, dismissed, or canceled.
_Avoid_: Recipe step, reminder

**Cooking Mode First Slice**:
The first Cooking Mode implementation should add reviewed recipe steps, recipe-backed cooking sessions, session snapshots, ingredient readiness checks, step checks, and in-app timers before adding pantry consumption or voice controls.
Cooking Mode and Smart Pantry should be implemented as separate tracks. Start with Cooking Mode for user-visible recipe execution, then Smart Pantry for stock/restock, then integrate grocery intake, cooking consumption, and use-soon planning signals.
_Avoid_: Pantry integration, voice control

**Pantry Consumption Candidate**:
A reviewed suggestion to decrement pantry stock after a cooking session or manual use. Consumption candidates are not inventory changes until the user confirms, edits, or skips them.
When candidate units are compatible with a pantry item lot, confirmation may decrement quantity and mark an opened state. When units are incompatible or imprecise, confirmation should fall back to reviewed status changes or notes rather than fake precision.
_Avoid_: Checked ingredient, completed step

**Pantry Restock Candidate**:
A reviewed suggestion to add a low or out pantry item to a grocery list. Restock candidates are not grocery items until the user adds them to a draft or active grocery list.
The first Smart Pantry slice should prove manual pantry stock, pantry events, low/out status, and restock candidates before connecting grocery completion intake, cooking consumption, or recipe matching.
_Avoid_: Automatic grocery item, staple

**Use Soon Suggestion**:
A recipe or planning suggestion that highlights pantry stock nearing expiration. Use soon suggestions may boost matching recipes, but they do not override profile safety, approval, baby rules, or user review.
Pantry should feed planning gradually: first through pantry/grocery review, then grocery annotations, then recipe search/use-soon suggestions, and only later through transparent weekly planning score boosts.
For baby meals, pantry availability or expiration can only boost foods already allowed by baby status and guidance. Pantry should not turn an untried, disliked, unsafe, hard-no, or allergy food into a routine baby suggestion.
_Avoid_: Automatic meal plan, expiration warning
