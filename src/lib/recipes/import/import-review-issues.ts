import type {
  RecipeImportDraft,
  RecipeImportFieldConfidence
} from "./types";

export type RecipeImportReviewIssue = {
  id: "missing_instructions" | "short_instructions";
  message: string;
  requiresAcknowledgement: boolean;
};

type RecipeImportReviewIssueInput = Pick<
  RecipeImportDraft,
  "instructions" | "warnings"
> & {
  confidence: Pick<
    RecipeImportFieldConfidence,
    "ingredients" | "instructions" | "name" | "nutrition"
  >;
};

export function getRecipeImportReviewIssues({
  confidence,
  instructions
}: RecipeImportReviewIssueInput): RecipeImportReviewIssue[] {
  const issues: RecipeImportReviewIssue[] = [];
  const instructionWordCount = instructions.trim().split(/\s+/).filter(Boolean)
    .length;

  if (confidence.instructions === "missing" || instructionWordCount === 0) {
    issues.push({
      id: "missing_instructions",
      message:
        "Instructions were not captured. Add them before saving, or acknowledge that you want to save without instructions.",
      requiresAcknowledgement: true
    });
  } else if (confidence.instructions === "low" || instructionWordCount < 3) {
    issues.push({
      id: "short_instructions",
      message:
        "Instructions look incomplete. Confirm the full method was captured before saving.",
      requiresAcknowledgement: true
    });
  }

  return issues;
}

export function requiresRecipeImportAcknowledgement(
  issues: RecipeImportReviewIssue[]
) {
  return issues.some((issue) => issue.requiresAcknowledgement);
}
