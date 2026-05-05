export type GuestGroup = "adulto" | "crianca";

export type CheckinMethod = "manual" | "qr" | "undo";

export type EventRecord = {
  id: string;
  eventType: string;
  name: string;
  hosts: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  dateTime?: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type GuestRecord = {
  id: string;
  eventId: string;
  name: string;
  normalizedName: string;
  group: GuestGroup;
  rsvpAt?: string;
  qrNonceHash?: string;
  checkedInAt?: string;
  checkinMethod?: CheckinMethod;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CheckinLogRecord = {
  id: string;
  eventId: string;
  guestId: string;
  method: CheckinMethod;
  createdAt: string;
  duplicate: boolean;
};

export type EventStats = {
  totalGuests: number;
  rsvped: number;
  checkedIn: number;
  byGroup: Record<GuestGroup, { total: number; rsvped: number; checkedIn: number }>;
};

export type EventSummary = EventRecord & {
  stats: EventStats;
  publicUrl: string;
};

export type PublicGuest = Pick<GuestRecord, "id" | "name" | "group" | "rsvpAt" | "checkedInAt">;

export type ImportGuestRow = {
  name: string;
  group: GuestGroup;
  rowNumber: number;
};

export type ImportGuestError = {
  rowNumber: number;
  field: "Convidados" | "Grupo" | "Arquivo";
  message: string;
};

export type ImportPreview = {
  validRows: ImportGuestRow[];
  errors: ImportGuestError[];
};
