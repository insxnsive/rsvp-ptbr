import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scanner = vi.hoisted(() => ({
  decode: vi.fn(),
  resolveControls: undefined as ((controls: { stop: () => void }) => void) | undefined,
  stop: vi.fn()
}));

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class {
    decodeFromConstraints(...args: unknown[]) {
      return scanner.decode(...args);
    }
  }
}));

vi.mock("@zxing/library", () => ({
  NotFoundException: class NotFoundException extends Error {}
}));

import ScannerPanel from "../src/client/components/ScannerPanel.js";

describe("ScannerPanel", () => {
  beforeEach(() => {
    scanner.stop.mockReset();
    scanner.resolveControls = undefined;
    scanner.decode.mockReset();
    scanner.decode.mockImplementation(
      () => new Promise<{ stop: () => void }>((resolve) => {
        scanner.resolveControls = resolve;
      })
    );
  });

  it("stops camera controls that resolve after the scanner closes", async () => {
    const { unmount } = render(<ScannerPanel active onScan={() => undefined} onClose={() => undefined} />);
    await waitFor(() => expect(scanner.decode).toHaveBeenCalledOnce());

    unmount();
    scanner.resolveControls?.({ stop: scanner.stop });

    await waitFor(() => expect(scanner.stop).toHaveBeenCalledOnce());
  });

  it("traps forward focus navigation inside the scanner dialog", async () => {
    render(<ScannerPanel active onScan={() => undefined} onClose={() => undefined} />);
    const close = await screen.findByRole("button", { name: "Fechar scanner" });
    close.focus();

    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(close);
  });
});
