import { describe, expect, it } from "vitest";
import {
  cleanRecipeSourceAttribution,
  cleanSourceTitle,
  cleanSourceUrl
} from "./source-attribution";

describe("cleanRecipeSourceAttribution", () => {
  it("prefers the recipe name when the source title is a noisy SEO title", () => {
    expect(
      cleanRecipeSourceAttribution({
        recipeName: "Banana Bread",
        sourceTitle: "Banana Bread Recipe - Love and Lemons",
        sourceUrl:
          "https://www.loveandlemons.com/banana-bread/?utm_source=newsletter&x=1#recipe"
      })
    ).toEqual({
      sourceTitle: "Banana Bread",
      sourceUrl: "https://www.loveandlemons.com/banana-bread/?x=1"
    });
  });

  it("strips common title suffixes when the recipe name is not known", () => {
    expect(cleanSourceTitle("Easy Dinner | Example Food Site")).toBe(
      "Easy Dinner"
    );
  });

  it("drops unsupported source URL schemes and removes tracking params", () => {
    expect(cleanSourceUrl("javascript:alert(1)")).toBeNull();
    expect(
      cleanSourceUrl(
        "https://example.test/recipe?utm_medium=social&fbclid=abc&print=1"
      )
    ).toBe("https://example.test/recipe?print=1");
  });
});
