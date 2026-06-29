import type { PantryStockStatus } from "./types";

export type PantryConsumptionStockDecision = {
  cookingSessionIngredientId: string;
  status: "confirmed" | "skipped";
};

export type PantryConsumptionStockCandidate = {
  cookingSessionIngredientId: string;
  foodId: string;
  quantity: number | null;
  unit: string | null;
};

export type PantryConsumptionStockLot = {
  discardedAt: string | null;
  displayName: string;
  expirationDate: string | null;
  foodId: string;
  householdId: string;
  id: string;
  quantity: number | null;
  stockStatus: PantryStockStatus;
  unit: string | null;
  updatedAt: string;
};

export type PantryConsumptionStockAllocationDraft = {
  pantryItemId: string;
  quantity: number | null;
  unit: string | null;
};

export type PantryConsumptionStockApplicationAllocation = {
  appliedQuantity: number;
  id: string;
  pantryItemId: string;
  unit: string;
};

export type PantryConsumptionStockApplication = {
  allocations: PantryConsumptionStockApplicationAllocation[];
  id: string;
  reversal: PantryConsumptionStockReversal | null;
};

export type PantryConsumptionStockReversal = {
  id: string;
};

export type PantryConsumptionStockIneligibilityReason =
  | "missing_quantity"
  | "missing_unit"
  | "no_eligible_lot";

export type PantryConsumptionStockState =
  | {
      status: "undecided";
    }
  | {
      reason: "decision_candidate_mismatch" | "missing_candidate";
      status: "invalid_stale";
    }
  | {
      status: "skipped";
    }
  | {
      application: PantryConsumptionStockApplication;
      status: "applied";
    }
  | {
      application: PantryConsumptionStockApplication;
      reversal: PantryConsumptionStockReversal;
      status: "reversed";
    }
  | {
      autoSelectedPantryItemId: string | null;
      eligibleLots: PantryConsumptionStockLot[];
      proposedQuantity: number | null;
      proposedUnit: string | null;
      readiness: "allocation_required" | "ineligible" | "single_lot_auto";
      reason: PantryConsumptionStockIneligibilityReason | null;
      status: "confirmed_unapplied";
    };

export type PantryConsumptionStockApplicationValidationReason =
  | "missing_quantity"
  | "invalid_quantity"
  | "missing_unit";

export type PantryConsumptionStockAllocationValidationReason =
  | "missing_allocation"
  | "duplicate_lot"
  | "unknown_lot"
  | "inactive_lot"
  | "wrong_food"
  | "missing_quantity"
  | "invalid_quantity"
  | "missing_unit"
  | "incompatible_unit"
  | "overdraw"
  | "sum_mismatch";

export type PantryConsumptionStockApplicationValidationResult =
  | {
      quantity: number;
      unit: string;
      valid: true;
    }
  | {
      reasons: PantryConsumptionStockApplicationValidationReason[];
      valid: false;
    };

export type PantryConsumptionStockValidatedAllocation = {
  pantryItemId: string;
  pantryQuantityAfter: number;
  pantryQuantityBefore: number;
  quantity: number;
  unit: string;
};

export type PantryConsumptionStockAllocationValidationResult =
  | {
      allocations: PantryConsumptionStockValidatedAllocation[];
      valid: true;
    }
  | {
      reasons: PantryConsumptionStockAllocationValidationReason[];
      valid: false;
    };

export type PantryConsumptionStockReversalDelta = {
  pantryItemId: string;
  restoredQuantity: number;
  stockApplicationAllocationId: string;
  unit: string;
};

const unavailableStockStatuses = new Set<PantryStockStatus>([
  "out",
  "unknown"
]);
const quantityTolerance = 1e-9;

export function buildPantryConsumptionStockState({
  application,
  candidate,
  decision,
  householdId,
  pantryItems
}: {
  application: PantryConsumptionStockApplication | null;
  candidate: PantryConsumptionStockCandidate | null;
  decision: PantryConsumptionStockDecision | null;
  householdId: string;
  pantryItems: PantryConsumptionStockLot[];
}): PantryConsumptionStockState {
  if (!decision) {
    return { status: "undecided" };
  }

  if (application?.reversal) {
    return {
      application,
      reversal: application.reversal,
      status: "reversed"
    };
  }

  if (application) {
    return { application, status: "applied" };
  }

  if (decision.status === "skipped") {
    return { status: "skipped" };
  }

  if (!candidate) {
    return { reason: "missing_candidate", status: "invalid_stale" };
  }

  if (
    decision.cookingSessionIngredientId !== candidate.cookingSessionIngredientId
  ) {
    return { reason: "decision_candidate_mismatch", status: "invalid_stale" };
  }

  const proposedQuantity = normalizePositiveQuantity(candidate.quantity);
  const proposedUnit = normalizePantryConsumptionStockUnit(candidate.unit);
  const eligibleLots = getEligiblePantryConsumptionStockLots({
    appliedQuantity: proposedQuantity,
    appliedUnit: proposedUnit,
    foodId: candidate.foodId,
    householdId,
    pantryItems
  });
  const readiness = getConfirmedUnappliedReadiness({
    eligibleLotCount: eligibleLots.length,
    proposedQuantity,
    proposedUnit
  });

  return {
    autoSelectedPantryItemId:
      readiness === "single_lot_auto" ? eligibleLots[0].id : null,
    eligibleLots,
    proposedQuantity,
    proposedUnit,
    readiness,
    reason: getConfirmedUnappliedReason({
      eligibleLotCount: eligibleLots.length,
      proposedQuantity,
      proposedUnit
    }),
    status: "confirmed_unapplied"
  };
}

export function getEligiblePantryConsumptionStockLots({
  appliedQuantity,
  appliedUnit,
  foodId,
  householdId,
  pantryItems
}: {
  appliedQuantity: number | null;
  appliedUnit: string | null;
  foodId: string;
  householdId: string;
  pantryItems: PantryConsumptionStockLot[];
}): PantryConsumptionStockLot[] {
  if (!appliedUnit) {
    return [];
  }

  return pantryItems
    .filter((item) =>
      isEligiblePantryConsumptionStockLot({
        appliedUnit,
        foodId,
        householdId,
        item
      })
    )
    .sort((left, right) =>
      comparePantryConsumptionStockLots({ appliedQuantity, left, right })
    );
}

export function validatePantryConsumptionStockApplicationInput({
  appliedQuantity,
  appliedUnit
}: {
  appliedQuantity: number | null;
  appliedUnit: string | null;
}): PantryConsumptionStockApplicationValidationResult {
  const reasons: PantryConsumptionStockApplicationValidationReason[] = [];
  const quantity = normalizePositiveQuantity(appliedQuantity);
  const unit = normalizePantryConsumptionStockUnit(appliedUnit);

  if (appliedQuantity === null) {
    reasons.push("missing_quantity");
  } else if (quantity === null) {
    reasons.push("invalid_quantity");
  }

  if (!unit) {
    reasons.push("missing_unit");
  }

  return reasons.length > 0
    ? { reasons, valid: false }
    : { quantity: quantity as number, unit: unit as string, valid: true };
}

export function validatePantryConsumptionStockAllocations({
  allocations,
  appliedQuantity,
  appliedUnit,
  foodId,
  householdId,
  pantryItems
}: {
  allocations: PantryConsumptionStockAllocationDraft[];
  appliedQuantity: number;
  appliedUnit: string;
  foodId: string;
  householdId: string;
  pantryItems: PantryConsumptionStockLot[];
}): PantryConsumptionStockAllocationValidationResult {
  const reasons = new Set<PantryConsumptionStockAllocationValidationReason>();
  const normalizedAppliedUnit = normalizePantryConsumptionStockUnit(appliedUnit);
  const itemsById = new Map(pantryItems.map((item) => [item.id, item]));
  const seenLotIds = new Set<string>();
  const normalizedAllocations: PantryConsumptionStockValidatedAllocation[] = [];

  if (allocations.length === 0) {
    reasons.add("missing_allocation");
  }

  for (const allocation of allocations) {
    if (seenLotIds.has(allocation.pantryItemId)) {
      reasons.add("duplicate_lot");
    }
    seenLotIds.add(allocation.pantryItemId);

    const item = itemsById.get(allocation.pantryItemId);
    const quantity = normalizePositiveQuantity(allocation.quantity);
    const unit = normalizePantryConsumptionStockUnit(allocation.unit);

    if (!item) {
      reasons.add("unknown_lot");
    } else if (
      !isEligiblePantryConsumptionStockLot({
        appliedUnit: normalizedAppliedUnit,
        foodId,
        householdId,
        item
      })
    ) {
      addLotIneligibilityReason({
        appliedUnit: normalizedAppliedUnit,
        foodId,
        householdId,
        item,
        reasons
      });
    }

    if (allocation.quantity === null) {
      reasons.add("missing_quantity");
    } else if (quantity === null) {
      reasons.add("invalid_quantity");
    }

    if (!unit) {
      reasons.add("missing_unit");
    } else if (normalizedAppliedUnit !== unit) {
      reasons.add("incompatible_unit");
    }

    if (item && quantity !== null) {
      if (item.quantity === null || quantity > item.quantity + quantityTolerance) {
        reasons.add("overdraw");
      } else if (unit) {
        normalizedAllocations.push({
          pantryItemId: item.id,
          pantryQuantityAfter: subtractQuantity(item.quantity, quantity),
          pantryQuantityBefore: item.quantity,
          quantity,
          unit
        });
      }
    }
  }

  const allocationTotal = normalizedAllocations.reduce(
    (sum, allocation) => sum + allocation.quantity,
    0
  );

  if (
    allocations.length > 0 &&
    !quantitiesEqual(allocationTotal, appliedQuantity)
  ) {
    reasons.add("sum_mismatch");
  }

  return reasons.size > 0
    ? { reasons: Array.from(reasons), valid: false }
    : { allocations: normalizedAllocations, valid: true };
}

export function buildPantryConsumptionStockReversalDeltas({
  allocations
}: {
  allocations: PantryConsumptionStockApplicationAllocation[];
}): PantryConsumptionStockReversalDelta[] {
  return allocations
    .map((allocation) => ({
      pantryItemId: allocation.pantryItemId,
      restoredQuantity: allocation.appliedQuantity,
      stockApplicationAllocationId: allocation.id,
      unit:
        normalizePantryConsumptionStockUnit(allocation.unit) ?? allocation.unit
    }))
    .sort((left, right) =>
      left.pantryItemId.localeCompare(right.pantryItemId) ||
      left.stockApplicationAllocationId.localeCompare(
        right.stockApplicationAllocationId
      )
    );
}

export function normalizePantryConsumptionStockUnit(
  value: string | null | undefined
) {
  const unit = String(value ?? "").trim().replace(/\s+/g, " ");
  return unit.length > 0 ? unit.toLocaleLowerCase() : null;
}

function getConfirmedUnappliedReadiness({
  eligibleLotCount,
  proposedQuantity,
  proposedUnit
}: {
  eligibleLotCount: number;
  proposedQuantity: number | null;
  proposedUnit: string | null;
}): "allocation_required" | "ineligible" | "single_lot_auto" {
  if (proposedQuantity === null || proposedUnit === null || eligibleLotCount === 0) {
    return "ineligible";
  }

  return eligibleLotCount === 1 ? "single_lot_auto" : "allocation_required";
}

function getConfirmedUnappliedReason({
  eligibleLotCount,
  proposedQuantity,
  proposedUnit
}: {
  eligibleLotCount: number;
  proposedQuantity: number | null;
  proposedUnit: string | null;
}): PantryConsumptionStockIneligibilityReason | null {
  if (proposedQuantity === null) {
    return "missing_quantity";
  }

  if (proposedUnit === null) {
    return "missing_unit";
  }

  if (eligibleLotCount === 0) {
    return "no_eligible_lot";
  }

  return null;
}

function isEligiblePantryConsumptionStockLot({
  appliedUnit,
  foodId,
  householdId,
  item
}: {
  appliedUnit: string | null;
  foodId: string;
  householdId: string;
  item: PantryConsumptionStockLot;
}) {
  return (
    item.householdId === householdId &&
    item.discardedAt === null &&
    item.foodId === foodId &&
    item.quantity !== null &&
    item.quantity > 0 &&
    normalizePantryConsumptionStockUnit(item.unit) === appliedUnit &&
    !unavailableStockStatuses.has(item.stockStatus)
  );
}

function addLotIneligibilityReason({
  appliedUnit,
  foodId,
  householdId,
  item,
  reasons
}: {
  appliedUnit: string | null;
  foodId: string;
  householdId: string;
  item: PantryConsumptionStockLot;
  reasons: Set<PantryConsumptionStockAllocationValidationReason>;
}) {
  if (
    item.householdId !== householdId ||
    item.discardedAt !== null ||
    unavailableStockStatuses.has(item.stockStatus)
  ) {
    reasons.add("inactive_lot");
  }

  if (item.foodId !== foodId) {
    reasons.add("wrong_food");
  }

  if (
    item.quantity === null ||
    item.quantity <= 0 ||
    normalizePantryConsumptionStockUnit(item.unit) !== appliedUnit
  ) {
    reasons.add("incompatible_unit");
  }
}

function comparePantryConsumptionStockLots({
  appliedQuantity,
  left,
  right
}: {
  appliedQuantity: number | null;
  left: PantryConsumptionStockLot;
  right: PantryConsumptionStockLot;
}) {
  const expirationComparison = compareNullableDates(
    left.expirationDate,
    right.expirationDate
  );

  if (expirationComparison !== 0) {
    return expirationComparison;
  }

  if (appliedQuantity !== null) {
    const leftSatisfies = (left.quantity ?? 0) >= appliedQuantity;
    const rightSatisfies = (right.quantity ?? 0) >= appliedQuantity;

    if (leftSatisfies !== rightSatisfies) {
      return leftSatisfies ? -1 : 1;
    }
  }

  if (left.quantity !== right.quantity) {
    return (
      (left.quantity ?? Number.MAX_SAFE_INTEGER) -
      (right.quantity ?? Number.MAX_SAFE_INTEGER)
    );
  }

  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  return left.id.localeCompare(right.id);
}

function compareNullableDates(first: string | null, second: string | null) {
  if (first && second) {
    return first.localeCompare(second);
  }

  if (first && !second) {
    return -1;
  }

  if (!first && second) {
    return 1;
  }

  return 0;
}

function normalizePositiveQuantity(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number.isFinite(value) && value > 0 ? value : null;
}

function quantitiesEqual(first: number, second: number) {
  return Math.abs(first - second) <= quantityTolerance;
}

function subtractQuantity(first: number, second: number) {
  const difference = first - second;
  return Math.abs(difference) <= quantityTolerance ? 0 : difference;
}
