import { describe, expect, it } from "vitest";
import { suggestBabyTryThis } from "./suggest-baby-try-this";

describe("suggestBabyTryThis", () => {
  it("waits for stage setup before showing a candidate", () => {
    const result = suggestBabyTryThis({
      foods: [food("avocado-1", "Avocado")],
      stageReady: false,
      statuses: []
    });

    expect(result).toEqual({
      availableFoodCount: 0,
      candidate: null,
      warning: "Add baby's stage setup before showing Try This ideas."
    });
  });

  it("suggests one untracked food at a time", () => {
    const result = suggestBabyTryThis({
      foods: [
        food("banana-1", "Banana"),
        food("avocado-1", "Avocado"),
        food("carrot-1", "Carrot")
      ],
      statuses: [
        status("banana-1", "liked"),
        status("carrot-1", "disliked")
      ]
    });

    expect(result).toEqual({
      availableFoodCount: 1,
      candidate: {
        foodId: "avocado-1",
        foodName: "Avocado",
        reason: "Untracked food to consider separately from routine meals."
      },
      warning: null
    });
  });

  it("treats disliked foods as already tracked", () => {
    const result = suggestBabyTryThis({
      foods: [food("carrot-1", "Carrot")],
      statuses: [status("carrot-1", "disliked")]
    });

    expect(result.candidate).toBeNull();
    expect(result.warning).toBe("Add more foods before showing a Try This idea.");
  });

  it("excludes blocked baby-profile foods", () => {
    const result = suggestBabyTryThis({
      blockedFoodIds: ["avocado-1"],
      foods: [food("avocado-1", "Avocado"), food("banana-1", "Banana")],
      statuses: []
    });

    expect(result.candidate?.foodId).toBe("banana-1");
    expect(result.availableFoodCount).toBe(1);
  });

  it("ignores duplicate statuses for the same tracked food", () => {
    const result = suggestBabyTryThis({
      foods: [food("banana-1", "Banana"), food("avocado-1", "Avocado")],
      statuses: [
        status("banana-1", "tried"),
        status("banana-1", "liked")
      ]
    });

    expect(result.candidate?.foodId).toBe("avocado-1");
    expect(result.availableFoodCount).toBe(1);
  });

  it("counts duplicate food rows once", () => {
    const result = suggestBabyTryThis({
      foods: [
        food("avocado-1", "Avocado"),
        food("avocado-1", "Avocado"),
        food("banana-1", "Banana")
      ],
      statuses: [status("banana-1", "tried")]
    });

    expect(result.candidate?.foodId).toBe("avocado-1");
    expect(result.availableFoodCount).toBe(1);
  });

  it("returns an empty state when all foods are already tracked", () => {
    const result = suggestBabyTryThis({
      foods: [food("banana-1", "Banana")],
      statuses: [status("banana-1", "tried")]
    });

    expect(result).toEqual({
      availableFoodCount: 0,
      candidate: null,
      warning: "Add more foods before showing a Try This idea."
    });
  });

  it("keeps ordering deterministic by food name then id", () => {
    const result = suggestBabyTryThis({
      foods: [
        food("pear-2", "Pear"),
        food("pear-1", "Pear"),
        food("apple-1", "Apple")
      ],
      statuses: [status("apple-1", "tried")]
    });

    expect(result.candidate?.foodId).toBe("pear-1");
  });

  it("does not mutate source foods or statuses", () => {
    const input = {
      foods: [food("banana-1", "Banana"), food("avocado-1", "Avocado")],
      statuses: [status("banana-1", "liked")]
    };
    const snapshot = structuredClone(input);

    suggestBabyTryThis(input);

    expect(input).toEqual(snapshot);
  });
});

function food(id: string, name: string) {
  return { id, name };
}

function status(
  foodId: string,
  statusValue: "tried" | "liked" | "disliked"
) {
  return { food_id: foodId, status: statusValue };
}
