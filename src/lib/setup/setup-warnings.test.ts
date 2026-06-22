import { describe, expect, it } from "vitest";
import {
  getBabySetupWarning,
  getProtectedGroceryWarning,
  getRecipeSetupWarning
} from "./setup-warnings";

describe("getRecipeSetupWarning", () => {
  it("warns when no recipes exist", () => {
    expect(
      getRecipeSetupWarning({ approvedRecipeCount: 0, totalRecipeCount: 0 })
    ).toMatchObject({ title: "No recipes yet", tone: "info" });
  });

  it("warns when recipes exist but none are approved", () => {
    expect(
      getRecipeSetupWarning({ approvedRecipeCount: 0, totalRecipeCount: 3 })
    ).toMatchObject({ title: "No approved recipes", tone: "warning" });
  });

  it("returns null when at least one recipe is approved", () => {
    expect(
      getRecipeSetupWarning({ approvedRecipeCount: 1, totalRecipeCount: 3 })
    ).toBeNull();
  });
});

describe("getBabySetupWarning", () => {
  it("returns a warning for a baby profile with missing stage setup", () => {
    expect(
      getBabySetupWarning({
        hasBabyProfile: true,
        setupWarning: "Add a birthdate or stage override."
      })
    ).toMatchObject({ title: "Baby setup needs attention" });
  });

  it("returns null when baby setup is ready or missing entirely", () => {
    expect(
      getBabySetupWarning({ hasBabyProfile: true, setupWarning: null })
    ).toBeNull();
    expect(
      getBabySetupWarning({ hasBabyProfile: false, setupWarning: "Missing" })
    ).toBeNull();
  });
});

describe("getProtectedGroceryWarning", () => {
  it("warns only when protected grocery lists have pending changes", () => {
    expect(
      getProtectedGroceryWarning({
        hasChanges: true,
        status: "shopping_started"
      })
    ).toMatchObject({ title: "Grocery list is protected" });
    expect(
      getProtectedGroceryWarning({ hasChanges: true, status: "draft" })
    ).toBeNull();
    expect(
      getProtectedGroceryWarning({ hasChanges: false, status: "finalized" })
    ).toBeNull();
  });
});
