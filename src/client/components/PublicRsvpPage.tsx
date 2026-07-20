import { useEffect, useRef, useState } from "preact/hooks";
import { CheckCircle2, Clock3, FileText, Heart, Search, Users } from "lucide-preact";
import { api, ApiError } from "../api.js";
import QrCodeCard from "./QrCodeCard.js";
import Footer from "./Footer.js";
import Countdown from "./Countdown.js";
import { eventStartsAt, formatEventWindow, getInitials, groupLabel } from "../utils.js";
import type { ConfirmResponse, PublicEvent, PublicGuestsResponse } from "../types.js";
import type { PublicGuest } from "../../shared/types.js";

export default function PublicRsvpPage({ slug }: { slug: string }) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [guests, setGuests] = useState<PublicGuest[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmResponse | null>(null);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const confirmedTimerRef = useRef(0);

  useEffect(() => {
    if (!slug) return;
    setMessage("");
    api.publicEvent(slug).then((response) => setEvent(response.event)).catch((error) => setMessage(error instanceof ApiError ? error.message : "Evento nao encontrado."));
  }, [slug]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setDebouncedSearch("");
      setGuests([]);
      return undefined;
    }
    const timeout = window.setTimeout(() => setDebouncedSearch(term), 220);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!debouncedSearch || !slug) return;
    const controller = new AbortController();
    api
      .publicGuests(slug, debouncedSearch)
      .then((response: PublicGuestsResponse) => {
        if (!controller.signal.aborted) setGuests(response.guests);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setMessage(error instanceof ApiError ? error.message : "Erro na busca.");
      });
    return () => controller.abort();
  }, [debouncedSearch, slug]);

  useEffect(() => {
    return () => window.clearTimeout(confirmedTimerRef.current);
  }, []);

  async function confirm(guest: PublicGuest) {
    setMessage("");
    try {
      const result = await api.confirmPresence(slug, guest.id);
      setConfirmation(result);
      setConfirmed(true);
      window.clearTimeout(confirmedTimerRef.current);
      confirmedTimerRef.current = window.setTimeout(() => setConfirmed(false), 4000);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Erro ao confirmar.");
    }
  }

  if (!slug) {
    return (
      <main class="grid min-h-screen place-items-center px-4">
        <section class="soft-panel max-w-md rounded-2xl p-6 text-center">
          <Heart class="mx-auto text-teal-700" size={30} aria-hidden="true" />
          <h1 class="mt-3 text-xl font-bold">Link nao encontrado</h1>
          <a
            class="touch-button mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white"
            href="/rsvp"
          >
            Area RSVP
          </a>
        </section>
      </main>
    );
  }

  const startsAt = event ? eventStartsAt(event) : "";

  return (
    <main class="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section class="soft-panel animate-rise overflow-hidden rounded-2xl lg:sticky lg:top-24 lg:h-fit">
          <div class="bg-gradient-to-br from-amber-100/80 via-white/60 to-teal-50/40 p-5">
            <div class="mb-5 flex items-start gap-3">
              <div class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 shadow-sm">
                <Heart size={24} aria-hidden="true" />
              </div>
              <div class="min-w-0">
                <p class="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                  {event?.eventType ?? "RSVP"}
                </p>
                <h1 class="mt-1 truncate text-3xl font-bold text-stone-950">{event?.name ?? "Carregando"}</h1>
                {event ? <p class="mt-1 text-sm text-stone-600">{event.hosts}</p> : null}
              </div>
            </div>
          </div>
          {event ? (
            <div class="space-y-3 p-5 pt-0">
              {startsAt ? <Countdown startsAt={startsAt} /> : null}
              <div class="rounded-xl bg-amber-50/70 p-4">
                <p class="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <Clock3 size={16} aria-hidden="true" />
                  {formatEventWindow(event)}
                </p>
              </div>
              {event.description ? (
                <div class="rounded-xl bg-white p-4 shadow-sm">
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
            <h2 class="text-xl font-bold text-stone-950">Procure seu nome</h2>
            <p class="mt-1 text-sm text-stone-600">Busque, toque no seu nome e confirme sua presenca.</p>
          </div>
          <label class="relative block">
            <Search class="absolute left-3 top-3.5 text-stone-400" size={18} aria-hidden="true" />
            <input
              class="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-3 text-stone-950 transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              value={search}
              onInput={(e) => setSearch(e.currentTarget.value)}
              placeholder="Digite seu nome"
            />
          </label>
          {search.trim().length > 0 && search.trim().length < 2 ? (
            <p class="mt-3 text-sm text-stone-600">Digite pelo menos 2 letras.</p>
          ) : null}

          {confirmed ? (
            <div class="animate-rise mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <div>
                <p class="font-semibold text-emerald-800">Presenca confirmada!</p>
                <p class="text-sm text-emerald-700">Seu QRCode esta logo abaixo.</p>
              </div>
            </div>
          ) : null}

          <div class="mt-4 space-y-2">
            {guests.map((guest) => (
              <button
                class="touch-button soft-panel animate-rise flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left"
                type="button"
                key={guest.id}
                onClick={() => void confirm(guest)}
              >
                <div class="flex min-w-0 items-center gap-3">
                  <div class={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
                    guest.group === "adulto" ? "bg-teal-600" : "bg-amber-500"
                  }`}>
                    {getInitials(guest.name)}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-stone-950">{guest.name}</p>
                    <p class="text-xs text-stone-500">
                      {groupLabel(guest.group)} · {guest.rsvpAt ? "Presenca confirmada" : "Toque para confirmar"}
                    </p>
                  </div>
                </div>
                <span class={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                  guest.rsvpAt
                    ? "bg-white text-teal-700 border border-teal-200"
                    : "bg-teal-700 text-white"
                }`}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {guest.rsvpAt ? "Ver QR" : "Confirmar"}
                </span>
              </button>
            ))}
          </div>

          {debouncedSearch.length >= 2 && guests.length === 0 ? (
            <div class="mt-6 rounded-2xl border border-dashed border-stone-200 p-8 text-center">
              <Users size={32} aria-hidden="true" class="mx-auto text-stone-300" />
              <p class="mt-3 font-semibold text-stone-700">Nenhum convidado encontrado</p>
              <p class="mt-1 text-sm text-stone-500">Verifique se seu nome esta na lista ou tente outra grafia.</p>
            </div>
          ) : null}

          {confirmation ? (
            <div class="mt-4">
              <QrCodeCard token={confirmation.qrToken} guestName={confirmation.guest.name} />
            </div>
          ) : null}
          {message ? <p class="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p> : null}
        </section>
      </div>
      <Footer />
    </main>
  );
}
