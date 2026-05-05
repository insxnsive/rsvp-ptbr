import type {
  CheckinLogRecord,
  CheckinMethod,
  EventRecord,
  EventStats,
  GuestGroup,
  GuestRecord
} from "../shared/types.js";

export type CreateEventInput = Pick<
  EventRecord,
  "eventType" | "name" | "hosts" | "description" | "startsAt" | "endsAt" | "dateTime" | "slug"
>;
export type UpdateEventInput = Partial<
  Pick<EventRecord, "eventType" | "name" | "hosts" | "description" | "startsAt" | "endsAt" | "dateTime">
>;
export type CreateGuestInput = Pick<GuestRecord, "eventId" | "name" | "group">;
export type UpdateGuestInput = Partial<Pick<GuestRecord, "name" | "group">>;

export type ListGuestsOptions = {
  search?: string;
  group?: GuestGroup;
  includeDeleted?: boolean;
  limit?: number;
};

export type CheckinResult = {
  guest: GuestRecord;
  duplicate: boolean;
};

export type AppStore = {
  close(): Promise<void>;
  createEvent(input: CreateEventInput): Promise<EventRecord>;
  listEvents(): Promise<EventRecord[]>;
  getEventById(id: string): Promise<EventRecord | null>;
  getEventBySlug(slug: string): Promise<EventRecord | null>;
  updateEvent(id: string, input: UpdateEventInput): Promise<EventRecord | null>;
  softDeleteEvent(id: string): Promise<boolean>;
  createGuest(input: CreateGuestInput): Promise<GuestRecord>;
  createGuests(input: CreateGuestInput[]): Promise<GuestRecord[]>;
  listGuests(eventId: string, options?: ListGuestsOptions): Promise<GuestRecord[]>;
  getGuestById(id: string): Promise<GuestRecord | null>;
  updateGuest(id: string, input: UpdateGuestInput): Promise<GuestRecord | null>;
  softDeleteGuest(id: string): Promise<boolean>;
  confirmGuest(eventId: string, guestId: string, qrNonceHash: string): Promise<GuestRecord | null>;
  checkInGuest(guestId: string, method: CheckinMethod): Promise<CheckinResult | null>;
  undoCheckInGuest(guestId: string): Promise<GuestRecord | null>;
  createCheckinLog(input: Omit<CheckinLogRecord, "id" | "createdAt">): Promise<CheckinLogRecord>;
  getEventStats(eventId: string): Promise<EventStats>;
};

export function emptyStats(): EventStats {
  return {
    totalGuests: 0,
    rsvped: 0,
    checkedIn: 0,
    byGroup: {
      adulto: { total: 0, rsvped: 0, checkedIn: 0 },
      crianca: { total: 0, rsvped: 0, checkedIn: 0 }
    }
  };
}
