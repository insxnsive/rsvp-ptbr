import { describe, expect, it } from "vitest";
import { normalizeGuestGroup, normalizeName } from "../src/shared/normalize.js";

describe("normalization", () => {
  it("normalizes names for accent-insensitive search", () => {
    expect(normalizeName("  José   da Silva! ")).toBe("jose da silva");
  });

  it("accepts adult and child group labels in Portuguese", () => {
    expect(normalizeGuestGroup("Adulto")).toBe("adulto");
    expect(normalizeGuestGroup("Criança")).toBe("crianca");
    expect(normalizeGuestGroup("Crianças")).toBe("crianca");
    expect(normalizeGuestGroup("VIP")).toBeNull();
  });
});
