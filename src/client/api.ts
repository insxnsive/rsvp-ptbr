import type {
  CheckinResponse,
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

type ApiErrorPayload = {
  message?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

const API_TIMEOUT = 30_000;

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const hasJsonBody = typeof init?.body !== "undefined" && !(init.body instanceof FormData);
  const headers = hasJsonBody
    ? {
        "Content-Type": "application/json",
        ...init?.headers
      }
    : init?.headers;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT);

  const requestInit: RequestInit = {
    credentials: "same-origin",
    signal: controller.signal,
    ...init
  };
  if (headers) {
    requestInit.headers = headers;
  }

  try {
    const response = await fetch(url, requestInit);
    if (!response.ok) {
      let message = "Falha na operacao.";
      try {
        const payload = (await response.json()) as ApiErrorPayload;
        message = payload.message ?? message;
      } catch {
        message = "Falha na operacao.";
      }
      throw new ApiError(message, response.status);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Tempo limite da conexao.", 408);
    }
    throw new ApiError("Falha na comunicacao com o servidor.", 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function encodePath(value: string): string {
  return encodeURIComponent(value);
}

export const api = {
  session: () => apiFetch<SessionResponse>("/api/auth/session"),
  login: (username: string, password: string) =>
    apiFetch<SessionResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  logout: () => apiFetch<SessionResponse>("/api/auth/logout", { method: "POST" }),
  events: () => apiFetch<{ events: EventSummary[] }>("/api/events"),
  createEvent: (form: EventForm) =>
    apiFetch<{ event: EventSummary }>("/api/events", {
      method: "POST",
      body: JSON.stringify(form)
    }),
  updateEvent: (id: string, form: EventForm) =>
    apiFetch<{ event: EventSummary }>(`/api/events/${encodePath(id)}`, {
      method: "PATCH",
      body: JSON.stringify(form)
    }),
  deleteEvent: (id: string) => apiFetch<{ deleted: true }>(`/api/events/${encodePath(id)}`, { method: "DELETE" }),
  guests: (eventId: string, search = "", group = "") => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (group) {
      params.set("group", group);
    }
    const suffix = params.toString() ? `?${params}` : "";
    return apiFetch<GuestsResponse>(`/api/events/${encodePath(eventId)}/guests${suffix}`);
  },
  createGuest: (eventId: string, form: GuestForm) =>
    apiFetch<GuestsResponse>(`/api/events/${encodePath(eventId)}/guests`, {
      method: "POST",
      body: JSON.stringify(form)
    }),
  deleteGuest: (eventId: string, guestId: string) =>
    apiFetch<GuestsResponse & { deleted: true }>(`/api/events/${encodePath(eventId)}/guests/${encodePath(guestId)}`, {
      method: "DELETE"
    }),
  importGuests: (eventId: string, file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<ImportPreviewResponse>(`/api/events/${encodePath(eventId)}/guests/import?dryRun=${dryRun}`, {
      method: "POST",
      body: form
    });
  },
  publicEvent: (slug: string) => apiFetch<{ event: PublicEvent }>(`/api/public/events/${encodePath(slug)}`),
  publicGuests: (slug: string, search: string) =>
    apiFetch<PublicGuestsResponse>(`/api/public/events/${encodePath(slug)}/guests?search=${encodeURIComponent(search)}`),
  confirmPresence: (slug: string, guestId: string) =>
    apiFetch<ConfirmResponse>(`/api/public/events/${encodePath(slug)}/confirm`, {
      method: "POST",
      body: JSON.stringify({ guestId })
    }),
  manualCheckin: (eventId: string, guestId: string) =>
    apiFetch<CheckinResponse>(`/api/events/${encodePath(eventId)}/checkins/manual`, {
      method: "POST",
      body: JSON.stringify({ guestId })
    }),
  qrCheckin: (eventId: string, token: string) =>
    apiFetch<CheckinResponse>(`/api/events/${encodePath(eventId)}/checkins/qr`, {
      method: "POST",
      body: JSON.stringify({ token })
    }),
  undoCheckin: (eventId: string, guestId: string) =>
    apiFetch<CheckinResponse>(`/api/events/${encodePath(eventId)}/checkins/${encodePath(guestId)}`, {
      method: "DELETE"
    })
};
