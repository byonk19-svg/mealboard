import { describe, expect, it } from "vitest";
import { validateRecipeImportUrl } from "./validate-import-url";

describe("validateRecipeImportUrl", () => {
  it("allows normal http and https URLs", () => {
    expect(validateRecipeImportUrl("https://example.com/recipe").ok).toBe(true);
    expect(validateRecipeImportUrl("http://example.com/recipe").ok).toBe(true);
  });

  it("rejects non-http protocols and userinfo URLs", () => {
    expect(validateRecipeImportUrl("file:///etc/passwd")).toMatchObject({
      ok: false
    });
    expect(validateRecipeImportUrl("https://user:pass@example.com")).toMatchObject({
      ok: false
    });
  });

  it("rejects local and private hosts", () => {
    for (const url of [
      "http://localhost/recipe",
      "http://127.0.0.1/recipe",
      "http://10.0.0.5/recipe",
      "http://172.16.0.5/recipe",
      "http://192.168.1.20/recipe",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/recipe",
      "http://printer.local/recipe"
    ]) {
      expect(validateRecipeImportUrl(url), url).toMatchObject({ ok: false });
    }
  });

  it("rejects unsupported ports", () => {
    expect(validateRecipeImportUrl("https://example.com:444/recipe")).toMatchObject({
      ok: false
    });
  });
});
