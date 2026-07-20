import { createPortal } from "preact/compat";
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { X } from "lucide-preact";

type MobileSheetProps = {
  open: boolean;
  title: string;
  children: ComponentChildren;
  onClose: () => void;
};

export default function MobileSheet({ open, title, children, onClose }: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      class="animate-fade fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm lg:hidden"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={sheetRef}
        class="animate-sheet max-h-[90dvh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl"
        tabindex={-1}
      >
        <div class="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <h2 class="text-base font-semibold text-stone-950">{title}</h2>
          <button
            class="touch-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div class="max-h-[calc(90dvh-68px)] overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}