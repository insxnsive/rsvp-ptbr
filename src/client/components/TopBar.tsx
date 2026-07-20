import { LogOut, PartyPopper } from "lucide-preact";

export default function TopBar({
  title,
  subtitle,
  onLogout
}: {
  title: string;
  subtitle: string;
  onLogout: () => Promise<void>;
}) {
  return (
    <header class="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-xl">
      <div class="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 lg:max-w-6xl">
        <div class="min-w-0">
          <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-700">
            <PartyPopper size={15} aria-hidden="true" />
            RSVP
          </p>
          <h1 class="truncate text-lg font-semibold text-stone-950">{title}</h1>
          <p class="truncate text-xs text-stone-600">{subtitle}</p>
        </div>
        <button
          class="touch-button inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm"
          type="button"
          onClick={() => void onLogout()}
          aria-label="Sair"
        >
          <LogOut size={18} aria-hidden="true" />
          <span class="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
