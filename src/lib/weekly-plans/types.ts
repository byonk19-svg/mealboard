export type AdultDayType = "work_day" | "off_day";
export type WeeklyPlanStatus =
  | "draft"
  | "ready_for_grocery_review"
  | "grocery_generated"
  | "shopping_started"
  | "completed";
export type CalorieStrictness = "strict" | "flexible" | "loose";
export type WeeklyGoalType =
  | "weight_loss"
  | "high_protein"
  | "easy_week"
  | "low_effort"
  | "use_leftovers"
  | "grill_night"
  | "family_favorites"
  | "picky_eater_safe"
  | "low_prep_work_meals"
  | "baby_variety_week";

export type WeeklyPlan = {
  id: string;
  household_id: string;
  week_start_date: string;
  status: WeeklyPlanStatus;
  calorie_strictness: CalorieStrictness;
  notes: string | null;
};

export type WeeklyPlanProfileDay = {
  id: string;
  weekly_plan_id: string;
  meal_profile_id: string;
  plan_date: string;
  adult_day_type: AdultDayType | null;
  day_label: string | null;
};

export type WeeklyPlanGoal = {
  id: string;
  weekly_plan_id: string;
  meal_profile_id: string | null;
  goal: WeeklyGoalType;
};

export const adultDayTypes = ["work_day", "off_day"] as const satisfies readonly AdultDayType[];

export const weeklyGoalTypes = [
  "weight_loss",
  "high_protein",
  "easy_week",
  "low_effort",
  "use_leftovers",
  "grill_night",
  "family_favorites",
  "picky_eater_safe",
  "low_prep_work_meals",
  "baby_variety_week"
] as const satisfies readonly WeeklyGoalType[];

export function formatAdultDayType(dayType: AdultDayType) {
  const labels: Record<AdultDayType, string> = {
    off_day: "Off Day",
    work_day: "Work Day"
  };

  return labels[dayType];
}

export function formatWeeklyGoal(goal: WeeklyGoalType) {
  const labels: Record<WeeklyGoalType, string> = {
    baby_variety_week: "Baby variety week",
    easy_week: "Easy week",
    family_favorites: "Family favorites",
    grill_night: "Grill night",
    high_protein: "High protein",
    low_effort: "Low effort",
    low_prep_work_meals: "Low-prep work meals",
    picky_eater_safe: "Picky-eater safe",
    use_leftovers: "Use leftovers",
    weight_loss: "Weight loss"
  };

  return labels[goal];
}
