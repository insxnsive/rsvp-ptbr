import { useEffect, useRef } from "preact/hooks";
import { AlertTriangle, X } from "lucide-preact";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const loadingRef = useRef(loading);
  onCancelRef.current = onCancel;
  loadingRef.current = loading;

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loadingRef.current) {
        onCancelRef.current();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const confirmClass = variant === "danger"
    ? "bg-rose-700 hover:bg-rose-800"
    : "bg-amber-600 hover:bg-amber-700";

  const iconClass = variant === "danger"
    ? "bg-rose-100 text-rose-700"
    : "bg-amber-100 text-amber-700";

  return (
    <div
      class="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (!loading && e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div ref={dialogRef} class="animate-pop w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" tabindex={-1}>
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconClass}`}>
              <AlertTriangle size={20} aria-hidden="true" />
            </div>
            <h2 class="text-lg font-semibold text-stone-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            class="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p class="mt-3 text-sm text-stone-600">{description}</p>
        <div class="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            class="touch-button flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            class={`touch-button flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white ${confirmClass}`}
            disabled={loading}
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
