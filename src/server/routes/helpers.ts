import type { FastifyReply, FastifyRequest } from "fastify";
import { makePublicUrl, type AppConfig } from "../config.js";
import type { AppStore } from "../store.js";
import { sessionCookieName, verifySessionToken } from "../auth.js";
import type { EventRecord, EventSummary, GuestGroup } from "../../shared/types.js";

export type RouteContext = {
  config: AppConfig;
  store: AppStore;
};

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  config: AppConfig
): Promise<boolean> {
  const claims = verifySessionToken(request.cookies[sessionCookieName], config.sessionSecret);
  if (!claims || claims.sub !== config.adminUsername) {
    await reply.code(401).send({ message: "Login necessario." });
    return false;
  }
  return true;
}

export function getIdParam(request: FastifyRequest): string {
  return (request.params as { id: string }).id;
}

export function getSlugParam(request: FastifyRequest): string {
  return (request.params as { slug: string }).slug;
}

export function normalizeEvent(event: EventRecord): EventRecord {
  const startsAt = event.startsAt ?? event.dateTime;
  const endsAt = event.endsAt ?? startsAt;
  return {
    ...event,
    description: event.description ?? "",
    startsAt,
    endsAt,
    dateTime: event.dateTime ?? startsAt
  };
}

export async function eventSummary(event: EventRecord, context: RouteContext): Promise<EventSummary> {
  const normalized = normalizeEvent(event);
  return {
    ...normalized,
    stats: await context.store.getEventStats(event.id),
    publicUrl: makePublicUrl(context.config, normalized.slug)
  };
}

export function parseGroup(value: unknown): GuestGroup | undefined {
  return value === "adulto" || value === "crianca" ? value : undefined;
}
