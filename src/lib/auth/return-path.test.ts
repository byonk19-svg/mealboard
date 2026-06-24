import { describe, expect, it } from "vitest";
import { resolveLoginReturnPath } from "./return-path";

describe("resolveLoginReturnPath", () => {
  it("allows app-relative paths with query strings", () => {
    expect(
      resolveLoginReturnPath(
        "/recipes/import/review?source=extension&draft=mealboard-recipe-draft%3A1"
      )
    ).toBe(
      "/recipes/import/review?source=extension&draft=mealboard-recipe-draft%3A1"
    );
  });

  it("rejects external, protocol-relative, login, and malformed paths", () => {
    for (const path of [
      "https://example.com/dashboard",
      "//example.com/dashboard",
      "/login",
      "/login/",
      "/login?returnTo=/dashboard",
      "dashboard",
      ""
    ]) {
      expect(resolveLoginReturnPath(path)).toBe("/dashboard");
    }
  });
});
