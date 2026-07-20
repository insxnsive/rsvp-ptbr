import { lazy, Suspense } from "preact/compat";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  List,
  QrCode,
  RotateCcw,
  Search,
  Settings2,
  UserCheck,
  Users
} from "lucide-preact";
import { api, ApiError } from "../api.js";
import type { EventSummary, GuestsResponse } from "../types.js";
import type { EventStats, GuestRecord } from "../../shared/types.js";
import CollapsiblePanel from "./CollapsiblePanel.js";
import StatCard from "./StatCard.js";
import TopBar from "./TopBar.js";
import Toast from "./ui/Toast.js";
import MobileSheet from "./ui/MobileSheet.js";
import GroupChips from "./GroupChips.js";
import { emptyStats, formatEventWindow, formatRelativeTime, getInitials, groupLabel } from "../utils.js";
import { useEventSelection } from "../hooks/useEventSelection.js";
import { useDesktopLayout } from "../hooks/useDesktopLayout.js";

const ScannerPanel = lazy(() => import("./ScannerPanel.js"));

export default function CheckinDashboard({ logout }: { logout: () => Promise<void> }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [stats, setStats] = useState<EventStats>(emptyStats);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [group, setGroup] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "event">("list");
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const [scanFlash, setScanFlash] = useState<{ guestId: string; type: "success" | "error" } | null>(null);
  const scanTimerRef = useRef(0);
  const lastScanAtRef = useRef(0);

  const { selected, selectedId, setSelectedId, initialSlug } = useEventSelection(events, "/rsvp-confirm");
  const desktop = useDesktopLayout();

  useEffect(() => {
    api.events()
      .then((response) => {
        setEvents(response.events);
        const direct = response.events.find((event) => event.slug === initialSlug);
        setSelectedId(direct?.id ?? response.events[0]?.id ?? "");
      })
      .catch((error) => setToast({ message: error instanceof ApiError ? error.message : "Erro ao carregar.", variant: "error" }));
  }, []);

  useEffect(() => {
    const term = search.trim();
    const timeout = window.setTimeout(() => setDebouncedSearch(term), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadGuests = useCallback(async () => {
    if (!selectedId) return;
    const response: GuestsResponse = await api.guests(selectedId, debouncedSearch, group);
    const sorted = [...response.guests].sort((a, b) => {
      if (a.checkedInAt && b.checkedInAt) return b.checkedInAt.localeCompare(a.checkedInAt);
      if (a.checkedInAt) return -1;
      if (b.checkedInAt) return 1;
      return a.name.localeCompare(b.name);
    });
    setGuests(sorted);
    setStats(response.stats);
  }, [group, debouncedSearch, selectedId]);

  useEffect(() => {
    void loadGuests().catch((error) => setToast({ message: error instanceof ApiError ? error.message : "Erro.", variant: "error" }));
  }, [loadGuests]);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleCheckin(guest: GuestRecord) {
    if (!selectedId || togglingId) return;
    setTogglingId(guest.id);
    try {
      const response = guest.checkedInAt
        ? await api.undoCheckin(selectedId, guest.id)
        : await api.manualCheckin(selectedId, guest.id);
      setStats(response.stats);
      setToast({
        message: guest.checkedInAt ? "Entrada desfeita." : response.duplicate ? "Entrada ja registrada." : "Entrada registrada.",
        variant: guest.checkedInAt ? "info" : response.duplicate ? "error" : "success"
      });
      await loadGuests();
    } catch (error) {
      setToast({ message: error instanceof ApiError ? error.message : "Erro.", variant: "error" });
    } finally {
      setTogglingId(null);
    }
  }

  const scan = useCallback(
    async (token: string) => {
      if (!selectedId) return;
      const now = Date.now();
      if (now - lastScanAtRef.current < 1400) return;
      lastScanAtRef.current = now;
      try {
        const response = await api.qrCheckin(selectedId, token);
        setStats(response.stats);
        setScanFlash({ guestId: response.guest.id, type: response.duplicate ? "error" : "success" });
        window.clearTimeout(scanTimerRef.current);
        scanTimerRef.current = window.setTimeout(() => setScanFlash(null), 1200);
        setToast({
          message: response.duplicate ? "QRCode ja utilizado." : `Entrada: ${response.guest.name}`,
          variant: response.duplicate ? "error" : "success"
        });
        setScannerActive(false);
        await loadGuests();
      } catch (error) {
        setScanFlash({ guestId: "", type: "error" });
        window.clearTimeout(scanTimerRef.current);
        scanTimerRef.current = window.setTimeout(() => setScanFlash(null), 1200);
        setToast({ message: error instanceof ApiError ? error.message : "Erro no QR.", variant: "error" });
      }
    },
    [loadGuests, selectedId]
  );

  const percent = stats.totalGuests > 0 ? Math.round((stats.checkedIn / stats.totalGuests) * 100) : 0;
  const groupCounts = {
    all: stats.totalGuests,
    adulto: stats.byGroup.adulto.total,
    crianca: stats.byGroup.crianca.total
  };

  const guestRows = guests.map((guest) => (
    <article
      class={`flex items-center justify-between gap-3 rounded-xl p-3 shadow-sm transition-colors ${
        scanFlash && scanFlash.guestId === guest.id
          ? scanFlash.type === "success"
            ? "animate-pulse bg-emerald-100 ring-2 ring-emerald-400"
            : "animate-pulse bg-rose-100 ring-2 ring-rose-400"
          : guest.checkedInAt
            ? "bg-emerald-50"
            : "bg-white"
      }`}
      key={guest.id}
    >
      <div class="flex min-w-0 items-center gap-3">
        <div class={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
          guest.group === "adulto" ? "bg-teal-600" : "bg-amber-500"
        }`}>
          {getInitials(guest.name)}
        </div>
        <div class="min-w-0">
          <p class="truncate font-semibold text-stone-950">{guest.name}</p>
          <p class="text-xs text-stone-500">
            {groupLabel(guest.group)} · {guest.rsvpAt ? "Confirmado" : "Sem RSVP"} · {" "}
            {guest.checkedInAt ? formatRelativeTime(guest.checkedInAt) : "Aguardando"}
          </p>
        </div>
      </div>
      <button
        class={`touch-button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
          guest.checkedInAt ? "border border-emerald-200 bg-white text-emerald-700" : "bg-teal-700 text-white"
        }`}
        type="button"
        onClick={() => void toggleCheckin(guest)}
      >
        {guest.checkedInAt ? <RotateCcw size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
        {guest.checkedInAt ? "Desfazer" : "Entrou"}
      </button>
    </article>
  ));

  return (
    <>
      <TopBar title="Check-in" subtitle="Busca, filtros, confirmacao manual e QRCode" onLogout={logout} />
      <main class="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[360px_1fr]">
        <aside class="hidden space-y-4 lg:block">
          <a
            class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm"
            href={selected ? `/rsvp?event=${selected.slug}` : "/rsvp"}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Voltar ao painel
          </a>

          <CollapsiblePanel
            icon={Calendar}
            title="Evento atual"
            summary={selected ? selected.name : "Selecione um evento"}
            defaultOpen
          >
            <label class="block text-sm font-medium text-stone-700">
              Evento
              <select
                class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
                value={selectedId}
                onChange={(e) => setSelectedId(e.currentTarget.value)}
              >
                {events.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            {selected ? (
              <div class="mt-4 rounded-xl bg-white p-3 shadow-sm">
                <p class="font-semibold text-stone-950">{selected.name}</p>
                <p class="mt-1 text-xs text-stone-500">{formatEventWindow(selected)}</p>
                <div class="mt-3 grid gap-2 sm:grid-cols-3">
                  <StatCard icon={Users} label="Lista" value={stats.totalGuests} tone="amber" />
                  <StatCard icon={CheckCircle2} label="RSVP" value={stats.rsvped} total={stats.totalGuests} tone="teal" />
                  <StatCard icon={UserCheck} label="Entrada" value={stats.checkedIn} total={stats.totalGuests} tone="rose" />
                </div>
              </div>
            ) : null}
          </CollapsiblePanel>

          <CollapsiblePanel icon={QrCode} title="Scanner QR" summary="Leitura em tela cheia">
            <button
              class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white"
              type="button"
              onClick={() => setScannerActive(true)}
            >
              <QrCode size={18} aria-hidden="true" />
              Abrir scanner
            </button>
          </CollapsiblePanel>
        </aside>
        <div class="min-w-0">
          {!desktop ? (
            <section class="soft-panel rounded-xl p-3">
              <div class="flex items-center justify-between gap-2">
                <button
                  class="touch-button min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-left"
                  type="button"
                  onClick={() => setEventPickerOpen(true)}
                >
                  <span class="block truncate text-sm font-semibold text-stone-950">{selected?.name ?? "Selecione um evento"}</span>
                  <span class="mt-0.5 block truncate text-xs text-stone-500">{selected ? formatEventWindow(selected) : "Escolha um evento"}</span>
                </button>
                <button class="touch-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700" type="button" onClick={() => setEventPickerOpen(true)} aria-label="Trocar evento">
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2" role="tablist" aria-label="Area de check-in">
                <button class={`touch-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${mobileView === "list" ? "bg-teal-700 text-white" : "bg-white text-stone-700"}`} type="button" role="tab" aria-selected={mobileView === "list"} onClick={() => setMobileView("list")}>
                  <List size={17} aria-hidden="true" />
                  Entrada
                </button>
                <button class={`touch-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${mobileView === "event" ? "bg-teal-700 text-white" : "bg-white text-stone-700"}`} type="button" role="tab" aria-selected={mobileView === "event"} onClick={() => setMobileView("event")}>
                  <Settings2 size={17} aria-hidden="true" />
                  Evento
                </button>
              </div>
            </section>
          ) : null}

          {!desktop ? (
            <section class="animate-rise mt-4 min-w-0" role="tabpanel">
              {mobileView === "list" ? (
                <>
                  <div class="grid grid-cols-3 gap-2">
                    <StatCard icon={Users} label="Lista" value={stats.totalGuests} tone="amber" />
                    <StatCard icon={CheckCircle2} label="RSVP" value={stats.rsvped} total={stats.totalGuests} tone="teal" />
                    <StatCard icon={UserCheck} label="Entrada" value={stats.checkedIn} total={stats.totalGuests} tone="rose" />
                  </div>
                  <button class="touch-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white" type="button" onClick={() => setScannerActive(true)}>
                    <QrCode size={18} aria-hidden="true" />
                    Abrir scanner QR
                  </button>
                  <div class="mt-4 space-y-3">
                    <label class="relative block">
                      <Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
                      <input class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3" value={search} onInput={(e) => setSearch(e.currentTarget.value)} placeholder="Buscar nome" />
                    </label>
                    <GroupChips value={group} onChange={setGroup} counts={groupCounts} />
                  </div>
                  <div class="mt-4 max-h-[48dvh] space-y-2 overflow-y-auto overscroll-contain pr-1" role="list">
                    {guestRows}
                  </div>
                </>
              ) : (
                <div class="space-y-4">
                  <section class="soft-panel rounded-xl p-4">
                    <p class="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800"><Calendar size={14} aria-hidden="true" />{selected?.eventType ?? "Evento"}</p>
                    <h2 class="mt-3 text-xl font-semibold text-stone-950">{selected?.name ?? "Evento"}</h2>
                    {selected ? <p class="mt-1 text-sm text-stone-600">{formatEventWindow(selected)}</p> : null}
                  </section>
                  <button class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white" type="button" onClick={() => setScannerActive(true)}>
                    <QrCode size={18} aria-hidden="true" />
                    Abrir scanner QR
                  </button>
                  <a class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700" href={selected ? `/rsvp?event=${selected.slug}` : "/rsvp"}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    Voltar ao painel
                  </a>
                </div>
              )}
            </section>
          ) : (
            <CollapsiblePanel icon={ClipboardCheck} title="Lista de entrada" summary={search.trim() ? `${guests.length} resultados` : `${stats.checkedIn} de ${stats.totalGuests} presentes`} defaultOpen>
              {stats.totalGuests > 0 ? (
                <div class="mb-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                  <div class="flex items-center justify-between"><div><p class="text-2xl font-bold text-stone-950">{stats.checkedIn}<span class="text-sm font-normal text-stone-500">/{stats.totalGuests}</span></p><p class="text-sm text-stone-600">Presentes</p></div><p class="text-3xl font-bold text-teal-700">{percent}%</p></div>
                  <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/80"><div class="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${percent}%` }} /></div>
                </div>
              ) : null}
              <div class="mb-4"><h2 class="text-lg font-semibold text-stone-950">{selected?.name ?? "Evento"}</h2>{selected ? <p class="text-sm text-stone-600">{formatEventWindow(selected)}</p> : null}</div>
              <div class="space-y-3"><label class="relative block"><Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" /><input class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3" value={search} onInput={(e) => setSearch(e.currentTarget.value)} placeholder="Buscar nome" /></label><GroupChips value={group} onChange={setGroup} counts={groupCounts} /></div>
              <div class="mt-4 max-h-[52dvh] space-y-2 overflow-y-auto overscroll-contain pr-1 lg:max-h-[calc(100dvh-24rem)]" role="list">{guestRows}</div>
            </CollapsiblePanel>
          )}
        </div>
      </main>

      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onDismiss={dismissToast} />
      ) : null}
      <Suspense fallback={null}>
        <ScannerPanel active={scannerActive} onScan={scan} onClose={() => setScannerActive(false)} />
      </Suspense>
      <MobileSheet open={eventPickerOpen} title="Eventos" onClose={() => setEventPickerOpen(false)}>
        <div class="space-y-2">
          {events.map((event) => (
            <button class={`touch-button w-full rounded-xl border p-3 text-left ${selected?.id === event.id ? "border-teal-300 bg-teal-50" : "border-stone-200 bg-white"}`} type="button" key={event.id} onClick={() => { setSelectedId(event.id); setEventPickerOpen(false); setMobileView("list"); }}>
              <p class="truncate font-semibold text-stone-950">{event.name}</p>
              <p class="mt-1 text-xs text-stone-500">{formatEventWindow(event)}</p>
            </button>
          ))}
        </div>
      </MobileSheet>
    </>
  );
}
