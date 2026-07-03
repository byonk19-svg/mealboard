# Pantry Stock Application Dogfood

Use this checklist for the reviewed Cooking Mode -> pantry stock application path. The goal is to find real allocation, reversal, and copy friction before adding more pantry behavior.

Use `docs/dogfood/PANTRY_STOCK_APPLICATION_NOTES_TEMPLATE.md` to capture one pass during a real meal, then classify the notes after cooking.

## Boundaries

- Do not add hidden stock mutation during dogfood.
- Confirming consumption remains review-only.
- Skipping consumption remains write-free.
- Apply stock only through the explicit pantry stock application form.
- Reverse stock only through the explicit reversal form.
- Keep notes specific enough to turn repeated friction into one narrow fix.

## Setup

- Use a local linked household user.
- Use a completed Cooking Mode session with at least three food-backed ingredients:
  - one ingredient with exactly one compatible pantry lot,
  - one ingredient with two compatible pantry lots,
  - one ingredient with no compatible pantry lot or mismatched unit.
- Record pantry lot names, starting quantities, units, and expiration dates before applying stock.

## Scenarios

### Single-Lot Apply

- Confirm consumption for an ingredient with exactly one compatible lot.
- Before applying, open `/pantry` and verify the lot quantity is unchanged.
- Return to the completed cooking session.
- Confirm the review card shows the compatible lot, applied quantity, applied unit, and an apply action.
- Apply stock with a short note.
- Open `/pantry` and verify only that lot changed by the applied quantity.
- Return to the cooking session and verify the applied allocation remains visible after reload.

Notes:

```txt
Lot:
Starting quantity:
Applied quantity:
After apply:
Friction:
```

### Reversal

- Reverse the stock application with a short note.
- Open `/pantry` and verify the exact lot quantity is restored.
- Return to the cooking session and verify the card is terminal and cannot be applied again.
- Reload and verify the reversed state remains visible.

Notes:

```txt
Before reversal:
After reversal:
Was the terminal state clear?
Friction:
```

### Multi-Lot Allocation

- Confirm consumption for an ingredient with two compatible lots.
- Verify the lot order is understandable.
- Enter an allocation that sums exactly to the applied quantity.
- Apply stock with a short note.
- Open `/pantry` and verify each selected lot changed by only its entered allocation.
- Repeat mentally with a partial-use quantity and note whether the form makes the sum requirement obvious.

Notes:

```txt
Lots shown:
Allocation entered:
After apply:
Was the sum requirement clear?
Friction:
```

### Ineligible or Manual-Review Ingredient

- Confirm consumption for an ingredient with missing quantity, missing unit, or no compatible pantry lot.
- Verify the review card explains why no stock write is auto-ready.
- If no same-food reviewable lots are listed, verify no apply action appears.
- If same-food reviewable lots are listed with mismatched or missing structure, verify the reviewed apply form makes quantity and unit review explicit before any stock write.
- Decide whether the next action is clear: leave the decision unapplied, review the visible quantity/unit fields, edit the recipe ingredient before a future cooking session, or update pantry stock with matching units.

Notes:

```txt
Reason shown:
Expected next action:
Was that clear?
Friction:
```

### Skip

- Skip one consumption candidate.
- Verify the skipped card never shows an apply action.
- Verify `/pantry` is unchanged.

Notes:

```txt
Skipped ingredient:
Was the write-free state clear?
Friction:
```

## Evidence to Capture

- Cooking session URL.
- Pantry lot names and quantity transitions, for example `lot A 3 -> 1 -> 3`.
- One screenshot or note for the applied state.
- One screenshot or note for the reversed state.
- Any confusing copy, order, default value, keyboard behavior, mobile layout, or retry/reload behavior.

## Stop Conditions

Stop and create a narrow implementation issue if the same friction appears twice, or if any dogfood pass finds:

- a pantry quantity changes before Apply,
- skipped consumption can mutate stock,
- Apply can deduct the wrong lot,
- Reverse does not restore the exact lot quantity,
- an apply/reverse result is not understandable after reload,
- mobile allocation entry is hard to complete without mistakes.
