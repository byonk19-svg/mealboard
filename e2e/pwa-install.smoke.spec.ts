import { expect, test } from "@playwright/test";

test.describe("PWA install metadata", () => {
  test("serves a manifest and install icons", async ({ request }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);

    const manifest = await manifestResponse.json();
    expect(manifest).toMatchObject({
      display: "standalone",
      name: "MealBoard",
      short_name: "MealBoard",
      start_url: "/dashboard"
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sizes: "192x192",
          src: "/icons/icon-192.png",
          type: "image/png"
        }),
        expect.objectContaining({
          sizes: "512x512",
          src: "/icons/icon-512.png",
          type: "image/png"
        })
      ])
    );

    const iconResponse = await request.get("/icons/icon-192.png");
    expect(iconResponse.ok()).toBe(true);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  });
});
