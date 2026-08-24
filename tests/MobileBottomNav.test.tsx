import { render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import MobileBottomNav from "../src/client/components/MobileBottomNav.js";

describe("MobileBottomNav", () => {
  afterEach(() => window.history.pushState(null, "", "/"));

  it("preserves the URL event while event metadata is still loading", () => {
    window.history.pushState(null, "", "/rsvp?event=casamento");
    render(<MobileBottomNav currentPath="/rsvp" />);

    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(navigation).getByRole("link", { name: "Check-in" }).getAttribute("href")).toBe(
      "/rsvp-confirm?event=casamento"
    );
  });
});
