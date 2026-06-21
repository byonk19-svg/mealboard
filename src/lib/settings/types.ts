import type { FoodPreferenceLevel } from "@/lib/preferences/evaluate-recipe-for-profile";
import type { BabyFoodStatus } from "@/lib/settings/baby-food-statuses";
import type { StapleFrequency } from "@/lib/settings/staples";

export type { BabyFoodStatus };
export type { FoodPreferenceLevel };
export type { StapleFrequency };

export type ProfileType = "adult" | "baby" | "shared" | "household";

export type MealProfile = {
  id: string;
  household_id: string;
  name: string;
  profile_type: ProfileType;
  color_label: string | null;
  birthdate: string | null;
  baby_stage_override_months: number | null;
  default_daily_calorie_target: number | null;
  work_day_calorie_target: number | null;
  off_day_calorie_target: number | null;
  notes: string | null;
  sort_order: number;
};

export type Food = {
  id: string;
  household_id: string;
  name: string;
  default_unit: string | null;
  default_grocery_category_id: string | null;
};

export type FoodPreference = {
  id: string;
  household_id: string;
  meal_profile_id: string;
  food_id: string;
  preference: FoodPreferenceLevel;
  notes: string | null;
  prep_notes: string | null;
  meal_profile_name: string;
  food_name: string;
};

export type BabyFoodStatusEntry = {
  baby_profile_id: string;
  food_id: string;
  food_name: string;
  household_id: string;
  id: string;
  last_offered_on: string | null;
  notes: string | null;
  prep_notes: string | null;
  status: BabyFoodStatus;
};

export type Staple = {
  active: boolean;
  default_quantity: number | null;
  default_unit: string | null;
  display_name: string;
  food_id: string | null;
  food_name: string | null;
  frequency: StapleFrequency;
  grocery_category_id: string | null;
  grocery_category_name: string | null;
  household_id: string;
  id: string;
  meal_profile_id: string | null;
  meal_profile_name: string | null;
  notes: string | null;
  preferred_quantity_text: string | null;
};

export const preferenceLevels = [
  "love",
  "like",
  "okay",
  "dislike",
  "hard_no",
  "allergy"
] as const satisfies readonly FoodPreferenceLevel[];

export function formatPreferenceLevel(level: FoodPreferenceLevel) {
  const labels: Record<FoodPreferenceLevel, string> = {
    love: "Love",
    like: "Like",
    okay: "Okay",
    dislike: "Dislike",
    hard_no: "Hard No",
    allergy: "Allergy"
  };

  return labels[level];
}

export function formatProfileType(type: ProfileType) {
  const labels: Record<ProfileType, string> = {
    adult: "Adult",
    baby: "Baby",
    shared: "Shared/Family",
    household: "Household"
  };

  return labels[type];
}
