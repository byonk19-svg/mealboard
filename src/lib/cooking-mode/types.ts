import type { CookingSessionStatus } from "./domain";

export type CookingModeRecipeIngredient = {
  displayName: string;
  foodId: string | null;
  id: string;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | null;
  sortOrder: number;
  unit: string | null;
};

export type CookingModeRecipeStep = {
  id: string;
  instruction: string;
  sectionLabel: string | null;
  sortOrder: number;
};

export type CookingModeRecipe = {
  canStartCooking: boolean;
  id: string;
  ingredients: CookingModeRecipeIngredient[];
  instructions: string | null;
  name: string;
  servings: number | null;
  stepReviewRequired: boolean;
  steps: CookingModeRecipeStep[];
  updatedAt: string;
};

export type CookingSessionIngredient = {
  displayName: string;
  foodId: string | null;
  id: string;
  isReady: boolean;
  notes: string | null;
  optional: boolean;
  preparation: string | null;
  quantity: number | null;
  readyAt: string | null;
  recipeIngredientId: string | null;
  sortOrder: number;
  unit: string | null;
};

export type CookingSessionStep = {
  completedAt: string | null;
  id: string;
  instruction: string;
  isCompleted: boolean;
  recipeStepId: string | null;
  sectionLabel: string | null;
  sortOrder: number;
};

export type CookingTimerStatus =
  | "ready"
  | "running"
  | "paused"
  | "expired"
  | "dismissed"
  | "canceled";

export type CookingTimer = {
  canceledAt: string | null;
  cookingSessionStepId: string | null;
  createdAt: string;
  dismissedAt: string | null;
  durationSeconds: number;
  expiredAt: string | null;
  expiresAt: string | null;
  id: string;
  label: string | null;
  pausedAt: string | null;
  remainingSeconds: number | null;
  startedAt: string | null;
  status: CookingTimerStatus;
  updatedAt: string;
};

export type ResolvedCookingTimer = CookingTimer & {
  effectiveRemainingSeconds: number;
  effectiveStatus: CookingTimerStatus;
};

export type CookingSession = {
  abandonedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  currentStepSortOrder: number | null;
  householdId: string;
  id: string;
  ingredients: CookingSessionIngredient[];
  notes: string | null;
  pausedAt: string | null;
  recipeId: string;
  recipeNameSnapshot: string;
  recipeUpdatedAtSnapshot: string | null;
  scaleFactorSnapshot: number;
  servingsSnapshot: number | null;
  startedAt: string;
  status: CookingSessionStatus;
  steps: CookingSessionStep[];
  substitutions: string | null;
  timers: CookingTimer[];
  updatedAt: string;
  weeklyPlanItemId: string | null;
};
