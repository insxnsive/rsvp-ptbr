import { CheckCircle2, X, AlertCircle } from "lucide-preact";
import { useEffect } from "preact/hooks";

type ToastProps = {
  message: string;
  variant?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number;
};

export default function Toast({ message, variant = "success", onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = window.setTimeout(onDismiss, duration);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [duration, onDismiss]);

  const bgClass = variant === "success"
    ? "bg-emerald-700"
    : variant === "error"
      ? "bg-rose-700"
      : "bg-stone-900";

  const Icon = variant === "success" ? CheckCircle2 : variant === "error" ? AlertCircle : CheckCircle2;

  return (
    <div class="toast-shell animate-slide-up fixed left-1/2 z-50 -translate-x-1/2">
      <div
        class={`flex items-center gap-3 rounded-xl ${bgClass} px-4 py-3 text-white shadow-lg`}
        role={variant === "error" ? "alert" : "status"}
        aria-live={variant === "error" ? "assertive" : "polite"}
      >
        <Icon size={18} aria-hidden="true" />
        <span class="text-sm font-medium">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          class="ml-2 rounded-lg p-1 transition-colors hover:bg-white/20"
          aria-label="Fechar"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
