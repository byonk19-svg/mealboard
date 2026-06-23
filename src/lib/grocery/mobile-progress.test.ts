import { describe, expect, it } from "vitest";
import {
  applyGroceryProgressOperations,
  getGroceryProgressStorageKey,
  mergeGroceryProgressOperations,
  parseGroceryProgressOperations,
  serializeGroceryProgressOperations
} from "./mobile-progress";

describe("mobile grocery progress helpers", () => {
  it("scopes local progress to the grocery list version", () => {
    expect(
      getGroceryProgressStorageKey({
        generatedAt: "2026-06-23T12:00:00.000Z",
        groceryListId: "list-1"
      })
    ).toBe("mealboard:grocery-progress:list-1:2026-06-23T12:00:00.000Z");
  });

  it("keeps the newest operation per item field", () => {
    expect(
      mergeGroceryProgressOperations([
        {
          field: "checked",
          itemId: "item-1",
          updatedAt: 1,
          value: true
        },
        {
          field: "checked",
          itemId: "item-1",
          updatedAt: 2,
          value: false
        },
        {
          field: "alreadyHave",
          itemId: "item-1",
          updatedAt: 1,
          value: true
        }
      ])
    ).toEqual([
      {
        field: "alreadyHave",
        itemId: "item-1",
        updatedAt: 1,
        value: true
      },
      {
        field: "checked",
        itemId: "item-1",
        updatedAt: 2,
        value: false
      }
    ]);
  });

  it("applies pending operations over loaded item state", () => {
    expect(
      applyGroceryProgressOperations({
        items: [
          {
            alreadyHave: false,
            checked: false,
            id: "item-1"
          }
        ],
        operations: [
          {
            field: "checked",
            itemId: "item-1",
            updatedAt: 1,
            value: true
          }
        ]
      })
    ).toEqual([
      {
        alreadyHave: false,
        checked: true,
        id: "item-1"
      }
    ]);
  });

  it("round-trips valid localStorage payloads and drops invalid rows", () => {
    expect(
      parseGroceryProgressOperations(
        serializeGroceryProgressOperations([
          {
            field: "checked",
            itemId: "item-1",
            updatedAt: 1,
            value: true
          }
        ])
      )
    ).toEqual([
      {
        field: "checked",
        itemId: "item-1",
        updatedAt: 1,
        value: true
      }
    ]);

    expect(
      parseGroceryProgressOperations(
        JSON.stringify([{ field: "other", itemId: "item-1", value: true }])
      )
    ).toEqual([]);
  });
});
