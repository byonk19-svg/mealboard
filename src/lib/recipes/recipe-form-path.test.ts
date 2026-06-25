import { describe, expect, it } from "vitest";
import {
  buildRecipeMessagePath,
  resolveRecipeFormReturnPath
} from "./recipe-form-path";

describe("resolveRecipeFormReturnPath", () => {
  it("allows recipe creation and import review paths", () => {
    expect(resolveRecipeFormReturnPath("/recipes/new", "/recipes")).toBe(
      "/recipes/new"
    );
    expect(resolveRecipeFormReturnPath("/recipes/import", "/recipes")).toBe(
      "/recipes/import"
    );
    expect(
      resolveRecipeFormReturnPath(
        "/recipes/import/review?source=extension&draft=mealboard-recipe-draft%3A1",
        "/recipes"
      )
    ).toBe(
      "/recipes/import/review?source=extension&draft=mealboard-recipe-draft%3A1"
    );
  });

  it("rejects unsafe or unrelated return paths", () => {
    for (const path of [
      "https://example.com/recipes/import",
      "//example.com/recipes/import",
      "/recipes",
      "/settings",
      "/login?returnTo=/recipes/import",
      "recipes/import",
      ""
    ]) {
      expect(resolveRecipeFormReturnPath(path, "/recipes/new")).toBe(
        "/recipes/new"
      );
    }
  });
});

describe("buildRecipeMessagePath", () => {
  it("adds messages to paths that already have import review query params", () => {
    expect(
      buildRecipeMessagePath(
        "/recipes/import/review?source=extension&draft=mealboard-recipe-draft%3A1",
        "Review ingredient 1 before saving."
      )
    ).toBe(
      "/recipes/import/review?source=extension&draft=mealboard-recipe-draft%3A1&message=Review+ingredient+1+before+saving."
    );
  });

  it("replaces stale message params before redirecting again", () => {
    expect(
      buildRecipeMessagePath(
        "/recipes/import/review?source=extension&draft=abc&message=Old",
        "New message"
      )
    ).toBe(
      "/recipes/import/review?source=extension&draft=abc&message=New+message"
    );
  });
});
