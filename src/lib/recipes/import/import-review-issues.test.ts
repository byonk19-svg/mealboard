import { describe, expect, it } from "vitest";
import { getRecipeImportReviewIssues } from "./import-review-issues";

describe("getRecipeImportReviewIssues", () => {
  it("requires acknowledgement when imported instructions are missing", () => {
    expect(
      getRecipeImportReviewIssues({
        confidence: {
          ingredients: "high",
          instructions: "missing",
          name: "high",
          nutrition: "missing"
        },
        instructions: "",
        warnings: ["Recipe instructions were not found."]
      })
    ).toEqual([
      {
        id: "missing_instructions",
        message:
          "Instructions were not captured. Add them before saving, or acknowledge that you want to save without instructions.",
        requiresAcknowledgement: true
      }
    ]);
  });

  it("requires acknowledgement when imported instructions look too short", () => {
    expect(
      getRecipeImportReviewIssues({
        confidence: {
          ingredients: "high",
          instructions: "low",
          name: "high",
          nutrition: "missing"
        },
        instructions: "Stir.",
        warnings: []
      })
    ).toEqual([
      {
        id: "short_instructions",
        message:
          "Instructions look incomplete. Confirm the full method was captured before saving.",
        requiresAcknowledgement: true
      }
    ]);
  });

  it("keeps complete high-confidence imports out of the acknowledgement flow", () => {
    expect(
      getRecipeImportReviewIssues({
        confidence: {
          ingredients: "high",
          instructions: "high",
          name: "high",
          nutrition: "medium"
        },
        instructions: "Cook the rice.\n\nTop with chicken.",
        warnings: []
      })
    ).toEqual([]);
  });
});
