import { describe, expect, it } from "vitest";
import type { Staple } from "../settings/types";
import { groupStaplesForWeeklyReview } from "./staples-review";

const baseStaple: Staple = {
  active: true,
  default_quantity: null,
  default_unit: null,
  display_name: "Milk",
  food_id: null,
  food_name: null,
  frequency: "weekly",
  grocery_category_id: null,
  grocery_category_name: null,
  household_id: "household-1",
  id: "staple-1",
  meal_profile_id: null,
  meal_profile_name: null,
  notes: null,
  preferred_quantity_text: null
};

describe("groupStaplesForWeeklyReview", () => {
  it("groups active staples by household/profile context with selected state", () => {
    const grouped = groupStaplesForWeeklyReview(
      [
        baseStaple,
        {
          ...baseStaple,
          display_name: "Yogurt",
          id: "staple-2",
          meal_profile_id: "profile-1",
          meal_profile_name: "Brianna"
        },
        {
          ...baseStaple,
          active: false,
          display_name: "Old crackers",
          id: "staple-3"
        }
      ],
      new Set(["staple-2"])
    );

    expect(grouped).toEqual([
      {
        contextLabel: "Household",
        staples: [
          expect.objectContaining({
            display_name: "Milk",
            id: "staple-1",
            selected: false
          })
        ]
      },
      {
        contextLabel: "Brianna",
        staples: [
          expect.objectContaining({
            display_name: "Yogurt",
            id: "staple-2",
            selected: true
          })
        ]
      }
    ]);
  });
});
