import { describe, expect, it } from "vitest";
import { generateGroceryList } from "./generate-grocery-list";

const briannaDinner = {
  id: "plan-item-1",
  displayName: "Turkey Taco Bowl",
  isApproved: true,
  mealProfileId: "profile-brianna",
  mealProfileName: "Brianna",
  mealType: "dinner",
  planDate: "2026-05-24",
  recipeId: "recipe-taco",
  recipeName: "Turkey Taco Bowl",
  scaleFactor: 2
};

const elaineDinner = {
  id: "plan-item-2",
  displayName: "Chicken Wrap",
  isApproved: true,
  mealProfileId: "profile-elaine",
  mealProfileName: "Elaine",
  mealType: "dinner",
  planDate: "2026-05-25",
  recipeId: "recipe-wrap",
  recipeName: "Chicken Wrap",
  scaleFactor: 1
};

describe("generateGroceryList", () => {
  it("expands approved weekly plan recipe ingredients and excludes unapproved plan items", () => {
    const generated = generateGroceryList({
      recipeIngredients: [
        {
          id: "ingredient-1",
          displayName: "Ground turkey",
          foodId: "food-turkey",
          groceryCategoryId: "cat-meat",
          preferredQuantityText: null,
          quantity: 1,
          recipeId: "recipe-taco",
          unit: "lb"
        },
        {
          id: "ingredient-2",
          displayName: "Tortillas",
          foodId: "food-tortillas",
          groceryCategoryId: "cat-bakery",
          preferredQuantityText: "1 pack",
          quantity: 4,
          recipeId: "recipe-wrap",
          unit: "count"
        },
        {
          id: "ingredient-3",
          displayName: "Ignored cheese",
          foodId: "food-cheese",
          groceryCategoryId: "cat-dairy",
          preferredQuantityText: null,
          quantity: 1,
          recipeId: "recipe-unapproved",
          unit: "cup"
        }
      ],
      weeklyPlanItems: [
        briannaDinner,
        elaineDinner,
        {
          id: "plan-item-3",
          displayName: "Unapproved Quesadilla",
          isApproved: false,
          mealProfileId: "profile-brianna",
          mealProfileName: "Brianna",
          mealType: "dinner",
          planDate: "2026-05-26",
          recipeId: "recipe-unapproved",
          recipeName: "Unapproved Quesadilla",
          scaleFactor: 1
        }
      ]
    });

    expect(generated.items).toEqual([
      {
        categoryId: "cat-meat",
        displayName: "Ground turkey",
        foodId: "food-turkey",
        needsReview: false,
        preferredQuantityText: null,
        quantity: 2,
        reviewReason: null,
        unit: "lb"
      },
      {
        categoryId: "cat-bakery",
        displayName: "Tortillas",
        foodId: "food-tortillas",
        needsReview: false,
        preferredQuantityText: "1 pack",
        quantity: 4,
        reviewReason: null,
        unit: "count"
      }
    ]);
    expect(generated.sources).toEqual([
      {
        groceryItemIndex: 0,
        ingredientId: "ingredient-1",
        label: "Turkey Taco Bowl for Brianna dinner on 2026-05-24",
        mealProfileId: "profile-brianna",
        mealProfileName: "Brianna",
        mealType: "dinner",
        notes: null,
        planDate: "2026-05-24",
        quantity: 2,
        recipeId: "recipe-taco",
        recipeName: "Turkey Taco Bowl",
        sourceId: "plan-item-1",
        sourceType: "meal_generated",
        unit: "lb",
        weeklyPlanItemId: "plan-item-1"
      },
      {
        groceryItemIndex: 1,
        ingredientId: "ingredient-2",
        label: "Chicken Wrap for Elaine dinner on 2026-05-25",
        mealProfileId: "profile-elaine",
        mealProfileName: "Elaine",
        mealType: "dinner",
        notes: null,
        planDate: "2026-05-25",
        quantity: 4,
        recipeId: "recipe-wrap",
        recipeName: "Chicken Wrap",
        sourceId: "plan-item-2",
        sourceType: "meal_generated",
        unit: "count",
        weeklyPlanItemId: "plan-item-2"
      }
    ]);
  });

  it("uses the consolidation utility and preserves source context across combined items", () => {
    const generated = generateGroceryList({
      recipeIngredients: [
        {
          id: "ingredient-1",
          displayName: "Shredded cheese",
          foodId: "food-cheese",
          groceryCategoryId: "cat-dairy",
          preferredQuantityText: null,
          quantity: 1,
          recipeId: "recipe-taco",
          unit: "cup"
        },
        {
          id: "ingredient-2",
          displayName: "Cheese blend",
          foodId: "food-cheese",
          groceryCategoryId: "cat-dairy",
          preferredQuantityText: "1 bag",
          quantity: 0.5,
          recipeId: "recipe-wrap",
          unit: "cup"
        }
      ],
      weeklyPlanItems: [briannaDinner, elaineDinner]
    });

    expect(generated.items).toEqual([
      {
        categoryId: "cat-dairy",
        displayName: "Shredded cheese",
        foodId: "food-cheese",
        needsReview: false,
        preferredQuantityText: "1 bag",
        quantity: 2.5,
        reviewReason: null,
        unit: "cup"
      }
    ]);
    expect(generated.sources).toHaveLength(2);
    expect(generated.sources.map((source) => source.weeklyPlanItemId)).toEqual([
      "plan-item-1",
      "plan-item-2"
    ]);
  });

  it("flags unclear units and category conflicts for review instead of guessing", () => {
    const generated = generateGroceryList({
      recipeIngredients: [
        {
          id: "ingredient-1",
          displayName: "Cheese",
          foodId: "food-cheese",
          groceryCategoryId: "cat-dairy",
          preferredQuantityText: null,
          quantity: 1,
          recipeId: "recipe-taco",
          unit: "cup"
        },
        {
          id: "ingredient-2",
          displayName: "Cheese",
          foodId: "food-cheese",
          groceryCategoryId: "cat-pantry",
          preferredQuantityText: null,
          quantity: 8,
          recipeId: "recipe-wrap",
          unit: "oz"
        },
        {
          id: "ingredient-3",
          displayName: "Salt",
          foodId: null,
          groceryCategoryId: "cat-pantry",
          preferredQuantityText: null,
          quantity: null,
          recipeId: "recipe-taco",
          unit: null
        }
      ],
      weeklyPlanItems: [briannaDinner, elaineDinner]
    });

    expect(generated.items).toEqual([
      {
        categoryId: null,
        displayName: "Cheese",
        foodId: "food-cheese",
        needsReview: true,
        preferredQuantityText: null,
        quantity: 2,
        reviewReason:
          "Incompatible units need review. Multiple categories need review.",
        unit: "cup"
      },
      {
        categoryId: null,
        displayName: "Cheese",
        foodId: "food-cheese",
        needsReview: true,
        preferredQuantityText: null,
        quantity: 8,
        reviewReason:
          "Incompatible units need review. Multiple categories need review.",
        unit: "oz"
      },
      {
        categoryId: "cat-pantry",
        displayName: "Salt",
        foodId: null,
        needsReview: true,
        preferredQuantityText: null,
        quantity: null,
        reviewReason: "Quantity or unit is missing.",
        unit: null
      }
    ]);
  });

  it("includes selected weekly staples with staple source context", () => {
    const generated = generateGroceryList({
      recipeIngredients: [],
      selectedStaples: [
        {
          defaultQuantity: 1,
          defaultUnit: "pack",
          displayName: "Paper towels",
          foodId: "food-paper-towels",
          groceryCategoryId: "cat-household",
          id: "staple-1",
          mealProfileId: null,
          mealProfileName: null,
          notes: "For the kitchen",
          preferredQuantityText: "1 pack"
        },
        {
          defaultQuantity: 2,
          defaultUnit: "cups",
          displayName: "Yogurt",
          foodId: "food-yogurt",
          groceryCategoryId: "cat-dairy",
          id: "staple-2",
          mealProfileId: "profile-brianna",
          mealProfileName: "Brianna",
          notes: null,
          preferredQuantityText: null
        }
      ],
      weeklyPlanItems: []
    });

    expect(generated.items).toEqual([
      {
        categoryId: "cat-household",
        displayName: "Paper towels",
        foodId: "food-paper-towels",
        needsReview: false,
        preferredQuantityText: "1 pack",
        quantity: 1,
        reviewReason: null,
        unit: "pack"
      },
      {
        categoryId: "cat-dairy",
        displayName: "Yogurt",
        foodId: "food-yogurt",
        needsReview: false,
        preferredQuantityText: null,
        quantity: 2,
        reviewReason: null,
        unit: "cup"
      }
    ]);
    expect(generated.sources).toEqual([
      {
        groceryItemIndex: 0,
        ingredientId: null,
        label: "Selected staple for Household",
        mealProfileId: null,
        mealProfileName: null,
        mealType: null,
        notes: "For the kitchen",
        planDate: null,
        quantity: 1,
        recipeId: null,
        recipeName: null,
        sourceId: "staple-1",
        sourceType: "staple",
        unit: "pack",
        weeklyPlanItemId: null
      },
      {
        groceryItemIndex: 1,
        ingredientId: null,
        label: "Selected staple for Brianna",
        mealProfileId: "profile-brianna",
        mealProfileName: "Brianna",
        mealType: null,
        notes: null,
        planDate: null,
        quantity: 2,
        recipeId: null,
        recipeName: null,
        sourceId: "staple-2",
        sourceType: "staple",
        unit: "cups",
        weeklyPlanItemId: null
      }
    ]);
  });

  it("includes approved baby foods as direct grocery items", () => {
    const generated = generateGroceryList({
      recipeIngredients: [],
      weeklyPlanItems: [
        {
          babyPlanSlot: "baby_meal_1",
          componentType: "baby_food",
          displayName: "Banana",
          foodId: "food-banana",
          foodName: "Banana",
          groceryCategoryId: "cat-produce",
          id: "baby-plan-item-1",
          isApproved: true,
          mealProfileId: "profile-baby",
          mealProfileName: "Baby",
          mealType: "baby_meal",
          planDate: "2026-05-24",
          recipeId: null,
          recipeName: null,
          scaleFactor: 1
        },
        {
          babyPlanSlot: "baby_meal_2",
          componentType: "baby_food",
          displayName: "Unapproved avocado",
          foodId: "food-avocado",
          foodName: "Avocado",
          groceryCategoryId: "cat-produce",
          id: "baby-plan-item-2",
          isApproved: false,
          mealProfileId: "profile-baby",
          mealProfileName: "Baby",
          mealType: "baby_meal",
          planDate: "2026-05-24",
          recipeId: null,
          recipeName: null,
          scaleFactor: 1
        }
      ]
    });

    expect(generated.items).toEqual([
      {
        categoryId: "cat-produce",
        displayName: "Banana",
        foodId: "food-banana",
        needsReview: true,
        preferredQuantityText: null,
        quantity: null,
        reviewReason: "Quantity or unit is missing.",
        unit: null
      }
    ]);
    expect(generated.sources).toEqual([
      {
        groceryItemIndex: 0,
        ingredientId: null,
        label: "Banana for Baby baby_meal on 2026-05-24",
        mealProfileId: "profile-baby",
        mealProfileName: "Baby",
        mealType: "baby_meal",
        notes: "baby_meal_1",
        planDate: "2026-05-24",
        quantity: null,
        recipeId: null,
        recipeName: null,
        sourceId: "baby-plan-item-1",
        sourceType: "baby_item",
        unit: null,
        weeklyPlanItemId: "baby-plan-item-1"
      }
    ]);
  });

  it("combines selected staples with recipe items using existing safe consolidation rules", () => {
    const generated = generateGroceryList({
      recipeIngredients: [
        {
          id: "ingredient-1",
          displayName: "Yogurt",
          foodId: "food-yogurt",
          groceryCategoryId: "cat-dairy",
          preferredQuantityText: null,
          quantity: 1,
          recipeId: "recipe-taco",
          unit: "cup"
        }
      ],
      selectedStaples: [
        {
          defaultQuantity: 2,
          defaultUnit: "cups",
          displayName: "Yogurt",
          foodId: "food-yogurt",
          groceryCategoryId: "cat-dairy",
          id: "staple-1",
          mealProfileId: "profile-brianna",
          mealProfileName: "Brianna",
          notes: null,
          preferredQuantityText: "1 tub"
        }
      ],
      weeklyPlanItems: [briannaDinner]
    });

    expect(generated.items).toEqual([
      {
        categoryId: "cat-dairy",
        displayName: "Yogurt",
        foodId: "food-yogurt",
        needsReview: false,
        preferredQuantityText: "1 tub",
        quantity: 4,
        reviewReason: null,
        unit: "cup"
      }
    ]);
    expect(generated.sources.map((source) => source.sourceType)).toEqual([
      "meal_generated",
      "staple"
    ]);
  });
});
