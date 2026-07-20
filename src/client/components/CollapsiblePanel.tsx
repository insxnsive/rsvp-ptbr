import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { ChevronDown } from "lucide-preact";
import type { Users } from "lucide-preact";
import { useDesktopLayout } from "../hooks/useDesktopLayout.js";

export default function CollapsiblePanel({
  icon: Icon,
  title,
  summary,
  defaultOpen = false,
  className = "",
  headerAction,
  children
}: {
  icon: typeof Users;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  className?: string;
  headerAction?: ComponentChildren;
  children: ComponentChildren;
}) {
  const desktop = useDesktopLayout();
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = desktop || open;

  return (
    <section class={`soft-panel rounded-xl ${className}`}>
      <div class="hidden items-start justify-between gap-3 p-4 lg:flex">
        <div class="min-w-0">
          <h2 class="flex items-center gap-2 font-semibold text-stone-950">
            <Icon size={18} aria-hidden="true" class="text-teal-700" />
            {title}
          </h2>
          {summary ? <p class="mt-1 text-sm text-stone-600">{summary}</p> : null}
        </div>
        {headerAction}
      </div>

      <button
        class="touch-button flex w-full items-center justify-between gap-3 p-4 text-left lg:hidden"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span class="min-w-0">
          <span class="flex items-center gap-2 font-semibold text-stone-950">
            <Icon size={18} aria-hidden="true" class="text-teal-700" />
            {title}
          </span>
          {summary ? <span class="mt-1 block text-sm text-stone-600">{summary}</span> : null}
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          class={`shrink-0 text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div class={desktop ? "px-4 pb-4 pt-0" : "animate-rise border-t border-stone-200/70 px-4 pb-4 pt-4"}>{children}</div>
      ) : null}
    </section>
  );
}
