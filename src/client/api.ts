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

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const hasJsonBody = typeof init?.body !== "undefined" && !(init.body instanceof FormData);
  const headers = hasJsonBody
    ? {
        "Content-Type": "application/json",
        ...init?.headers
      }
    : init?.headers;
  const requestInit: RequestInit = {
    credentials: "same-origin",
    ...init
  };
  if (headers) {
    requestInit.headers = headers;
  }

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
  return (await response.json()) as T;
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
    apiFetch<{ event: EventSummary }>(`/api/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(form)
    }),
  deleteEvent: (id: string) => apiFetch<{ deleted: true }>(`/api/events/${id}`, { method: "DELETE" }),
  guests: (eventId: string, search = "", group = "") => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (group) {
      params.set("group", group);
    }
    const suffix = params.toString() ? `?${params}` : "";
    return apiFetch<GuestsResponse>(`/api/events/${eventId}/guests${suffix}`);
  },
  createGuest: (eventId: string, form: GuestForm) =>
    apiFetch<GuestsResponse & { guest: unknown }>(`/api/events/${eventId}/guests`, {
      method: "POST",
      body: JSON.stringify(form)
    }),
  deleteGuest: (eventId: string, guestId: string) =>
    apiFetch<GuestsResponse & { deleted: true }>(`/api/events/${eventId}/guests/${guestId}`, {
      method: "DELETE"
    }),
  importGuests: (eventId: string, file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<ImportPreviewResponse>(`/api/events/${eventId}/guests/import?dryRun=${dryRun}`, {
      method: "POST",
      body: form
    });
  },
  publicEvent: (slug: string) => apiFetch<{ event: PublicEvent }>(`/api/public/events/${slug}`),
  publicGuests: (slug: string, search: string) =>
    apiFetch<PublicGuestsResponse>(`/api/public/events/${slug}/guests?search=${encodeURIComponent(search)}`),
  confirmPresence: (slug: string, guestId: string) =>
    apiFetch<ConfirmResponse>(`/api/public/events/${slug}/confirm`, {
      method: "POST",
      body: JSON.stringify({ guestId })
    }),
  manualCheckin: (eventId: string, guestId: string) =>
    apiFetch<CheckinResponse>(`/api/events/${eventId}/checkins/manual`, {
      method: "POST",
      body: JSON.stringify({ guestId })
    }),
  qrCheckin: (eventId: string, token: string) =>
    apiFetch<CheckinResponse>(`/api/events/${eventId}/checkins/qr`, {
      method: "POST",
      body: JSON.stringify({ token })
    }),
  undoCheckin: (eventId: string, guestId: string) =>
    apiFetch<CheckinResponse>(`/api/events/${eventId}/checkins/${guestId}`, {
      method: "DELETE"
    })
};
