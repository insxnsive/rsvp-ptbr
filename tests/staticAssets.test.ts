import { describe, expect, it } from "vitest";
import { staticCacheControl } from "../src/server/app.js";

describe("static asset caching", () => {
  it("caches hashed Vite assets immutably", () => {
    expect(staticCacheControl("C:/app/dist/client/assets/index-abc123.js")).toBe(
      "public, max-age=31536000, immutable"
    );
  });

  it("revalidates the application shell", () => {
    expect(staticCacheControl("C:/app/dist/client/index.html")).toBe("no-cache");
  });
});
