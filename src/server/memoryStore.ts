import { randomUUID } from "node:crypto";
import { normalizeName } from "../shared/normalize.js";
import type {
  CheckinLogRecord,
  CheckinMethod,
  EventRecord,
  GuestRecord
} from "../shared/types.js";
import type {
  AppStore,
  CheckinResult,
  CreateEventInput,
  CreateGuestInput,
  ListGuestsOptions,
  UpdateEventInput,
  UpdateGuestInput
} from "./store.js";
import { emptyStats } from "./store.js";

function nowIso(): string {
  return new Date().toISOString();
}

function matchesGuest(guest: GuestRecord, options?: ListGuestsOptions): boolean {
  if (!options?.includeDeleted && guest.deletedAt) {
    return false;
  }
  if (options?.group && guest.group !== options.group) {
    return false;
  }
  if (options?.search && !guest.normalizedName.includes(normalizeName(options.search))) {
    return false;
  }
  return true;
}

export class MemoryStore implements AppStore {
  private events = new Map<string, EventRecord>();
  private guests = new Map<string, GuestRecord>();
  private checkinLogs = new Map<string, CheckinLogRecord>();

  async close(): Promise<void> {
    return Promise.resolve();
  }

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const timestamp = nowIso();
    const event: EventRecord = {
      id: randomUUID(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.events.set(event.id, event);
    return event;
  }

  async listEvents(): Promise<EventRecord[]> {
    return [...this.events.values()]
      .filter((event) => !event.deletedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getEventById(id: string): Promise<EventRecord | null> {
    const event = this.events.get(id);
    return event && !event.deletedAt ? event : null;
  }

  async getEventBySlug(slug: string): Promise<EventRecord | null> {
    return [...this.events.values()].find((event) => event.slug === slug && !event.deletedAt) ?? null;
  }

  async updateEvent(id: string, input: UpdateEventInput): Promise<EventRecord | null> {
    const event = await this.getEventById(id);
    if (!event) {
      return null;
    }
    const updated = { ...event, ...input, updatedAt: nowIso() };
    this.events.set(id, updated);
    return updated;
  }

  async softDeleteEvent(id: string): Promise<boolean> {
    const event = await this.getEventById(id);
    if (!event) {
      return false;
    }
    this.events.set(id, { ...event, deletedAt: nowIso(), updatedAt: nowIso() });
    return true;
  }

  async createGuest(input: CreateGuestInput): Promise<GuestRecord> {
    const timestamp = nowIso();
    const guest: GuestRecord = {
      id: randomUUID(),
      ...input,
      normalizedName: normalizeName(input.name),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.guests.set(guest.id, guest);
    return guest;
  }

  async createGuests(input: CreateGuestInput[]): Promise<GuestRecord[]> {
    const created: GuestRecord[] = [];
    for (const guest of input) {
      created.push(await this.createGuest(guest));
    }
    return created;
  }

  async listGuests(eventId: string, options?: ListGuestsOptions): Promise<GuestRecord[]> {
    const guests = [...this.guests.values()]
      .filter((guest) => guest.eventId === eventId)
      .filter((guest) => matchesGuest(guest, options))
      .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
    return typeof options?.limit === "number" ? guests.slice(0, options.limit) : guests;
  }

  async getGuestById(id: string): Promise<GuestRecord | null> {
    const guest = this.guests.get(id);
    return guest && !guest.deletedAt ? guest : null;
  }

  async updateGuest(id: string, input: UpdateGuestInput): Promise<GuestRecord | null> {
    const guest = await this.getGuestById(id);
    if (!guest) {
      return null;
    }
    const updated: GuestRecord = {
      ...guest,
      ...input,
      normalizedName: normalizeName(input.name ?? guest.name),
      updatedAt: nowIso()
    };
    this.guests.set(id, updated);
    return updated;
  }

  async softDeleteGuest(id: string): Promise<boolean> {
    const guest = await this.getGuestById(id);
    if (!guest) {
      return false;
    }
    this.guests.set(id, { ...guest, deletedAt: nowIso(), updatedAt: nowIso() });
    return true;
  }

  async confirmGuest(eventId: string, guestId: string, qrNonceHash: string): Promise<GuestRecord | null> {
    const guest = await this.getGuestById(guestId);
    if (!guest || guest.eventId !== eventId) {
      return null;
    }
    const updated: GuestRecord = {
      ...guest,
      rsvpAt: guest.rsvpAt ?? nowIso(),
      qrNonceHash,
      updatedAt: nowIso()
    };
    this.guests.set(guestId, updated);
    return updated;
  }

  async checkInGuest(guestId: string, method: CheckinMethod): Promise<CheckinResult | null> {
    const guest = await this.getGuestById(guestId);
    if (!guest) {
      return null;
    }
    if (guest.checkedInAt) {
      return { guest, duplicate: true };
    }
    const timestamp = nowIso();
    const updated: GuestRecord = {
      ...guest,
      rsvpAt: guest.rsvpAt ?? timestamp,
      checkedInAt: timestamp,
      checkinMethod: method,
      updatedAt: timestamp
    };
    this.guests.set(guestId, updated);
    return { guest: updated, duplicate: false };
  }

  async undoCheckInGuest(guestId: string): Promise<GuestRecord | null> {
    const guest = await this.getGuestById(guestId);
    if (!guest || !guest.checkedInAt) {
      return null;
    }
    const updated: GuestRecord = {
      ...guest,
      checkedInAt: undefined,
      checkinMethod: undefined,
      updatedAt: nowIso()
    };
    this.guests.set(guestId, updated);
    return updated;
  }

  async createCheckinLog(input: Omit<CheckinLogRecord, "id" | "createdAt">): Promise<CheckinLogRecord> {
    const log = { id: randomUUID(), createdAt: nowIso(), ...input };
    this.checkinLogs.set(log.id, log);
    return log;
  }

  async getEventStats(eventId: string) {
    const stats = emptyStats();
    const guests = await this.listGuests(eventId);
    for (const guest of guests) {
      stats.totalGuests += 1;
      stats.byGroup[guest.group].total += 1;
      if (guest.rsvpAt) {
        stats.rsvped += 1;
        stats.byGroup[guest.group].rsvped += 1;
      }
      if (guest.checkedInAt) {
        stats.checkedIn += 1;
        stats.byGroup[guest.group].checkedIn += 1;
      }
    }
    return stats;
  }
}
