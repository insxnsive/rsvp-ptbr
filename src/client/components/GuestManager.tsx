import { useCallback, useEffect, useState } from "preact/hooks";
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  FileText,
  Plus,
  ScanLine,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users
} from "lucide-preact";
import { api } from "../api.js";
import type {
  EventSummary,
  GuestForm,
  ImportPreviewResponse
} from "../types.js";
import type { EventStats, GuestGroup, GuestRecord } from "../../shared/types.js";
import CollapsiblePanel from "./CollapsiblePanel.js";
import StatCard from "./StatCard.js";
import EventFormPanel from "./EventFormPanel.js";
import GroupChips from "./GroupChips.js";
import Badge from "./ui/Badge.js";
import ConfirmDialog from "./ui/ConfirmDialog.js";
import MobileSheet from "./ui/MobileSheet.js";
import { useDesktopLayout } from "../hooks/useDesktopLayout.js";
import { apiMessage, eventEndsAt, eventStartsAt, exportGuestsCsv, formatEventWindow, getInitials, groupLabel, toInputDateTime } from "../utils.js";

const PAGE_SIZE = 50;

export default function GuestManager({
  event,
  mobileView,
  onRequestDeleteEvent,
  onEventUpdated,
  onToast
}: {
  event: EventSummary;
  mobileView?: "guests" | "event";
  onRequestDeleteEvent?: () => void;
  onEventUpdated: (event: EventSummary) => void;
  onToast: (msg: string, variant?: "success" | "error" | "info") => void;
}) {
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [stats, setStats] = useState<EventStats>(event.stats);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [group, setGroup] = useState("");
  const [guestForm, setGuestForm] = useState<GuestForm>({ name: "", group: "adulto" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deleteTarget, setDeleteTarget] = useState<GuestRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"add" | "import" | "edit" | null>(null);
  const desktop = useDesktopLayout();

  useEffect(() => {
    const term = search.trim();
    const timeout = window.setTimeout(() => setDebouncedSearch(term), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadGuests = useCallback(async (signal?: AbortSignal) => {
    const response = await api.guests(event.id, debouncedSearch, group, signal);
    setGuests(response.guests);
    setStats(response.stats);
  }, [event.id, group, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    void loadGuests(controller.signal).catch((error) => {
      if (!controller.signal.aborted) onToast(apiMessage(error), "error");
    });
    return () => controller.abort();
  }, [loadGuests, onToast]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, event.id, group]);

  async function addGuest(eventSubmit: Event) {
    eventSubmit.preventDefault();
    try {
      await api.createGuest(event.id, guestForm);
      setGuestForm({ name: "", group: "adulto" });
      await loadGuests();
      setMobileSheet(null);
      onToast("Convidado adicionado.", "success");
    } catch (error) {
      onToast(apiMessage(error), "error");
    }
  }

  async function runImport(dryRun: boolean) {
    if (!file) {
      onToast("Escolha um arquivo primeiro.", "error");
      return;
    }
    try {
      const response = await api.importGuests(event.id, file, dryRun);
      setPreview(response);
      if (!dryRun) {
        await loadGuests();
        setMobileSheet(null);
        onToast(`${response.inserted} convidados importados.`, "success");
      }
    } catch (error) {
      onToast(apiMessage(error), "error");
    }
  }

  async function deleteGuest() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await api.deleteGuest(event.id, deleteTarget.id);
      setStats(response.stats);
      await loadGuests();
      onToast("Convidado removido.", "success");
    } catch (error) {
      onToast(apiMessage(error), "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(event.publicUrl);
      onToast("Link copiado.", "success");
    } catch {
      onToast("Nao foi possivel copiar.", "error");
    }
  }

  const visibleGuests = guests.slice(0, visibleCount);
  const hasMore = guests.length > visibleCount;
  const groupCounts = {
    all: stats.totalGuests,
    adulto: stats.byGroup.adulto.total,
    crianca: stats.byGroup.crianca.total
  };

  if (!desktop && mobileView) {
    return (
      <section class="animate-rise mt-4 min-w-0" id="admin-workspace-panel" role="tabpanel">
        {mobileView === "guests" ? (
          <>
            <div class="grid grid-cols-3 gap-2">
              <StatCard icon={Users} label="Lista" value={stats.totalGuests} tone="amber" />
              <StatCard icon={CheckCircle2} label="RSVP" value={stats.rsvped} total={stats.totalGuests} tone="teal" />
              <StatCard icon={UserCheck} label="Entrada" value={stats.checkedIn} total={stats.totalGuests} tone="rose" />
            </div>

            <div class="mt-4 flex gap-2">
              <button
                class="touch-button inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-3 text-sm font-semibold text-white"
                type="button"
                onClick={() => setMobileSheet("add")}
              >
                <Plus size={18} aria-hidden="true" />
                Adicionar convidado
              </button>
              <button
                class="touch-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700"
                type="button"
                onClick={() => setMobileSheet("import")}
                aria-label="Importar lista"
              >
                <Upload size={18} aria-hidden="true" />
              </button>
            </div>

            <div class="mt-4 space-y-3">
              <label class="relative block">
                <Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
                <input
                  class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3"
                  value={search}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                  placeholder="Buscar convidado"
                />
              </label>
              <GroupChips value={group} onChange={setGroup} counts={groupCounts} />
            </div>

            <div class="mt-4 space-y-2" role="list">
              {visibleGuests.map((guest) => {
                const statusVariant = guest.checkedInAt ? "success" : guest.rsvpAt ? "info" : "default";
                const statusText = guest.checkedInAt ? "Presente" : guest.rsvpAt ? "Confirmado" : "Pendente";
                return (
                  <article class="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm" role="listitem" key={guest.id}>
                    <div class="flex min-w-0 items-center gap-3">
                      <div class={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
                        guest.group === "adulto" ? "bg-teal-600" : "bg-amber-500"
                      }`}>
                        {getInitials(guest.name)}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-stone-950">{guest.name}</p>
                        <div class="flex items-center gap-2 text-xs text-stone-500">
                          <span>{groupLabel(guest.group)}</span>
                          <Badge variant={statusVariant}>{statusText}</Badge>
                        </div>
                      </div>
                    </div>
                    <button
                      class="touch-button shrink-0 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700"
                      type="button"
                      onClick={() => setDeleteTarget(guest)}
                      aria-label={`Excluir ${guest.name}`}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
              {hasMore ? (
                <button
                  type="button"
                  class="touch-button mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700"
                  onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                >
                  Mostrar mais ({guests.length - visibleCount} restantes)
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div class="space-y-4">
            <section class="soft-panel rounded-xl p-4">
              <p class="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
                <Calendar size={14} aria-hidden="true" />
                {event.eventType}
              </p>
              <h2 class="mt-3 text-xl font-semibold text-stone-950">{event.name}</h2>
              <p class="mt-1 text-sm text-stone-600">{event.hosts}</p>
              <p class="mt-3 flex items-center gap-2 text-sm text-stone-700">
                <Clock3 size={15} aria-hidden="true" />
                {formatEventWindow(event)}
              </p>
              {event.description ? <p class="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-stone-700">{event.description}</p> : null}
            </section>

            <div class="grid grid-cols-2 gap-2">
              <button
                class="touch-button inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-semibold text-stone-700"
                type="button"
                onClick={() => void copyUrl()}
              >
                <Copy size={17} aria-hidden="true" />
                Copiar link
              </button>
              <button
                class="touch-button inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-semibold text-stone-700"
                type="button"
                onClick={() => exportGuestsCsv(guests)}
              >
                <Download size={17} aria-hidden="true" />
                Exportar CSV
              </button>
            </div>
            <a
              class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-3 py-3 text-sm font-semibold text-white"
              href={`/rsvp-confirm?event=${event.slug}`}
            >
              <ScanLine size={17} aria-hidden="true" />
              Abrir check-in
            </a>
            <button
              class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-3 text-sm font-semibold text-teal-800"
              type="button"
              onClick={() => setMobileSheet("edit")}
            >
              <FileText size={17} aria-hidden="true" />
              Editar evento
            </button>
            <button
              class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
              type="button"
              onClick={onRequestDeleteEvent}
            >
              <Trash2 size={17} aria-hidden="true" />
              Excluir evento
            </button>
          </div>
        )}

        <MobileSheet open={mobileSheet === "add"} title="Adicionar convidado" onClose={() => setMobileSheet(null)}>
          <form onSubmit={addGuest}>
            <div class="grid gap-3">
              <input
                class="rounded-xl border border-stone-200 bg-white px-3 py-3"
                value={guestForm.name}
                onInput={(e) => setGuestForm({ ...guestForm, name: e.currentTarget.value })}
                placeholder="Nome completo"
                required
              />
              <select
                class="rounded-xl border border-stone-200 bg-white px-3 py-3"
                value={guestForm.group}
                onChange={(e) => setGuestForm({ ...guestForm, group: e.currentTarget.value as GuestGroup })}
              >
                <option value="adulto">Adulto</option>
                <option value="crianca">Crianca</option>
              </select>
            </div>
            <button class="touch-button mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white">
              <Plus size={18} aria-hidden="true" />
              Adicionar
            </button>
          </form>
        </MobileSheet>

        <MobileSheet open={mobileSheet === "import"} title="Importar lista" onClose={() => setMobileSheet(null)}>
          <input
            class="w-full rounded-xl border border-dashed border-stone-300 bg-white p-3 text-sm"
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          />
          <div class="mt-3 grid grid-cols-2 gap-2">
            <button class="touch-button inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700" type="button" onClick={() => void runImport(true)}>
              <ClipboardCheck size={17} aria-hidden="true" />
              Revisar
            </button>
            <button class="touch-button inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-3 py-2 text-sm font-semibold text-white" type="button" onClick={() => void runImport(false)}>
              <Upload size={17} aria-hidden="true" />
              Importar
            </button>
          </div>
          {preview ? (
            <div class="mt-3 rounded-xl bg-white p-3 text-sm">
              <p class="font-semibold text-stone-900">{preview.validRows.length} validos · {preview.errors.length} erros · {preview.inserted} inseridos</p>
              {preview.errors.slice(0, 5).map((error) => <p class="mt-1 text-rose-700" key={`${error.rowNumber}-${error.field}`}>Linha {error.rowNumber}: {error.message}</p>)}
            </div>
          ) : null}
        </MobileSheet>

        <MobileSheet open={mobileSheet === "edit"} title="Editar evento" onClose={() => setMobileSheet(null)}>
          <EventFormPanel
            initial={{
              eventType: event.eventType,
              name: event.name,
              hosts: event.hosts,
              description: event.description,
              startsAt: toInputDateTime(eventStartsAt(event)),
              endsAt: toInputDateTime(eventEndsAt(event))
            }}
            submitLabel="Salvar evento"
            hideHeader
            onSubmit={async (form) => {
              const response = await api.updateEvent(event.id, form);
              onEventUpdated(response.event);
              setMobileSheet(null);
              onToast("Evento atualizado.", "success");
            }}
          />
        </MobileSheet>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Excluir convidado"
          description={`Tem certeza que deseja remover "${deleteTarget?.name}" da lista? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir"
          variant="danger"
          loading={deleting}
          onConfirm={() => void deleteGuest()}
          onCancel={() => setDeleteTarget(null)}
        />
      </section>
    );
  }

  return (
    <section class="animate-rise space-y-4">
      <CollapsiblePanel
        icon={Calendar}
        title="Painel do evento"
        summary={`${stats.totalGuests} convidados na lista`}
        defaultOpen
        headerAction={
          <div class="flex gap-2">
            <button
              class="touch-button inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700"
              type="button"
              onClick={() => exportGuestsCsv(guests)}
              aria-label="Exportar CSV"
            >
              <Download size={17} aria-hidden="true" />
              <span class="hidden sm:inline">CSV</span>
            </button>
            <button
              class="touch-button inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-3 py-2 text-sm font-semibold text-white"
              type="button"
              onClick={() => void copyUrl()}
            >
              <Copy size={17} aria-hidden="true" />
              Copiar link
            </button>
          </div>
        }
      >
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-2">
            <p class="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
              <Calendar size={14} aria-hidden="true" />
              {event.eventType}
            </p>
            <div>
              <h2 class="text-xl font-semibold text-stone-950">{event.name}</h2>
              <p class="text-sm text-stone-600">{event.hosts}</p>
            </div>
            <p class="inline-flex items-center gap-2 text-sm text-stone-700">
              <Clock3 size={15} aria-hidden="true" />
              {formatEventWindow(event)}
            </p>
            {event.description ? (
              <p class="max-w-2xl rounded-xl bg-amber-50 p-3 text-sm text-stone-700">{event.description}</p>
            ) : null}
          </div>
        </div>
        <div class="grid gap-2 sm:grid-cols-3">
          <StatCard icon={Users} label="Lista" value={stats.totalGuests} tone="amber" />
          <StatCard icon={CheckCircle2} label="RSVP" value={stats.rsvped} total={stats.totalGuests} tone="teal" />
          <StatCard icon={UserCheck} label="Entrada" value={stats.checkedIn} total={stats.totalGuests} tone="rose" />
        </div>
        <a
          class="touch-button mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-3 text-sm font-semibold text-teal-800"
          href={`/rsvp-confirm?event=${event.slug}`}
        >
          <ScanLine size={17} aria-hidden="true" />
          Abrir check-in
        </a>
      </CollapsiblePanel>

      <CollapsiblePanel
        icon={FileText}
        title="Editar evento"
        summary={`${event.eventType} · ${formatEventWindow(event)}`}
      >
        <EventFormPanel
          initial={{
            eventType: event.eventType,
            name: event.name,
            hosts: event.hosts,
            description: event.description,
            startsAt: toInputDateTime(eventStartsAt(event)),
            endsAt: toInputDateTime(eventEndsAt(event))
          }}
          submitLabel="Salvar evento"
          hideHeader
          onSubmit={async (form) => {
            const response = await api.updateEvent(event.id, form);
            onEventUpdated(response.event);
            onToast("Evento atualizado.", "success");
          }}
        />
      </CollapsiblePanel>

      <CollapsiblePanel icon={Plus} title="Adicionar convidado" summary="Cadastro manual">
        <form onSubmit={addGuest}>
          <div class="grid gap-3 sm:grid-cols-[1fr_150px]">
            <input
              class="rounded-xl border border-stone-200 bg-white px-3 py-3"
              value={guestForm.name}
              onInput={(e) => setGuestForm({ ...guestForm, name: e.currentTarget.value })}
              placeholder="Nome completo"
              required
            />
            <select
              class="rounded-xl border border-stone-200 bg-white px-3 py-3"
              value={guestForm.group}
              onChange={(e) =>
                setGuestForm({ ...guestForm, group: e.currentTarget.value as GuestGroup })
              }
            >
              <option value="adulto">Adulto</option>
              <option value="crianca">Crianca</option>
            </select>
          </div>
          <button class="touch-button mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white">
            <Plus size={18} aria-hidden="true" />
            Adicionar
          </button>
        </form>
      </CollapsiblePanel>

      <CollapsiblePanel icon={Upload} title="Importar lista" summary="Excel ou CSV">
        <input
          class="w-full rounded-xl border border-dashed border-stone-300 bg-white p-3 text-sm"
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
        />
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            class="touch-button inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700"
            type="button"
            onClick={() => void runImport(true)}
          >
            <ClipboardCheck size={17} aria-hidden="true" />
            Revisar
          </button>
          <button
            class="touch-button inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-3 py-2 text-sm font-semibold text-white"
            type="button"
            onClick={() => void runImport(false)}
          >
            <Upload size={17} aria-hidden="true" />
            Importar
          </button>
        </div>
        {preview ? (
          <div class="mt-3 rounded-xl bg-white p-3 text-sm">
            <p class="font-semibold text-stone-900">
              {preview.validRows.length} validos · {preview.errors.length} erros · {preview.inserted} inseridos
            </p>
            {preview.errors.slice(0, 5).map((error) => (
              <p class="mt-1 text-rose-700" key={`${error.rowNumber}-${error.field}`}>
                Linha {error.rowNumber}: {error.message}
              </p>
            ))}
          </div>
        ) : null}
      </CollapsiblePanel>

      <CollapsiblePanel
        icon={Users}
        title="Lista de convidados"
        summary={search.trim() ? `${guests.length} resultados` : `${stats.totalGuests} convidados`}
        defaultOpen
      >
        <div class="space-y-3">
          <label class="relative block">
            <Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
            <input
              class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3"
              value={search}
              onInput={(e) => setSearch(e.currentTarget.value)}
              placeholder="Buscar convidado"
            />
          </label>
          <GroupChips value={group} onChange={setGroup} counts={groupCounts} />
        </div>
        <div
          class="mt-4 max-h-[52dvh] space-y-2 overflow-y-auto overscroll-contain pr-1 lg:max-h-[calc(100dvh-24rem)]"
          role="list"
        >
          {visibleGuests.map((guest) => {
            const statusVariant = guest.checkedInAt ? "success" : guest.rsvpAt ? "info" : "default";
            const statusText = guest.checkedInAt ? "Presente" : guest.rsvpAt ? "Confirmado" : "Pendente";
            return (
              <article class="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm" role="listitem" key={guest.id}>
                <div class="flex min-w-0 items-center gap-3">
                  <div class={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
                    guest.group === "adulto" ? "bg-teal-600" : "bg-amber-500"
                  }`}>
                    {getInitials(guest.name)}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-stone-950">{guest.name}</p>
                    <div class="flex items-center gap-2 text-xs text-stone-500">
                      <span>{groupLabel(guest.group)}</span>
                      <Badge variant={statusVariant}>{statusText}</Badge>
                    </div>
                  </div>
                </div>
                <button
                  class="touch-button shrink-0 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700"
                  type="button"
                  onClick={() => setDeleteTarget(guest)}
                  aria-label={`Excluir ${guest.name}`}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </article>
            );
          })}
          {hasMore ? (
            <button
              type="button"
              class="touch-button mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Mostrar mais ({guests.length - visibleCount} restantes)
            </button>
          ) : null}
        </div>
      </CollapsiblePanel>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir convidado"
        description={`Tem certeza que deseja remover "${deleteTarget?.name}" da lista? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={() => void deleteGuest()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
