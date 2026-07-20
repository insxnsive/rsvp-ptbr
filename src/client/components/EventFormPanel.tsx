import { useEffect, useRef, useState } from "preact/hooks";
import { Calendar, LoaderCircle, Save } from "lucide-preact";
import { ApiError } from "../api.js";
import type { EventForm } from "../types.js";
import { EVENT_TYPE_OPTIONS, makeDefaultEventForm } from "../utils.js";

export default function EventFormPanel({
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
  const [form, setForm] = useState<EventForm>(() => initial ?? makeDefaultEventForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const initialJsonRef = useRef(initial ? JSON.stringify(initial) : undefined);

  useEffect(() => {
    if (initial) {
      const json = JSON.stringify(initial);
      if (json !== initialJsonRef.current) {
        initialJsonRef.current = json;
        setForm(initial);
      }
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
      setMessage(error instanceof ApiError ? error.message : "Algo saiu do esperado.");
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
            onChange={(e) => setForm({ ...form, eventType: e.currentTarget.value })}
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
            onInput={(e) => setForm({ ...form, hosts: e.currentTarget.value })}
            placeholder="Ex.: Ana e Bruno"
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700 sm:col-span-2">
          Nome do evento
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            value={form.name}
            onInput={(e) => setForm({ ...form, name: e.currentTarget.value })}
            placeholder="Ex.: Casamento de Ana e Bruno"
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700">
          Inicio
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            type="datetime-local"
            lang="pt-BR"
            value={form.startsAt}
            onInput={(e) => setForm({ ...form, startsAt: e.currentTarget.value })}
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700">
          Fim
          <input
            class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            type="datetime-local"
            lang="pt-BR"
            value={form.endsAt}
            onInput={(e) => setForm({ ...form, endsAt: e.currentTarget.value })}
            required
          />
        </label>
        <label class="block text-sm font-medium text-stone-700 sm:col-span-2">
          Descricao
          <textarea
            class="mt-1 min-h-28 w-full rounded-xl border border-stone-200 bg-white px-3 py-3"
            value={form.description}
            onInput={(e) => setForm({ ...form, description: e.currentTarget.value })}
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
