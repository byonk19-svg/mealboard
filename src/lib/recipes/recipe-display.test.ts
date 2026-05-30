import { describe, expect, it } from "vitest";
import {
  getRecipeApprovalDisplay,
  getRecipeNutritionDisplay
} from "./recipe-display";

describe("getRecipeNutritionDisplay", () => {
  it("formats per-serving calorie, protein, and confidence labels", () => {
    expect(
      getRecipeNutritionDisplay({
        estimated_calories_per_serving: 430,
        estimated_protein_grams_per_serving: 22,
        nutrition_confidence: "medium"
      })
    ).toEqual({
      caloriesLabel: "430 cal/serving",
      confidenceLabel: "Medium confidence",
      isComplete: true,
      missingFields: [],
      proteinLabel: "22g protein/serving",
      statusLabel: "Nutrition estimate ready"
    });
  });

  it("keeps missing calories and protein visible without treating them as zero", () => {
    expect(
      getRecipeNutritionDisplay({
        estimated_calories_per_serving: null,
        estimated_protein_grams_per_serving: null,
        nutrition_confidence: null
      })
    ).toEqual({
      caloriesLabel: "Missing calories",
      confidenceLabel: "No confidence set",
      isComplete: false,
      missingFields: ["calories", "protein"],
      proteinLabel: "Missing protein",
      statusLabel: "Needs nutrition estimate"
    });
  });
});

describe("getRecipeApprovalDisplay", () => {
  it("summarizes approved planning profiles in entered order", () => {
    expect(
      getRecipeApprovalDisplay([
        approval("Brianna", true),
        approval("Elaine", false),
        approval("Shared/Family", true)
      ])
    ).toEqual({
      approvedProfileNames: ["Brianna", "Shared/Family"],
      hasApprovedProfiles: true,
      summaryLabel: "Approved for Brianna, Shared/Family"
    });
  });

  it("makes missing planning approvals easy to notice", () => {
    expect(getRecipeApprovalDisplay([approval("Brianna", false)])).toEqual({
      approvedProfileNames: [],
      hasApprovedProfiles: false,
      summaryLabel: "No planning approvals yet"
    });
  });
});

function approval(mealProfileName: string, approvedForPlanning: boolean) {
  return {
    approved_for_planning: approvedForPlanning,
    meal_profile_name: mealProfileName
  };
}
