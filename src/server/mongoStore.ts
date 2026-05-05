import { randomUUID } from "node:crypto";
import type { Collection, Db, Filter, MongoClient } from "mongodb";
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class MongoStore implements AppStore {
  private events: Collection<EventRecord>;
  private guests: Collection<GuestRecord>;
  private checkinLogs: Collection<CheckinLogRecord>;

  constructor(
    private client: MongoClient,
    db: Db
  ) {
    this.events = db.collection<EventRecord>("events");
    this.guests = db.collection<GuestRecord>("guests");
    this.checkinLogs = db.collection<CheckinLogRecord>("checkinLogs");
  }

  async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.events.createIndex({ slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } }),
      this.events.createIndex({ createdAt: -1 }),
      this.guests.createIndex({ eventId: 1, normalizedName: 1, deletedAt: 1 }),
      this.guests.createIndex({ eventId: 1, group: 1, deletedAt: 1 }),
      this.checkinLogs.createIndex({ eventId: 1, createdAt: -1 }),
      this.checkinLogs.createIndex({ guestId: 1, createdAt: -1 })
    ]);
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const timestamp = nowIso();
    const event: EventRecord = {
      id: randomUUID(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await this.events.insertOne(event);
    return event;
  }

  async listEvents(): Promise<EventRecord[]> {
    return this.events.find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray();
  }

  async getEventById(id: string): Promise<EventRecord | null> {
    return this.events.findOne({ id, deletedAt: { $exists: false } });
  }

  async getEventBySlug(slug: string): Promise<EventRecord | null> {
    return this.events.findOne({ slug, deletedAt: { $exists: false } });
  }

  async updateEvent(id: string, input: UpdateEventInput): Promise<EventRecord | null> {
    return this.events.findOneAndUpdate(
      { id, deletedAt: { $exists: false } },
      { $set: { ...input, updatedAt: nowIso() } },
      { returnDocument: "after" }
    );
  }

  async softDeleteEvent(id: string): Promise<boolean> {
    const result = await this.events.updateOne(
      { id, deletedAt: { $exists: false } },
      { $set: { deletedAt: nowIso(), updatedAt: nowIso() } }
    );
    return result.modifiedCount === 1;
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
    await this.guests.insertOne(guest);
    return guest;
  }

  async createGuests(input: CreateGuestInput[]): Promise<GuestRecord[]> {
    if (input.length === 0) {
      return [];
    }
    const timestamp = nowIso();
    const guests = input.map<GuestRecord>((guest) => ({
      id: randomUUID(),
      ...guest,
      normalizedName: normalizeName(guest.name),
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    await this.guests.insertMany(guests);
    return guests;
  }

  async listGuests(eventId: string, options?: ListGuestsOptions): Promise<GuestRecord[]> {
    const filter: Filter<GuestRecord> = { eventId };
    if (!options?.includeDeleted) {
      filter.deletedAt = { $exists: false };
    }
    if (options?.group) {
      filter.group = options.group;
    }
    if (options?.search) {
      filter.normalizedName = { $regex: escapeRegex(normalizeName(options.search)), $options: "i" };
    }
    const cursor = this.guests.find(filter).sort({ normalizedName: 1 });
    if (typeof options?.limit === "number") {
      cursor.limit(options.limit);
    }
    return cursor.toArray();
  }

  async getGuestById(id: string): Promise<GuestRecord | null> {
    return this.guests.findOne({ id, deletedAt: { $exists: false } });
  }

  async updateGuest(id: string, input: UpdateGuestInput): Promise<GuestRecord | null> {
    const set: Partial<GuestRecord> = { ...input, updatedAt: nowIso() };
    if (input.name) {
      set.normalizedName = normalizeName(input.name);
    }
    return this.guests.findOneAndUpdate(
      { id, deletedAt: { $exists: false } },
      { $set: set },
      { returnDocument: "after" }
    );
  }

  async softDeleteGuest(id: string): Promise<boolean> {
    const result = await this.guests.updateOne(
      { id, deletedAt: { $exists: false } },
      { $set: { deletedAt: nowIso(), updatedAt: nowIso() } }
    );
    return result.modifiedCount === 1;
  }

  async confirmGuest(eventId: string, guestId: string, qrNonceHash: string): Promise<GuestRecord | null> {
    const timestamp = nowIso();
    return this.guests.findOneAndUpdate(
      { id: guestId, eventId, deletedAt: { $exists: false } },
      [
        {
          $set: {
            rsvpAt: { $ifNull: ["$rsvpAt", timestamp] },
            qrNonceHash,
            updatedAt: timestamp
          }
        }
      ],
      { returnDocument: "after" }
    );
  }

  async checkInGuest(guestId: string, method: CheckinMethod): Promise<CheckinResult | null> {
    const timestamp = nowIso();
    const updated = await this.guests.findOneAndUpdate(
      { id: guestId, deletedAt: { $exists: false }, checkedInAt: { $exists: false } },
      [
        {
          $set: {
            rsvpAt: { $ifNull: ["$rsvpAt", timestamp] },
            checkedInAt: timestamp,
            checkinMethod: method,
            updatedAt: timestamp
          }
        }
      ],
      { returnDocument: "after" }
    );
    if (updated) {
      return { guest: updated, duplicate: false };
    }
    const existing = await this.getGuestById(guestId);
    if (!existing) {
      return null;
    }
    return { guest: existing, duplicate: Boolean(existing.checkedInAt) };
  }

  async undoCheckInGuest(guestId: string): Promise<GuestRecord | null> {
    return this.guests.findOneAndUpdate(
      { id: guestId, deletedAt: { $exists: false }, checkedInAt: { $exists: true } },
      { $unset: { checkedInAt: "", checkinMethod: "" }, $set: { updatedAt: nowIso() } },
      { returnDocument: "after" }
    );
  }

  async createCheckinLog(input: Omit<CheckinLogRecord, "id" | "createdAt">): Promise<CheckinLogRecord> {
    const log = { id: randomUUID(), createdAt: nowIso(), ...input };
    await this.checkinLogs.insertOne(log);
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
