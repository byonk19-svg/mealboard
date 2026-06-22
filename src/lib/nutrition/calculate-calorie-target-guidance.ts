import type { DailyNutritionSummary } from "@/lib/nutrition/calculate-daily-totals";
import type { MealProfile } from "@/lib/settings/types";
import type {
  AdultDayType,
  CalorieStrictness,
  WeeklyPlanProfileDay
} from "@/lib/weekly-plans/types";

export type CalorieGuidanceStatus =
  | "guidance_only"
  | "near"
  | "over"
  | "under"
  | "unknown";

export type CalorieGuidanceTone = "caution" | "neutral" | "ok";

export type CalorieTargetGuidance = {
  calorieTarget: number;
  date: string;
  difference: number | null;
  mealProfileId: string;
  status: CalorieGuidanceStatus;
  tone: CalorieGuidanceTone;
};

export function calculateCalorieTargetGuidance({
  profileDays,
  profiles,
  strictness,
  summaries
}: {
  profileDays: WeeklyPlanProfileDay[];
  profiles: MealProfile[];
  strictness: CalorieStrictness;
  summaries: DailyNutritionSummary[];
}): CalorieTargetGuidance[] {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const dayTypesByProfileDay = new Map(
    profileDays.map((day) => [
      getCalorieGuidanceKey(day.meal_profile_id, day.plan_date),
      day.adult_day_type
    ])
  );

  return summaries.flatMap((summary) => {
    const profile = profilesById.get(summary.mealProfileId);
    const dayType =
      dayTypesByProfileDay.get(
        getCalorieGuidanceKey(summary.mealProfileId, summary.date)
      ) ?? null;
    const calorieTarget = profile ? resolveCalorieTarget(profile, dayType) : null;

    if (calorieTarget === null) {
      return [];
    }

    return [
      {
        calorieTarget,
        date: summary.date,
        difference:
          summary.calories === null
            ? null
            : Math.round(summary.calories - calorieTarget),
        mealProfileId: summary.mealProfileId,
        ...resolveGuidanceStatus(summary.calories, calorieTarget, strictness)
      }
    ];
  });
}

export type CalorieTargetGuidanceSummary = {
  guidanceOnlyCount: number;
  nearCount: number;
  overCount: number;
  underCount: number;
  unknownCount: number;
};

export function summarizeCalorieTargetGuidance(
  guidance: CalorieTargetGuidance[]
): CalorieTargetGuidanceSummary {
  return guidance.reduce<CalorieTargetGuidanceSummary>(
    (summary, item) => {
      if (item.status === "guidance_only") {
        summary.guidanceOnlyCount += 1;
      } else if (item.status === "near") {
        summary.nearCount += 1;
      } else if (item.status === "over") {
        summary.overCount += 1;
      } else if (item.status === "under") {
        summary.underCount += 1;
      } else if (item.status === "unknown") {
        summary.unknownCount += 1;
      }

      return summary;
    },
    {
      guidanceOnlyCount: 0,
      nearCount: 0,
      overCount: 0,
      underCount: 0,
      unknownCount: 0
    }
  );
}

export function getCalorieGuidanceKey(mealProfileId: string, date: string) {
  return `${mealProfileId}:${date}`;
}

function resolveCalorieTarget(
  profile: MealProfile,
  dayType: AdultDayType | null
) {
  if (dayType === "work_day" && profile.work_day_calorie_target !== null) {
    return profile.work_day_calorie_target;
  }

  if (dayType === "off_day" && profile.off_day_calorie_target !== null) {
    return profile.off_day_calorie_target;
  }

  return profile.default_daily_calorie_target;
}

function resolveGuidanceStatus(
  calories: number | null,
  calorieTarget: number,
  strictness: CalorieStrictness
): {
  status: CalorieGuidanceStatus;
  tone: CalorieGuidanceTone;
} {
  if (calories === null) {
    return { status: "unknown", tone: "caution" };
  }

  if (strictness === "loose") {
    return { status: "guidance_only", tone: "neutral" };
  }

  const threshold = strictness === "strict" ? 0.1 : 0.2;
  const lowerBound = calorieTarget * (1 - threshold);
  const upperBound = calorieTarget * (1 + threshold);

  if (calories < lowerBound) {
    return { status: "under", tone: "caution" };
  }

  if (calories > upperBound) {
    return { status: "over", tone: "caution" };
  }

  return { status: "near", tone: "ok" };
}
