# Pantry Stock Application Dogfood Notes Template

Use this with `docs/dogfood/PANTRY_STOCK_APPLICATION_DOGFOOD.md`. Make one copy per meal, capture facts while cooking, and classify notes after the pass.

## Pass Metadata

```txt
Date:
Cook/user:
Meal or recipe:
Cooking session URL:
Device and browser:
Viewport: desktop / mobile / both
```

## Pantry Lots Before Cooking

Record only the lots involved in this pass.

| Food / lot name | Quantity before | Unit | Expiration | Notes |
| --- | ---: | --- | --- | --- |
| | | | | |

## Scenario Notes

### Single-Lot Apply

```txt
Ingredient:
Lot:
Starting quantity:
Applied quantity:
Quantity after apply:
Did pantry stay unchanged before Apply? yes / no
Did only the expected lot change? yes / no
Did the applied state survive reload? yes / no
Friction:
Evidence:
```

### Reversal

```txt
Applied state before reversal:
Quantity after reversal:
Was the exact lot restored? yes / no
Was the terminal reversed state clear? yes / no
Could it be applied again after reversal? yes / no
Did the reversed state survive reload? yes / no
Friction:
Evidence:
```

### Multi-Lot Allocation

```txt
Ingredient:
Lots shown, in order:
Allocation entered:
Quantity after apply for each lot:
Did allocations sum exactly to the applied quantity? yes / no
Was the sum requirement clear before submitting? yes / no
Did reload preserve the allocation summary? yes / no
Friction:
Evidence:
```

### Ineligible or Manual-Review Ingredient

```txt
Ingredient:
Reason shown:
Expected next action:
Was that next action clear? yes / no
Was an apply action hidden when no safe lot existed? yes / no
If reviewable lots were shown, were quantity and unit review explicit? yes / no / not applicable
Friction:
Evidence:
```

### Skip

```txt
Ingredient:
Was the write-free skipped state clear? yes / no
Did any pantry quantity change? yes / no
Did the skipped state survive reload? yes / no
Friction:
Evidence:
```

## Classification Table

Fill this after the pass, or leave it blank for later classification.

| Note | Classification | Evidence | Stop condition? |
| --- | --- | --- | --- |
| | correctness issue / repeated UX friction / one-off UX friction / no issue | | yes / no |

## Stop Conditions

These mirror the checklist stop conditions. Stop and open a narrow implementation branch only if any of these happen:

- Pantry quantity changes before Apply.
- Skipped consumption mutates stock.
- Apply deducts the wrong lot.
- Reverse does not restore the exact lot quantity.
- Apply or reverse state is not understandable after reload.
- Mobile allocation entry is hard to complete without mistakes.
- The same UX friction appears in two real-meal passes.
