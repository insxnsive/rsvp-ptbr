import { render, screen, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/client/App.js";

describe("App", () => {
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
});
