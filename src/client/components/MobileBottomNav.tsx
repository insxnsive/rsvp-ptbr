import { ClipboardList, ScanLine } from "lucide-preact";

type AdminPath = "/rsvp" | "/rsvp-confirm";

type MobileBottomNavProps = {
  currentPath: AdminPath;
  eventSlug?: string;
};

function adminHref(path: AdminPath, eventSlug?: string): string {
  return eventSlug ? `${path}?event=${encodeURIComponent(eventSlug)}` : path;
}

function currentEventSlug(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("event") ?? undefined;
}

const destinations = [
  { path: "/rsvp" as const, label: "Painel", icon: ClipboardList },
  { path: "/rsvp-confirm" as const, label: "Check-in", icon: ScanLine }
];

export default function MobileBottomNav({ currentPath, eventSlug }: MobileBottomNavProps) {
  const preservedEventSlug = eventSlug ?? currentEventSlug();
  return (
    <div class="mobile-bottom-shell lg:hidden">
      <nav class="glass-nav mobile-bottom-nav" aria-label="Navegação principal">
        {destinations.map(({ path, label, icon: Icon }) => {
          const active = currentPath === path;
          return (
            <a
              class={`touch-button mobile-bottom-link ${active ? "mobile-bottom-link-active" : ""}`}
              href={adminHref(path, preservedEventSlug)}
              aria-current={active ? "page" : undefined}
              key={path}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
