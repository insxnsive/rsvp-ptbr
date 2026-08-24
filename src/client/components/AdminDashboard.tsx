import { useCallback, useEffect, useState } from "preact/hooks";
import { Calendar, ChevronDown, Heart, List, Plus, Settings2, Trash2 } from "lucide-preact";
import { api } from "../api.js";
import type { EventSummary } from "../types.js";
import CollapsiblePanel from "./CollapsiblePanel.js";
import EventFormPanel from "./EventFormPanel.js";
import GuestManager from "./GuestManager.js";
import TopBar from "./TopBar.js";
import Toast from "./ui/Toast.js";
import ConfirmDialog from "./ui/ConfirmDialog.js";
import MobileSheet from "./ui/MobileSheet.js";
import MobileBottomNav from "./MobileBottomNav.js";
import { useEventSelection } from "../hooks/useEventSelection.js";
import { useDesktopLayout } from "../hooks/useDesktopLayout.js";
import { apiMessage, formatEventWindow } from "../utils.js";

export default function AdminDashboard({ logout }: { logout: () => Promise<void> }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);
  const [deleteEventOpen, setDeleteEventOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [mobileView, setMobileView] = useState<"guests" | "event">("guests");
  const [mobileSheet, setMobileSheet] = useState<"events" | "create" | null>(null);
  const desktop = useDesktopLayout();

  const dismissToast = useCallback(() => setToast(null), []);

  const { selected, setSelectedId, initialSlug } = useEventSelection(events, "/rsvp");

  const showToast = useCallback((message: string, variant: "success" | "error" | "info" = "success") => {
    setToast({ message, variant });
  }, []);

  async function loadEvents() {
    const response = await api.events();
    setEvents(response.events);
    const direct = response.events.find((event) => event.slug === initialSlug);
    const nextSelected = direct?.id ?? response.events[0]?.id ?? "";
    setSelectedId(nextSelected);
  }

  useEffect(() => {
    void loadEvents().catch((error) => showToast(apiMessage(error), "error"));
  }, []);

  async function handleDeleteEvent() {
    if (!selected) return;
    setDeletingEvent(true);
    try {
      await api.deleteEvent(selected.id);
      const nextEvents = events.filter((event) => event.id !== selected.id);
      setEvents(nextEvents);
      const nextSelected = nextEvents[0];
      setSelectedId(nextSelected?.id ?? "");
      showToast("Evento removido.", "success");
    } catch (error) {
      showToast(apiMessage(error), "error");
    } finally {
      setDeletingEvent(false);
      setDeleteEventOpen(false);
    }
  }

  return (
    <>
      <TopBar title="Administracao" subtitle="Eventos, convidados e links publicos" onLogout={logout} />
      <main class="mobile-nav-space mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[360px_1fr]">
        <aside class="hidden space-y-4 lg:block">
          <CollapsiblePanel icon={Calendar} title="Novo evento" summary="Crie um link publico para compartilhar" defaultOpen>
            <EventFormPanel
              submitLabel="Criar evento"
              hideHeader
              onSubmit={async (form) => {
                const response = await api.createEvent(form);
                setEvents((current) => [response.event, ...current]);
                setSelectedId(response.event.id);
                showToast("Evento criado.", "success");
              }}
            />
          </CollapsiblePanel>
          <CollapsiblePanel icon={Calendar} title="Eventos" summary={`${events.length} cadastrados`} defaultOpen>
            <div class="space-y-2">
              {events.map((event) => (
                <button
                  class={`touch-button w-full rounded-xl border p-3 text-left ${
                    selected?.id === event.id ? "border-teal-300 bg-teal-50" : "border-stone-200 bg-white"
                  }`}
                  type="button"
                  key={event.id}
                  onClick={() => setSelectedId(event.id)}
                >
                  <p class="truncate font-semibold text-stone-950">{event.name}</p>
                  <p class="text-xs text-stone-500">{formatEventWindow(event)}</p>
                  <p class="mt-1 text-xs text-stone-400">
                    {event.stats.totalGuests} convidados · {event.stats.rsvped} confirmados
                  </p>
                </button>
              ))}
            </div>
          </CollapsiblePanel>
        </aside>
        <div class="min-w-0">
          {!desktop ? (
            <section class="glass-control rounded-xl p-3">
              <div class="flex items-center justify-between gap-2">
                <button
                  class="touch-button min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-left"
                  type="button"
                  onClick={() => setMobileSheet("events")}
                  aria-label="Trocar evento"
                >
                  <span class="block truncate text-sm font-semibold text-stone-950">{selected?.name ?? "Selecione um evento"}</span>
                  <span class="mt-0.5 block truncate text-xs text-stone-500">
                    {selected ? formatEventWindow(selected) : "Crie ou escolha um evento"}
                  </span>
                </button>
                <button
                  class="touch-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700"
                  type="button"
                  onClick={() => setMobileSheet("events")}
                  aria-label="Trocar evento"
                >
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <button
                  class="touch-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white"
                  type="button"
                  onClick={() => setMobileSheet("create")}
                  aria-label="Criar evento"
                >
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
              {selected ? (
                <div class="mt-3 grid grid-cols-2 gap-2" role="tablist" aria-label="Area de trabalho">
                  <button
                    class={`touch-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                      mobileView === "guests" ? "bg-teal-700 text-white" : "bg-white text-stone-700"
                    }`}
                    type="button"
                    role="tab"
                    id="admin-guests-tab"
                    aria-controls="admin-workspace-panel"
                    aria-selected={mobileView === "guests"}
                    onClick={() => setMobileView("guests")}
                  >
                    <List size={17} aria-hidden="true" />
                    Convidados
                  </button>
                  <button
                    class={`touch-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                      mobileView === "event" ? "bg-teal-700 text-white" : "bg-white text-stone-700"
                    }`}
                    type="button"
                    role="tab"
                    id="admin-event-tab"
                    aria-controls="admin-workspace-panel"
                    aria-selected={mobileView === "event"}
                    onClick={() => setMobileView("event")}
                  >
                    <Settings2 size={17} aria-hidden="true" />
                    Evento
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
          {selected ? (
            <div class="space-y-3">
              {desktop ? (
                <button
                  class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
                  type="button"
                  onClick={() => setDeleteEventOpen(true)}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  Excluir evento
                </button>
              ) : null}
              <GuestManager
                event={selected}
                mobileView={desktop ? undefined : mobileView}
                onRequestDeleteEvent={() => setDeleteEventOpen(true)}
                onEventUpdated={(updated) =>
                  setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)))
                }
                onToast={showToast}
              />
            </div>
          ) : (
            <section class="soft-panel rounded-2xl p-6 text-center">
              <Heart class="mx-auto text-teal-700" size={30} aria-hidden="true" />
              <p class="mt-2 font-semibold">Crie o primeiro evento.</p>
            </section>
          )}
        </div>
      </main>
      <MobileBottomNav currentPath="/rsvp" eventSlug={selected?.slug} />

      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onDismiss={dismissToast} />
      ) : null}

      <MobileSheet open={mobileSheet === "events"} title="Eventos" onClose={() => setMobileSheet(null)}>
        <div class="space-y-2">
          {events.map((event) => (
            <button
              class={`touch-button w-full rounded-xl border p-3 text-left ${
                selected?.id === event.id ? "border-teal-300 bg-teal-50" : "border-stone-200 bg-white"
              }`}
              type="button"
              key={event.id}
              onClick={() => {
                setSelectedId(event.id);
                setMobileSheet(null);
                setMobileView("guests");
              }}
            >
              <p class="truncate font-semibold text-stone-950">{event.name}</p>
              <p class="mt-1 text-xs text-stone-500">{formatEventWindow(event)}</p>
              <p class="mt-1 text-xs text-stone-400">{event.stats.totalGuests} convidados</p>
            </button>
          ))}
          <button
            class="touch-button mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white"
            type="button"
            onClick={() => setMobileSheet("create")}
          >
            <Plus size={18} aria-hidden="true" />
            Criar evento
          </button>
        </div>
      </MobileSheet>

      <MobileSheet open={mobileSheet === "create"} title="Novo evento" onClose={() => setMobileSheet(null)}>
        <EventFormPanel
          submitLabel="Criar evento"
          hideHeader
          onSubmit={async (form) => {
            const response = await api.createEvent(form);
            setEvents((current) => [response.event, ...current]);
            setSelectedId(response.event.id);
            setMobileView("guests");
            setMobileSheet(null);
            showToast("Evento criado.", "success");
          }}
        />
      </MobileSheet>

      <ConfirmDialog
        open={deleteEventOpen}
        title="Excluir evento"
        description={`Tem certeza que deseja excluir "${selected?.name}"? Todos os convidados e dados associados serao perdidos.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deletingEvent}
        onConfirm={() => void handleDeleteEvent()}
        onCancel={() => setDeleteEventOpen(false)}
      />
    </>
  );
}
