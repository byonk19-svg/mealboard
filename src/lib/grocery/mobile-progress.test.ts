import { describe, expect, it } from "vitest";
import {
  applyGroceryProgressOperations,
  buildGroceryProgressNextRetryAt,
  getGroceryProgressOperationKey,
  getGroceryProgressStorageKey,
  isGroceryProgressRetryableStatus,
  markGroceryProgressOperationAttempted,
  markGroceryProgressOperationTerminal,
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

  it("builds a stable retry key per item field", () => {
    expect(
      getGroceryProgressOperationKey({
        field: "checked",
        itemId: "item-1"
      })
    ).toBe("item-1:checked");
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
        attemptCount: 0,
        field: "alreadyHave",
        itemId: "item-1",
        lastError: null,
        nextRetryAt: null,
        terminal: false,
        updatedAt: 1,
        value: true
      },
      {
        attemptCount: 0,
        field: "checked",
        itemId: "item-1",
        lastError: null,
        nextRetryAt: null,
        terminal: false,
        updatedAt: 2,
        value: false
      }
    ]);
  });

  it("preserves retry metadata while keeping the newest operation per item field", () => {
    expect(
      mergeGroceryProgressOperations([
        {
          attemptCount: 1,
          field: "checked",
          itemId: "item-1",
          nextRetryAt: 20,
          terminal: false,
          updatedAt: 2,
          value: true
        },
        {
          field: "checked",
          itemId: "item-1",
          updatedAt: 1,
          value: false
        }
      ])
    ).toEqual([
      {
        attemptCount: 1,
        field: "checked",
        itemId: "item-1",
        lastError: null,
        nextRetryAt: 20,
        terminal: false,
        updatedAt: 2,
        value: true
      }
    ]);
  });

  it("marks retry attempts with capped deterministic backoff", () => {
    expect(
      markGroceryProgressOperationAttempted({
        now: 1_000,
        operation: {
          field: "checked",
          itemId: "item-1",
          updatedAt: 1,
          value: true
        }
      })
    ).toEqual({
      attemptCount: 1,
      field: "checked",
      itemId: "item-1",
      lastError: null,
      nextRetryAt: 6_000,
      terminal: false,
      updatedAt: 1,
      value: true
    });

    expect(buildGroceryProgressNextRetryAt({ attemptCount: 9, now: 1_000 })).toBe(
      61_000
    );
  });

  it("classifies retryable and terminal status codes", () => {
    expect(isGroceryProgressRetryableStatus(0)).toBe(true);
    expect(isGroceryProgressRetryableStatus(408)).toBe(true);
    expect(isGroceryProgressRetryableStatus(500)).toBe(true);
    expect(isGroceryProgressRetryableStatus(409)).toBe(false);
    expect(isGroceryProgressRetryableStatus(404)).toBe(false);
  });

  it("marks non-retryable operations as terminal with an error message", () => {
    expect(
      markGroceryProgressOperationAttempted({
        now: 1_000,
        operation: {
          attemptCount: 1,
          field: "checked",
          itemId: "item-1",
          lastError: "This item cannot be updated anymore.",
          nextRetryAt: 6_000,
          terminal: false,
          updatedAt: 1,
          value: true
        },
        status: 409
      })
    ).toEqual({
      attemptCount: 2,
      field: "checked",
      itemId: "item-1",
      lastError: "This item cannot be updated anymore.",
      nextRetryAt: null,
      terminal: true,
      updatedAt: 1,
      value: true
    });

    expect(
      markGroceryProgressOperationTerminal({
        error: "This item cannot be updated anymore.",
        operation: {
          attemptCount: 1,
          field: "checked",
          itemId: "item-1",
          nextRetryAt: 6_000,
          terminal: false,
          updatedAt: 1,
          value: true
        }
      }).terminal
    ).toBe(true);
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
        attemptCount: 0,
        field: "checked",
        itemId: "item-1",
        lastError: null,
        nextRetryAt: null,
        terminal: false,
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

  it("parses legacy operations with retry metadata defaults", () => {
    expect(
      parseGroceryProgressOperations(
        JSON.stringify([
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
        attemptCount: 0,
        field: "checked",
        itemId: "item-1",
        lastError: null,
        nextRetryAt: null,
        terminal: false,
        updatedAt: 1,
        value: true
      }
    ]);
  });
});
