import type { Staple } from "../settings/types";

export type WeeklyStapleReviewItem = Staple & {
  selected: boolean;
};

export type WeeklyStapleReviewGroup = {
  contextLabel: string;
  staples: WeeklyStapleReviewItem[];
};

export function groupStaplesForWeeklyReview(
  staples: Staple[],
  selectedStapleIds: ReadonlySet<string>
): WeeklyStapleReviewGroup[] {
  const groups = new Map<string, WeeklyStapleReviewItem[]>();

  staples
    .filter((staple) => staple.active)
    .forEach((staple) => {
      const contextLabel = staple.meal_profile_name ?? "Household";
      const existingStaples = groups.get(contextLabel) ?? [];
      groups.set(contextLabel, [
        ...existingStaples,
        {
          ...staple,
          selected: selectedStapleIds.has(staple.id)
        }
      ]);
    });

  return Array.from(groups.entries()).map(([contextLabel, groupStaples]) => ({
    contextLabel,
    staples: groupStaples
  }));
}
