import { describe, expect, it } from "vitest";
import { generateBabyMeals } from "./generate-baby-meals";

describe("generateBabyMeals", () => {
  it("returns two empty meal slots when no routine foods are ready", () => {
    expect(generateBabyMeals([])).toEqual({
      readyFoodCount: 0,
      slots: [
        expect.objectContaining({
          foodId: null,
          foodName: null,
          label: "Baby Meal 1",
          slot: "baby_meal_1"
        }),
        expect.objectContaining({
          foodId: null,
          foodName: null,
          label: "Baby Meal 2",
          slot: "baby_meal_2"
        })
      ],
      warnings: [
        "Add tried or liked baby foods before routine baby meal suggestions."
      ]
    });
  });

  it("uses liked foods before tried foods and excludes disliked foods", () => {
    const result = generateBabyMeals([
      babyFood({ foodName: "Peas", status: "tried" }),
      babyFood({ foodName: "Banana", status: "liked" }),
      babyFood({ foodName: "Carrot", status: "disliked" })
    ]);

    expect(result.readyFoodCount).toBe(2);
    expect(result.slots).toEqual([
      expect.objectContaining({
        foodId: "banana",
        foodName: "Banana",
        status: "liked"
      }),
      expect.objectContaining({
        foodId: "peas",
        foodName: "Peas",
        status: "tried"
      })
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("rotates older liked foods first and keeps ordering deterministic", () => {
    const result = generateBabyMeals([
      babyFood({
        foodId: "yogurt-2",
        foodName: "Yogurt",
        lastOfferedOn: null,
        status: "liked"
      }),
      babyFood({
        foodId: "avocado-1",
        foodName: "Avocado",
        lastOfferedOn: "2026-06-10",
        status: "liked"
      }),
      babyFood({
        foodId: "banana-1",
        foodName: "Banana",
        lastOfferedOn: "2026-06-10",
        status: "liked"
      })
    ]);

    expect(result.slots.map((slot) => slot.foodName)).toEqual([
      "Avocado",
      "Banana"
    ]);
  });

  it("uses food id as a final tie-breaker", () => {
    const result = generateBabyMeals([
      babyFood({
        foodId: "pear-2",
        foodName: "Pear",
        lastOfferedOn: "2026-06-10",
        status: "liked"
      }),
      babyFood({
        foodId: "pear-1",
        foodName: "Pear",
        lastOfferedOn: "2026-06-10",
        status: "liked"
      })
    ]);

    expect(result.slots.map((slot) => slot.foodId)).toEqual([
      "pear-1",
      "pear-2"
    ]);
  });

  it("chooses one entry per food using the strongest usable status", () => {
    const result = generateBabyMeals([
      babyFood({
        foodId: "banana-1",
        foodName: "Banana",
        status: "tried"
      }),
      babyFood({
        foodId: "banana-1",
        foodName: "Banana",
        prepNotes: "Mashed",
        status: "liked"
      }),
      babyFood({
        foodId: "oatmeal-1",
        foodName: "Oatmeal",
        status: "tried"
      })
    ]);

    expect(result.slots).toEqual([
      expect.objectContaining({
        foodId: "banana-1",
        prepNotes: "Mashed",
        status: "liked"
      }),
      expect.objectContaining({
        foodId: "oatmeal-1",
        status: "tried"
      })
    ]);
  });

  it("does not mutate the source statuses", () => {
    const source = [
      babyFood({ foodName: "Oatmeal", status: "tried" }),
      babyFood({ foodName: "Banana", status: "liked" })
    ];
    const snapshot = structuredClone(source);

    generateBabyMeals(source);

    expect(source).toEqual(snapshot);
  });

  it("preserves prep notes and explains the suggestion", () => {
    const result = generateBabyMeals(
      [
        babyFood({
          foodName: "Sweet Potato",
          lastOfferedOn: "2026-06-12",
          notes: "Accepted at lunch",
          prepNotes: "Mashed with water",
          status: "liked"
        }),
        babyFood({ foodName: "Oatmeal", status: "tried" })
      ],
      { stageName: "Texture building" }
    );

    expect(result.slots[0]).toMatchObject({
      foodName: "Sweet Potato",
      lastOfferedOn: "2026-06-12",
      notes: "Accepted at lunch",
      prepNotes: "Mashed with water",
      reason: "Liked food already tracked for Texture building."
    });
  });

  it("warns when only one routine food is ready", () => {
    const result = generateBabyMeals([
      babyFood({ foodName: "Oatmeal", status: "tried" }),
      babyFood({ foodName: "Carrot", status: "disliked" })
    ]);

    expect(result.readyFoodCount).toBe(1);
    expect(result.slots[1]).toMatchObject({
      foodId: null,
      foodName: null,
      status: null
    });
    expect(result.warnings).toEqual([
      "Add one more tried or liked baby food to fill both routine baby meals."
    ]);
  });
});

function babyFood({
  foodId,
  foodName,
  lastOfferedOn = "2026-06-15",
  notes = null,
  prepNotes = null,
  status
}: {
  foodId?: string;
  foodName: string;
  lastOfferedOn?: string | null;
  notes?: string | null;
  prepNotes?: string | null;
  status: "tried" | "liked" | "disliked";
}) {
  return {
    food_id: foodId ?? foodName.toLowerCase().replace(/\s+/g, "-"),
    food_name: foodName,
    last_offered_on: lastOfferedOn,
    notes,
    prep_notes: prepNotes,
    status
  };
}
