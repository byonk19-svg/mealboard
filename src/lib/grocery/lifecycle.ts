import type { GroceryListStatus } from "./data";

export type GroceryLifecycleTimestampField =
  | "finalized_at"
  | "shopping_started_at"
  | "completed_at";

const nextStatusByStatus: Record<
  GroceryListStatus,
  Exclude<GroceryListStatus, "draft"> | null
> = {
  completed: null,
  draft: "finalized",
  finalized: "shopping_started",
  shopping_started: "completed"
};

const timestampFieldByStatus: Record<
  Exclude<GroceryListStatus, "draft">,
  GroceryLifecycleTimestampField
> = {
  completed: "completed_at",
  finalized: "finalized_at",
  shopping_started: "shopping_started_at"
};

export function getNextGroceryListStatus(status: GroceryListStatus) {
  return nextStatusByStatus[status];
}

export function getGroceryLifecycleTimestampField(
  status: Exclude<GroceryListStatus, "draft">
) {
  return timestampFieldByStatus[status];
}
