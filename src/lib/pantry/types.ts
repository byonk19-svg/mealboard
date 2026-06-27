export type PantryStockStatus = "in_stock" | "low" | "out" | "unknown";

export type PantryEventType =
  | "created"
  | "adjusted"
  | "status_changed"
  | "expiration_changed"
  | "category_changed"
  | "storage_changed"
  | "notes_changed"
  | "discarded";

export type PantryItemInput = {
  displayName: string | null;
  expirationDate: string | null;
  foodId: string | null;
  groceryCategoryId: string | null;
  isOpen?: boolean | null;
  lowStockThresholdQuantity: string | null;
  lowStockThresholdUnit: string | null;
  mealProfileId: string | null;
  notes: string | null;
  openedAt: string | null;
  packageDetail: string | null;
  quantity: string | null;
  quantityNote: string | null;
  stockStatus: string | null;
  storageLocation: string | null;
  unit: string | null;
};

export type NormalizedPantryItemInput = {
  displayName: string;
  expirationDate: string | null;
  foodId: string;
  groceryCategoryId: string | null;
  isOpen: boolean;
  lowStockThresholdQuantity: number | null;
  lowStockThresholdUnit: string | null;
  mealProfileId: string | null;
  notes: string | null;
  openedAt: string | null;
  packageDetail: string | null;
  quantity: number | null;
  quantityNote: string | null;
  stockStatus: PantryStockStatus;
  storageLocation: string | null;
  unit: string | null;
};

export type PantryItem = {
  discardedAt: string | null;
  displayName: string;
  expirationDate: string | null;
  foodId: string;
  foodName: string;
  groceryCategoryId: string | null;
  groceryCategoryName: string | null;
  groceryCategorySortOrder: number | null;
  householdId: string;
  id: string;
  isOpen: boolean;
  lowStockThresholdQuantity: number | null;
  lowStockThresholdUnit: string | null;
  mealProfileId: string | null;
  mealProfileName: string | null;
  notes: string | null;
  openedAt: string | null;
  packageDetail: string | null;
  quantity: number | null;
  quantityNote: string | null;
  stockStatus: PantryStockStatus;
  storageLocation: string | null;
  unit: string | null;
  updatedAt: string;
};

export type PantryEvent = {
  afterState: Record<string, unknown> | null;
  beforeState: Record<string, unknown> | null;
  createdAt: string;
  eventType: PantryEventType;
  householdId: string;
  id: string;
  note: string | null;
  pantryItemId: string;
};

export type PantryExpirationStatus =
  | "missing"
  | "expired"
  | "today"
  | "expiring_soon"
  | "not_expiring";

export type PantryItemView = PantryItem & {
  effectiveExpirationStatus: PantryExpirationStatus;
  effectiveStockStatus: PantryStockStatus;
};

export type PantryItemRollup = {
  categoryName: string | null;
  effectiveStockStatus: PantryStockStatus;
  foodId: string;
  foodName: string;
  items: PantryItemView[];
  nearestExpirationDate: string | null;
};

export type PantryCategoryGroup = {
  categoryId: string | null;
  categoryName: string;
  rollups: PantryItemRollup[];
  sortOrder: number;
};
