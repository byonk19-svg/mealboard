import { describe, expect, it } from "vitest";
import {
  getNextGroceryListStatus,
  getGroceryLifecycleTimestampField
} from "./lifecycle";

describe("grocery lifecycle", () => {
  it("allows only one-step forward lifecycle transitions", () => {
    expect(getNextGroceryListStatus("draft")).toBe("finalized");
    expect(getNextGroceryListStatus("finalized")).toBe("shopping_started");
    expect(getNextGroceryListStatus("shopping_started")).toBe("completed");
    expect(getNextGroceryListStatus("completed")).toBeNull();
  });

  it("maps lifecycle destinations to the matching timestamp field", () => {
    expect(getGroceryLifecycleTimestampField("finalized")).toBe("finalized_at");
    expect(getGroceryLifecycleTimestampField("shopping_started")).toBe(
      "shopping_started_at"
    );
    expect(getGroceryLifecycleTimestampField("completed")).toBe("completed_at");
  });
});
