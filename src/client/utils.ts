import { ApiError } from "./api.js";
import type { EventStats, GuestGroup } from "../shared/types.js";
import type { EventForm } from "./types.js";

export const EVENT_TYPE_OPTIONS = [
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

export const emptyStats: EventStats = {
  totalGuests: 0,
  rsvped: 0,
  checkedIn: 0,
  byGroup: {
    adulto: { total: 0, rsvped: 0, checkedIn: 0 },
    crianca: { total: 0, rsvped: 0, checkedIn: 0 }
  }
};

export function groupLabel(group: GuestGroup): string {
  return group === "adulto" ? "Adulto" : "Crianca";
}

export function eventStartsAt(event: { startsAt?: string; dateTime?: string }): string {
  return event.startsAt ?? event.dateTime ?? "";
}

export function eventEndsAt(event: { endsAt?: string; startsAt?: string; dateTime?: string }): string {
  return event.endsAt ?? event.startsAt ?? event.dateTime ?? "";
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });
const fullFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export function formatDate(value: string): string {
  try {
    return fullFmt.format(new Date(value));
  } catch {
    return "Data invalida";
  }
}

export function formatEventWindow(event: { startsAt?: string; endsAt?: string; dateTime?: string }): string {
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
    const day = dateFmt.format(startDate);
    const startTime = timeFmt.format(startDate);
    const endTime = timeFmt.format(endDate);
    return `${day} · ${startTime} ate ${endTime}`;
  }
  return `${formatDate(startsAt)} ate ${formatDate(endsAt)}`;
}

export function toInputDateTime(value?: string): string {
  return value ? value.slice(0, 16) : "";
}

export function plusHours(value: string, hours: number): string {
  const date = new Date(value);
  date.setHours(date.getHours() + hours);
  return date.toISOString().slice(0, 16);
}

export function todayLocalValue(): string {
  const now = new Date();
  const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${nextHour.getFullYear()}-${pad(nextHour.getMonth() + 1)}-${pad(nextHour.getDate())}T${pad(nextHour.getHours())}:${pad(nextHour.getMinutes())}`;
}

export function makeDefaultEventForm(): EventForm {
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

export function apiMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Algo saiu do esperado.";
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min atras`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h atras`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d atras`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function exportGuestsCsv(guests: { name: string; group: string; rsvpAt?: string; checkedInAt?: string }[]): void {
  const header = "Nome,Grupo,RSVP,Check-in";
  const rows = guests.map(
    (g) =>
      `"${g.name.replace(/"/g, '""')}","${g.group}","${g.rsvpAt ?? ""}","${g.checkedInAt ?? ""}"`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "convidados.csv";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
