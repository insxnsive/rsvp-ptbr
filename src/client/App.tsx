import { lazy, Suspense } from "preact/compat";
import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Copy,
  Filter,
  FileText,
  Heart,
  Link,
  LoaderCircle,
  Lock,
  LogOut,
  PartyPopper,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users
} from "lucide-preact";
import { api, ApiError } from "./api.js";
import QrCodeCard from "./components/QrCodeCard.js";
import type {
  ConfirmResponse,
  EventForm,
  EventSummary,
  GuestForm,
  GuestsResponse,
  ImportPreviewResponse,
  PublicEvent,
  PublicGuestsResponse,
  SessionResponse
} from "./types.js";
import type { EventStats, GuestGroup, GuestRecord, PublicGuest } from "../shared/types.js";

const ScannerPanel = lazy(() => import("./components/ScannerPanel.js"));

const EVENT_TYPE_OPTIONS = [
  "Casamento",
  "Festa",
  "Despedida de Solteiro",
  "Aniversario",
  "Cha de Bebe",
  "Cha Bar",
  "Formatura",
  "Batizado",
  "Noivado",
  "Jantar"
] as const;

const emptyStats: EventStats = {
  totalGuests: 0,
  rsvped: 0,
  checkedIn: 0,
  byGroup: {
    adulto: { total: 0, rsvped: 0, checkedIn: 0 },
    crianca: { total: 0, rsvped: 0, checkedIn: 0 }
  }
};

function groupLabel(group: GuestGroup): string {
  return group === "adulto" ? "Adulto" : "Crianca";
}

function eventStartsAt(event: { startsAt?: string; dateTime?: string }): string {
  return event.startsAt ?? event.dateTime ?? "";
}

function eventEndsAt(event: { endsAt?: string; startsAt?: string; dateTime?: string }): string {
  return event.endsAt ?? event.startsAt ?? event.dateTime ?? "";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatEventWindow(event: { startsAt?: string; endsAt?: string; dateTime?: string }): string {
  const startsAt = eventStartsAt(event);
  const endsAt = eventEndsAt(event);
  if (!startsAt) {
    return "Data pendente";
  }
  const sameMoment = startsAt === endsAt;
  if (sameMoment) {
    return formatDate(startsAt);
  }
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    const day = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(startDate);
    const startTime = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(startDate);
    const endTime = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(endDate);
    return `${day} · ${startTime} ate ${endTime}`;
  }
  return `${formatDate(startsAt)} ate ${formatDate(endsAt)}`;
}

function toInputDateTime(value?: string): string {
  return value ? value.slice(0, 16) : "";
}

function plusHours(value: string, hours: number): string {
  const date = new Date(value);
  date.setHours(date.getHours() + hours);
  return date.toISOString().slice(0, 16);
}

function todayLocalValue(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function makeDefaultEventForm(): EventForm {
  const startsAt = todayLocalValue();
  return {
    eventType: "Casamento",
    name: "",
    hosts: "",
    description: "",
    startsAt,
    endsAt: plusHours(startsAt, 4)
  };
}

function apiMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Algo saiu do esperado.";
}

function eventQueryValue(): string {
  return new URLSearchParams(window.location.search).get("event") ?? "";
}

function setEventQuery(pathname: string, slug?: string): void {
  const url = slug ? `${pathname}?event=${slug}` : pathname;
  window.history.replaceState(null, "", url);
}

function LoginPanel({ onAuthenticated }: { onAuthenticated: (session: SessionResponse) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: Event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const session = await api.login(username.trim(), password);
      onAuthenticated(session);
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main class="mx-auto grid min-h-screen w-full max-w-md place-items-center px-4 py-8">
      <form class="soft-panel animate-rise w-full rounded-xl p-5" onSubmit={submit}>
        <div class="mb-5 flex items-center gap-3">
          <div class="grid h-12 w-12 place-items-center rounded-xl bg-teal-100 text-teal-700">
            <Lock size={22} aria-hidden="true" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-stone-950">Acesso RSVP</h1>
            <p class="text-sm text-stone-600">Area administrativa protegida.</p>
          </div>
        </div>
        <label class="mb-3 block text-sm font-medium text-stone-700">
          Usuario
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-950 shadow-sm"
            autocomplete="username"
            value={username}
            onInput={(currentEvent) => setUsername(currentEvent.currentTarget.value)}
            required
          />
        </label>
        <label class="mb-4 block text-sm font-medium text-stone-700">
          Senha
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-stone-950 shadow-sm"
            type="password"
            autocomplete="current-password"
            value={password}
            onInput={(currentEvent) => setPassword(currentEvent.currentTarget.value)}
            required
          />
        </label>
        <button
          class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? <LoaderCircle class="animate-spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
          Entrar
        </button>
        {message ? <p class="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}
      </form>
    </main>
  );
}

function ProtectedPage({
  children
}: {
  children: (props: { logout: () => Promise<void> }) => ComponentChildren;
}) {
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    api.session().then(setSession).catch(() => setSession({ authenticated: false }));
  }, []);

  async function logout() {
    await api.logout();
    setSession({ authenticated: false });
  }

  if (!session) {
    return (
      <main class="grid min-h-screen place-items-center">
        <LoaderCircle class="animate-spin text-teal-700" size={28} aria-hidden="true" />
      </main>
    );
  }

  if (!session.authenticated) {
    return <LoginPanel onAuthenticated={setSession} />;
  }

  return <>{children({ logout })}</>;
}

function TopBar({
  title,
  subtitle,
  onLogout
}: {
  title: string;
  subtitle: string;
  onLogout: () => Promise<void>;
}) {
  return (
    <header class="sticky top-0 z-20 border-b border-stone-200/70 bg-amber-50/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
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

function useDesktopLayout(minWidth = 1024): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && "matchMedia" in window ? window.matchMedia(`(min-width: ${minWidth}px)`).matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return undefined;
    }
    const query = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [minWidth]);

  return desktop;
}

function CollapsiblePanel({
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

function StatCard({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "teal" | "amber" | "rose";
}) {
  const toneClasses = {
    teal: "border-teal-200 bg-linear-to-br from-white via-teal-50 to-cyan-50",
    amber: "border-amber-200 bg-linear-to-br from-white via-amber-50 to-orange-50",
    rose: "border-rose-200 bg-linear-to-br from-white via-rose-50 to-pink-50"
  } as const;

  return (
    <div class={`rounded-xl border p-3 shadow-sm ${toneClasses[tone]}`}>
      <div class="flex items-center gap-2 text-xs font-medium text-stone-600">
        <Icon size={15} aria-hidden="true" />
        {label}
      </div>
      <p class="mt-1 text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function EventFormPanel({
  initial,
  submitLabel,
  hideHeader = false,
  onSubmit
}: {
  initial?: EventForm;
  submitLabel: string;
  hideHeader?: boolean;
  onSubmit: (form: EventForm) => Promise<void>;
}) {
  const [form, setForm] = useState<EventForm>(initial ?? makeDefaultEventForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initial) {
      setForm(initial);
    }
  }, [initial]);

  async function submit(event: Event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSubmit(form);
      if (!initial) {
        setForm(makeDefaultEventForm());
      }
    } catch (error) {
      setMessage(apiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form class={hideHeader ? "" : "soft-panel rounded-xl p-4"} onSubmit={submit}>
      {hideHeader ? null : (
        <div class="mb-3 flex items-center gap-2">
          <Calendar size={18} aria-hidden="true" class="text-teal-700" />
          <h2 class="font-semibold text-stone-950">{submitLabel}</h2>
        </div>
      )}
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-sm font-medium text-stone-700">
          Tipo de evento
          <select
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            value={form.eventType}
            onChange={(currentEvent) => setForm({ ...form, eventType: currentEvent.currentTarget.value })}
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label class="block text-sm font-medium text-stone-700">
          Quem celebra
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            value={form.hosts}
            onInput={(currentEvent) => setForm({ ...form, hosts: currentEvent.currentTarget.value })}
            placeholder="Ex.: Ana e Bruno"
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700 sm:col-span-2">
          Nome do evento
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            value={form.name}
            onInput={(currentEvent) => setForm({ ...form, name: currentEvent.currentTarget.value })}
            placeholder="Ex.: Ana e Bruno"
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700">
          Inicio
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            type="datetime-local"
            value={form.startsAt}
            onInput={(currentEvent) => setForm({ ...form, startsAt: currentEvent.currentTarget.value })}
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700">
          Fim
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            type="datetime-local"
            value={form.endsAt}
            onInput={(currentEvent) => setForm({ ...form, endsAt: currentEvent.currentTarget.value })}
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700 sm:col-span-2">
          Descricao
          <textarea
            class="mt-1 min-h-28 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            value={form.description}
            onInput={(currentEvent) => setForm({ ...form, description: currentEvent.currentTarget.value })}
            placeholder="Mensagem, regras da entrada, traje, local ou contexto do evento."
          />
        </label>
      </div>
      <button
        class="touch-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
        type="submit"
        disabled={saving}
      >
        {saving ? <LoaderCircle class="animate-spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
        {submitLabel}
      </button>
      {message ? <p class="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}
    </form>
  );
}

function GuestManager({
  event,
  onEventUpdated
}: {
  event: EventSummary;
  onEventUpdated: (event: EventSummary) => void;
}) {
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [stats, setStats] = useState<EventStats>(event.stats);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [guestForm, setGuestForm] = useState<GuestForm>({ name: "", group: "adulto" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [message, setMessage] = useState("");

  const loadGuests = useCallback(async () => {
    const response = await api.guests(event.id, search, group);
    setGuests(response.guests);
    setStats(response.stats);
  }, [event.id, group, search]);

  useEffect(() => {
    void loadGuests().catch((error) => setMessage(apiMessage(error)));
  }, [loadGuests]);

  async function addGuest(eventSubmit: Event) {
    eventSubmit.preventDefault();
    setMessage("");
    try {
      const response = await api.createGuest(event.id, guestForm);
      setGuestForm({ name: "", group: "adulto" });
      setStats(response.stats);
      await loadGuests();
    } catch (error) {
      setMessage(apiMessage(error));
    }
  }

  async function runImport(dryRun: boolean) {
    if (!file) {
      setMessage("Escolha um arquivo primeiro.");
      return;
    }
    setMessage("");
    try {
      const response = await api.importGuests(event.id, file, dryRun);
      setPreview(response);
      if (!dryRun) {
        await loadGuests();
      }
    } catch (error) {
      setMessage(apiMessage(error));
    }
  }

  async function deleteGuest(guestId: string) {
    setMessage("");
    try {
      const response = await api.deleteGuest(event.id, guestId);
      setStats(response.stats);
      await loadGuests();
      setMessage("Convidado removido.");
    } catch (error) {
      setMessage(apiMessage(error));
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(event.publicUrl);
    setMessage("Link copiado.");
  }

  return (
    <section class="animate-rise space-y-4">
      <CollapsiblePanel
        icon={Calendar}
        title="Painel do evento"
        summary={`${stats.totalGuests} convidados na lista`}
        defaultOpen
        headerAction={
          <button
            class="touch-button inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-3 py-2 text-sm font-semibold text-white"
            type="button"
            onClick={() => void copyUrl()}
          >
            <Copy size={17} aria-hidden="true" />
            Copiar link
          </button>
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
          <StatCard icon={CheckCircle2} label="RSVP" value={stats.rsvped} tone="teal" />
          <StatCard icon={UserCheck} label="Entrada" value={stats.checkedIn} tone="rose" />
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
            setMessage("Evento atualizado.");
          }}
        />
      </CollapsiblePanel>

      <CollapsiblePanel icon={Plus} title="Adicionar convidado" summary="Cadastro manual">
        <form onSubmit={addGuest}>
          <div class="grid gap-3 sm:grid-cols-[1fr_150px]">
            <input
              class="rounded-xl border border-stone-200 bg-white px-3 py-3"
              value={guestForm.name}
              onInput={(currentEvent) => setGuestForm({ ...guestForm, name: currentEvent.currentTarget.value })}
              placeholder="Nome completo"
              required
            />
            <select
              class="rounded-xl border border-stone-200 bg-white px-3 py-3"
              value={guestForm.group}
              onChange={(currentEvent) =>
                setGuestForm({ ...guestForm, group: currentEvent.currentTarget.value as GuestGroup })
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

      <CollapsiblePanel icon={Upload} title="Importar lista" summary="Excel, XLS ou CSV">
        <input
          class="w-full rounded-xl border border-dashed border-stone-300 bg-white p-3 text-sm"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(currentEvent) => setFile(currentEvent.currentTarget.files?.[0] ?? null)}
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
        <div class="grid gap-2 sm:grid-cols-[1fr_160px]">
          <label class="relative">
            <Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
            <input
              class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3"
              value={search}
              onInput={(currentEvent) => setSearch(currentEvent.currentTarget.value)}
              placeholder="Buscar convidado"
            />
          </label>
          <label class="relative">
            <Filter class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
            <select
              class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3"
              value={group}
              onChange={(currentEvent) => setGroup(currentEvent.currentTarget.value)}
            >
              <option value="">Todos</option>
              <option value="adulto">Adultos</option>
              <option value="crianca">Criancas</option>
            </select>
          </label>
        </div>
        <div class="mt-4 space-y-2">
          {guests.map((guest) => (
            <article class="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm" key={guest.id}>
              <div class="min-w-0">
                <p class="truncate font-semibold text-stone-950">{guest.name}</p>
                <p class="text-xs text-stone-500">
                  {groupLabel(guest.group)} · {guest.rsvpAt ? "Confirmado" : "Pendente"} ·{" "}
                  {guest.checkedInAt ? "Entrou" : "Aguardando"}
                </p>
              </div>
              <button
                class="touch-button shrink-0 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700"
                type="button"
                onClick={() => void deleteGuest(guest.id)}
                aria-label={`Excluir ${guest.name}`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </CollapsiblePanel>
      {message ? <p class="rounded-xl bg-white p-3 text-sm text-stone-700 shadow-sm">{message}</p> : null}
    </section>
  );
}

function AdminDashboard({ logout }: { logout: () => Promise<void> }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const initialSlug = useMemo(() => eventQueryValue(), []);

  const selected = events.find((event) => event.id === selectedId) ?? events[0];

  useEffect(() => {
    if (selected?.slug) {
      setEventQuery("/rsvp", selected.slug);
    }
  }, [selected?.slug]);

  async function loadEvents() {
    const response = await api.events();
    setEvents(response.events);
    const direct = response.events.find((event) => event.slug === initialSlug);
    const nextSelected = direct?.id ?? response.events[0]?.id ?? "";
    setSelectedId(nextSelected);
  }

  useEffect(() => {
    void loadEvents().catch((error) => setMessage(apiMessage(error)));
  }, []);

  return (
    <>
      <TopBar title="Administracao" subtitle="Eventos, convidados e links publicos" onLogout={logout} />
      <main class="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[360px_1fr]">
        <aside class="space-y-4">
          <CollapsiblePanel icon={Calendar} title="Novo evento" summary="Crie um link publico para compartilhar" defaultOpen>
            <EventFormPanel
              submitLabel="Criar evento"
              hideHeader
              onSubmit={async (form) => {
                const response = await api.createEvent(form);
                setEvents((current) => [response.event, ...current]);
                setSelectedId(response.event.id);
                setEventQuery("/rsvp", response.event.slug);
                setMessage("Evento criado.");
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
                  onClick={() => {
                    setSelectedId(event.id);
                    setEventQuery("/rsvp", event.slug);
                  }}
                >
                  <p class="truncate font-semibold text-stone-950">{event.name}</p>
                  <p class="text-xs text-stone-500">{formatEventWindow(event)}</p>
                </button>
              ))}
            </div>
          </CollapsiblePanel>
        </aside>
        <div>
          {selected ? (
            <div class="space-y-3">
              <button
                class="touch-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700"
                type="button"
                onClick={async () => {
                  setMessage("");
                  try {
                    await api.deleteEvent(selected.id);
                    const nextEvents = events.filter((event) => event.id !== selected.id);
                    setEvents(nextEvents);
                    const nextSelected = nextEvents[0];
                    setSelectedId(nextSelected?.id ?? "");
                    setEventQuery("/rsvp", nextSelected?.slug);
                    setMessage("Evento removido.");
                  } catch (error) {
                    setMessage(apiMessage(error));
                  }
                }}
              >
                <Trash2 size={17} aria-hidden="true" />
                Excluir evento
              </button>
              <GuestManager
                event={selected}
                onEventUpdated={(updated) =>
                  setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)))
                }
              />
            </div>
          ) : (
            <section class="soft-panel rounded-xl p-6 text-center">
              <Heart class="mx-auto text-teal-700" size={30} aria-hidden="true" />
              <p class="mt-2 font-semibold">Crie o primeiro evento.</p>
            </section>
          )}
          {message ? <p class="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}
        </div>
      </main>
    </>
  );
}

function AdminPage() {
  return <ProtectedPage>{({ logout }) => <AdminDashboard logout={logout} />}</ProtectedPage>;
}

function PublicRsvpPage({ slug }: { slug: string }) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [search, setSearch] = useState("");
  const [guests, setGuests] = useState<PublicGuest[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmResponse | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!slug) {
      return;
    }
    api.publicEvent(slug).then((response) => setEvent(response.event)).catch((error) => setMessage(apiMessage(error)));
  }, [slug]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2 || !slug) {
      setGuests([]);
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      api
        .publicGuests(slug, term)
        .then((response: PublicGuestsResponse) => setGuests(response.guests))
        .catch((error) => setMessage(apiMessage(error)));
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [search, slug]);

  async function confirm(guest: PublicGuest) {
    setMessage("");
    try {
      setConfirmation(await api.confirmPresence(slug, guest.id));
    } catch (error) {
      setMessage(apiMessage(error));
    }
  }

  if (!slug) {
    return <NotFound />;
  }

  return (
    <main class="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section class="soft-panel animate-rise rounded-2xl p-5 lg:sticky lg:top-24 lg:h-fit">
          <div class="mb-5 flex items-start gap-3">
            <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700">
              <Heart size={22} aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold uppercase tracking-wide text-teal-700">{event?.eventType ?? "RSVP"}</p>
              <h1 class="truncate text-3xl font-semibold text-stone-950">{event?.name ?? "Carregando"}</h1>
              {event ? <p class="mt-1 text-sm text-stone-600">{event.hosts}</p> : null}
            </div>
          </div>
          {event ? (
            <div class="space-y-3">
              <div class="rounded-2xl bg-amber-50 p-4">
                <p class="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <Clock3 size={16} aria-hidden="true" />
                  {formatEventWindow(event)}
                </p>
              </div>
              {event.description ? (
                <div class="rounded-2xl bg-white p-4 shadow-sm">
                  <p class="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
                    <FileText size={16} aria-hidden="true" />
                    Sobre o evento
                  </p>
                  <p class="text-sm leading-6 text-stone-700">{event.description}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section class="soft-panel animate-rise rounded-2xl p-5">
          <div class="mb-4">
            <h2 class="text-xl font-semibold text-stone-950">Procure seu nome</h2>
            <p class="mt-1 text-sm text-stone-600">Busque, toque no seu nome e confirme sua presenca.</p>
          </div>
          <label class="relative block">
            <Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
            <input
              class="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-3 text-stone-950"
              value={search}
              onInput={(currentEvent) => setSearch(currentEvent.currentTarget.value)}
              placeholder="Digite seu nome"
            />
          </label>
          {search.trim().length > 0 && search.trim().length < 2 ? (
            <p class="mt-3 text-sm text-stone-600">Digite pelo menos 2 letras.</p>
          ) : null}

          <div class="mt-4 space-y-2">
            {guests.map((guest) => (
              <button
                class="touch-button soft-panel animate-rise flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left"
                type="button"
                key={guest.id}
                onClick={() => void confirm(guest)}
              >
                <div class="min-w-0">
                  <p class="truncate font-semibold text-stone-950">{guest.name}</p>
                  <p class="text-xs text-stone-500">
                    {groupLabel(guest.group)} · {guest.rsvpAt ? "Presenca confirmada" : "Toque para confirmar"}
                  </p>
                </div>
                <span class="inline-flex items-center gap-2 rounded-full bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {guest.rsvpAt ? "Ver QR" : "Confirmar"}
                </span>
              </button>
            ))}
          </div>

          {confirmation ? (
            <div class="mt-4">
              <QrCodeCard token={confirmation.qrToken} guestName={confirmation.guest.name} />
            </div>
          ) : null}
          {message ? <p class="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}
        </section>
      </div>
    </main>
  );
}

function CheckinDashboard({ logout }: { logout: () => Promise<void> }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [stats, setStats] = useState<EventStats>(emptyStats);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [message, setMessage] = useState("");
  const initialSlug = useMemo(() => eventQueryValue(), []);
  const lastScanAtRef = useRef(0);

  const selected = events.find((event) => event.id === selectedId);

  useEffect(() => {
    if (selected?.slug) {
      setEventQuery("/rsvp-confirm", selected.slug);
    }
  }, [selected?.slug]);

  useEffect(() => {
    api.events()
      .then((response) => {
        setEvents(response.events);
        const direct = response.events.find((event) => event.slug === initialSlug);
        setSelectedId(direct?.id ?? response.events[0]?.id ?? "");
      })
      .catch((error) => setMessage(apiMessage(error)));
  }, [initialSlug]);

  const loadGuests = useCallback(async () => {
    if (!selectedId) {
      return;
    }
    const response: GuestsResponse = await api.guests(selectedId, search, group);
    setGuests(response.guests);
    setStats(response.stats);
  }, [group, search, selectedId]);

  useEffect(() => {
    void loadGuests().catch((error) => setMessage(apiMessage(error)));
  }, [loadGuests]);

  async function toggleCheckin(guest: GuestRecord) {
    if (!selectedId) {
      return;
    }
    setMessage("");
    try {
      const response = guest.checkedInAt
        ? await api.undoCheckin(selectedId, guest.id)
        : await api.manualCheckin(selectedId, guest.id);
      setStats(response.stats);
      setMessage(guest.checkedInAt ? "Entrada desfeita." : response.duplicate ? "Entrada ja registrada." : "Entrada registrada.");
      await loadGuests();
    } catch (error) {
      setMessage(apiMessage(error));
    }
  }

  const scan = useCallback(
    async (token: string) => {
      if (!selectedId) {
        return;
      }
      const now = Date.now();
      if (now - lastScanAtRef.current < 1400) {
        return;
      }
      lastScanAtRef.current = now;
      try {
        const response = await api.qrCheckin(selectedId, token);
        setStats(response.stats);
        setMessage(response.duplicate ? "QRCode ja utilizado." : `Entrada registrada: ${response.guest.name}`);
        setScannerActive(false);
        await loadGuests();
      } catch (error) {
        setMessage(apiMessage(error));
      }
    },
    [loadGuests, selectedId]
  );

  return (
    <>
      <TopBar title="Check-in" subtitle="Busca, filtros, confirmacao manual e QRCode" onLogout={logout} />
      <main class="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[360px_1fr]">
        <aside class="space-y-4">
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
                onChange={(currentEvent) => {
                  const id = currentEvent.currentTarget.value;
                  setSelectedId(id);
                  const chosen = events.find((item) => item.id === id);
                  if (chosen) {
                    setEventQuery("/rsvp-confirm", chosen.slug);
                  }
                }}
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
                  <StatCard icon={CheckCircle2} label="RSVP" value={stats.rsvped} tone="teal" />
                  <StatCard icon={UserCheck} label="Entrada" value={stats.checkedIn} tone="rose" />
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
            <Suspense fallback={null}>
              <ScannerPanel active={scannerActive} onScan={scan} onClose={() => setScannerActive(false)} />
            </Suspense>
          </CollapsiblePanel>
        </aside>

        <CollapsiblePanel
          icon={ClipboardCheck}
          title="Lista de entrada"
          summary={search.trim() ? `${guests.length} resultados` : `${stats.checkedIn} entradas registradas`}
          defaultOpen
        >
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-stone-950">{selected?.name ?? "Evento"}</h2>
            {selected ? <p class="text-sm text-stone-600">{formatEventWindow(selected)}</p> : null}
          </div>

          <div class="grid gap-2 sm:grid-cols-[1fr_160px]">
            <label class="relative">
              <Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
              <input
                class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3"
                value={search}
                onInput={(currentEvent) => setSearch(currentEvent.currentTarget.value)}
                placeholder="Buscar nome"
              />
            </label>
            <label class="relative">
              <Filter class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
              <select
                class="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3"
                value={group}
                onChange={(currentEvent) => setGroup(currentEvent.currentTarget.value)}
              >
                <option value="">Todos</option>
                <option value="adulto">Adultos</option>
                <option value="crianca">Criancas</option>
              </select>
            </label>
          </div>

          <div class="mt-4 space-y-2">
            {guests.map((guest) => (
              <article
                class={`flex items-center justify-between gap-3 rounded-xl p-3 shadow-sm ${
                  guest.checkedInAt ? "bg-emerald-50" : "bg-white"
                }`}
                key={guest.id}
              >
                <div class="min-w-0">
                  <p class="truncate font-semibold text-stone-950">{guest.name}</p>
                  <p class="text-xs text-stone-500">
                    {groupLabel(guest.group)} · {guest.rsvpAt ? "Confirmado" : "Sem RSVP"} ·{" "}
                    {guest.checkedInAt ? "Entrada registrada" : "Aguardando"}
                  </p>
                </div>
                <button
                  class={`touch-button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                    guest.checkedInAt ? "bg-white text-emerald-700" : "bg-teal-700 text-white"
                  }`}
                  type="button"
                  onClick={() => void toggleCheckin(guest)}
                >
                  {guest.checkedInAt ? <RotateCcw size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                  {guest.checkedInAt ? "Desfazer" : "Entrou"}
                </button>
              </article>
            ))}
          </div>

          {message ? <p class="mt-4 rounded-xl bg-white p-3 text-sm text-stone-700 shadow-sm">{message}</p> : null}
        </CollapsiblePanel>
      </main>
    </>
  );
}

function CheckinPage() {
  return <ProtectedPage>{({ logout }) => <CheckinDashboard logout={logout} />}</ProtectedPage>;
}

function NotFound() {
  return (
    <main class="grid min-h-screen place-items-center px-4">
      <section class="soft-panel max-w-md rounded-xl p-6 text-center">
        <Link class="mx-auto text-teal-700" size={30} aria-hidden="true" />
        <h1 class="mt-3 text-xl font-semibold">Link nao encontrado</h1>
        <a
          class="touch-button mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white"
          href="/rsvp"
        >
          <Lock size={18} aria-hidden="true" />
          Area RSVP
        </a>
      </section>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname;
  if (path === "/rsvp") {
    return <AdminPage />;
  }
  if (path === "/rsvp-confirm") {
    return <CheckinPage />;
  }
  const slug = path.replace(/^\/+/, "").split("/")[0] ?? "";
  return <PublicRsvpPage slug={slug} />;
}
