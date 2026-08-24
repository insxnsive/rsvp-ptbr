import { render, screen, waitFor, within } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/client/App.js";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState(null, "", "/");
  });

  it("shows the admin login when /rsvp is not authenticated", async () => {
    window.history.pushState(null, "", "/rsvp");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ authenticated: false }), { status: 200 }))
    );

    render(<App />);

    await waitFor(() => expect(screen.getByText("Acesso RSVP")).toBeTruthy());
  });

  it.each([
    ["/rsvp?event=casamento", "Painel", "/rsvp?event=casamento"],
    ["/rsvp-confirm?event=casamento", "Check-in", "/rsvp-confirm?event=casamento"]
  ])("shows mobile page navigation on %s and preserves the selected event", async (path, activeLabel, activeHref) => {
    window.history.pushState(null, "", path);
    const stats = {
      totalGuests: 0,
      rsvped: 0,
      checkedIn: 0,
      byGroup: {
        adulto: { total: 0, rsvped: 0, checkedIn: 0 },
        crianca: { total: 0, rsvped: 0, checkedIn: 0 }
      }
    };
    const event = {
      id: "event-1",
      eventType: "Casamento",
      name: "Casamento",
      hosts: "Ana e Bruno",
      description: "",
      startsAt: "2026-10-10T18:00:00.000Z",
      endsAt: "2026-10-11T02:00:00.000Z",
      dateTime: "2026-10-10T18:00:00.000Z",
      slug: "casamento",
      publicUrl: "https://example.com/casamento",
      stats
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/auth/session") {
          return new Response(JSON.stringify({ authenticated: true, username: "admin" }), { status: 200 });
        }
        if (url === "/api/events") {
          return new Response(JSON.stringify({ events: [event] }), { status: 200 });
        }
        return new Response(JSON.stringify({ guests: [], stats }), { status: 200 });
      })
    );

    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Navegação principal" });
    const activeLink = within(navigation).getByRole("link", { name: activeLabel });
    await waitFor(() => expect(activeLink.getAttribute("href")).toBe(activeHref));
    expect(activeLink.getAttribute("aria-current")).toBe("page");
    expect(within(navigation).getByRole("link", { name: "Painel" }).getAttribute("href")).toContain("event=casamento");
    expect(within(navigation).getByRole("link", { name: "Check-in" }).getAttribute("href")).toContain("event=casamento");
  });
});
