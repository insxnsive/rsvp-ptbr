import { render, screen } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import MobileSheet from "../src/client/components/ui/MobileSheet.js";

describe("MobileSheet", () => {
  it("keeps the focused field stable when its parent rerenders", () => {
    const { rerender } = render(
      <MobileSheet open title="Adicionar convidado" onClose={() => undefined}>
        <input aria-label="Nome" />
      </MobileSheet>
    );
    const input = screen.getByRole("textbox", { name: "Nome" });
    input.focus();

    rerender(
      <MobileSheet open title="Adicionar convidado" onClose={() => undefined}>
        <input aria-label="Nome" />
      </MobileSheet>
    );

    expect(document.activeElement).toBe(input);
  });
});
