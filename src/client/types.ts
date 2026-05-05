import type { EventStats, GuestGroup, GuestRecord, PublicGuest } from "../shared/types.js";

export type SessionResponse =
  | { authenticated: false }
  | { authenticated: true; username: string };

export type EventSummary = {
  id: string;
  eventType: string;
  name: string;
  hosts: string;
  description: string;
  startsAt?: string;
  endsAt?: string;
  dateTime?: string;
  slug: string;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
  stats: EventStats;
};

export type EventForm = {
  eventType: string;
  name: string;
  hosts: string;
  description: string;
  startsAt: string;
  endsAt: string;
};

export type GuestForm = {
  name: string;
  group: GuestGroup;
};

export type PublicEvent = {
  id: string;
  eventType: string;
  name: string;
  hosts: string;
  description: string;
  startsAt?: string;
  endsAt?: string;
  dateTime?: string;
  slug: string;
};

export type ImportError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type ImportRow = {
  name: string;
  group: GuestGroup;
  rowNumber: number;
};

export type ImportPreviewResponse = {
  validRows: ImportRow[];
  errors: ImportError[];
  inserted: number;
  stats?: EventStats;
};

export type GuestsResponse = {
  guests: GuestRecord[];
  stats: EventStats;
};

export type PublicGuestsResponse = {
  guests: PublicGuest[];
};

export type ConfirmResponse = {
  guest: PublicGuest;
  qrToken: string;
};

export type CheckinResponse = {
  guest: GuestRecord;
  duplicate: boolean;
  stats: EventStats;
};
