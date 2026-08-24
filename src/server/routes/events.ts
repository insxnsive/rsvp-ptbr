import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { GuestGroup } from "../../shared/types.js";
import { parseGuestWorkbook } from "../importGuests.js";
import type { CreateEventInput, CreateGuestInput } from "../store.js";
import { eventSummary, getIdParam, parseGroup, requireAdmin, type RouteContext } from "./helpers.js";

type EventBody = {
  eventType: string;
  name: string;
  hosts: string;
  description?: string;
  startsAt: string;
  endsAt: string;
};

type GuestBody = {
  name: string;
  group: GuestGroup;
};

function randomSlug(): string {
  return randomBytes(8).toString("base64url").replace(/_/g, "").replace(/-/g, "").slice(0, 10);
}

async function createUniqueSlug(context: RouteContext): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = randomSlug();
    if (!(await context.store.getEventBySlug(slug))) {
      return slug;
    }
  }
  throw new Error("Nao foi possivel gerar um link unico.");
}

function eventSchema() {
  return {
    type: "object",
    required: ["eventType", "name", "hosts", "startsAt", "endsAt"],
    additionalProperties: false,
    properties: {
      eventType: { type: "string", minLength: 2, maxLength: 80 },
      name: { type: "string", minLength: 2, maxLength: 160 },
      hosts: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", maxLength: 700 },
      startsAt: { type: "string", minLength: 10, maxLength: 40 },
      endsAt: { type: "string", minLength: 10, maxLength: 40 }
    }
  };
}

function guestSchema() {
  return {
    type: "object",
    required: ["name", "group"],
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 2, maxLength: 160 },
      group: { type: "string", enum: ["adulto", "crianca"] }
    }
  };
}

function isValidDateTime(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function hasValidEventWindow(body: EventBody): boolean {
  if (!isValidDateTime(body.startsAt) || !isValidDateTime(body.endsAt)) {
    return false;
  }
  return new Date(body.startsAt).getTime() <= new Date(body.endsAt).getTime();
}

export async function registerEventRoutes(app: FastifyInstance, context: RouteContext): Promise<void> {
  app.get("/api/events", async (request, reply) => {
    if (!(await requireAdmin(request, reply, context.config))) {
      return reply;
    }
    const events = await context.store.listEvents();
    return { events: await Promise.all(events.map((event) => eventSummary(event, context))) };
  });

  app.post(
    "/api/events",
    { schema: { body: eventSchema() } },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply, context.config))) {
        return reply;
      }
      const body = request.body as EventBody;
      if (!hasValidEventWindow(body)) {
        return reply.code(400).send({ message: "Periodo do evento invalido." });
      }
      const input: CreateEventInput = {
        ...body,
        description: body.description?.trim() ?? "",
        dateTime: body.startsAt,
        slug: await createUniqueSlug(context)
      };
      const event = await context.store.createEvent(input);
      return reply.code(201).send({ event: await eventSummary(event, context) });
    }
  );

  app.patch(
    "/api/events/:id",
    { schema: { body: eventSchema() } },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply, context.config))) {
        return reply;
      }
      const body = request.body as EventBody;
      if (!hasValidEventWindow(body)) {
        return reply.code(400).send({ message: "Periodo do evento invalido." });
      }
      const event = await context.store.updateEvent(getIdParam(request), {
        ...body,
        description: body.description?.trim() ?? "",
        dateTime: body.startsAt
      });
      if (!event) {
        return reply.code(404).send({ message: "Evento nao encontrado." });
      }
      return { event: await eventSummary(event, context) };
    }
  );

  app.delete("/api/events/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply, context.config))) {
      return reply;
    }
    const deleted = await context.store.softDeleteEvent(getIdParam(request));
    if (!deleted) {
      return reply.code(404).send({ message: "Evento nao encontrado." });
    }
    return { deleted: true };
  });

  app.get("/api/events/:id/guests", async (request, reply) => {
    if (!(await requireAdmin(request, reply, context.config))) {
      return reply;
    }
    const eventId = getIdParam(request);
    const event = await context.store.getEventById(eventId);
    if (!event) {
      return reply.code(404).send({ message: "Evento nao encontrado." });
    }
    const query = request.query as { search?: string; group?: string };
    const guests = await context.store.listGuests(eventId, {
      search: query.search,
      group: parseGroup(query.group)
    });
    return { guests, stats: await context.store.getEventStats(eventId) };
  });

  app.post(
    "/api/events/:id/guests",
    { schema: { body: guestSchema() } },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply, context.config))) {
        return reply;
      }
      const eventId = getIdParam(request);
      const event = await context.store.getEventById(eventId);
      if (!event) {
        return reply.code(404).send({ message: "Evento nao encontrado." });
      }
      const body = request.body as GuestBody;
      const guest = await context.store.createGuest({ eventId, name: body.name, group: body.group });
      return reply.code(201).send({ guest, stats: await context.store.getEventStats(eventId) });
    }
  );

  app.patch(
    "/api/events/:id/guests/:guestId",
    { schema: { body: guestSchema() } },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply, context.config))) {
        return reply;
      }
      const params = request.params as { id: string; guestId: string };
      const guest = await context.store.getGuestById(params.guestId);
      if (!guest || guest.eventId !== params.id) {
        return reply.code(404).send({ message: "Convidado nao encontrado." });
      }
      const body = request.body as GuestBody;
      const updated = await context.store.updateGuest(params.guestId, body);
      return { guest: updated, stats: await context.store.getEventStats(params.id) };
    }
  );

  app.delete("/api/events/:id/guests/:guestId", async (request, reply) => {
    if (!(await requireAdmin(request, reply, context.config))) {
      return reply;
    }
    const params = request.params as { id: string; guestId: string };
    const guest = await context.store.getGuestById(params.guestId);
    if (!guest || guest.eventId !== params.id) {
      return reply.code(404).send({ message: "Convidado nao encontrado." });
    }
    await context.store.softDeleteGuest(params.guestId);
    return { deleted: true, stats: await context.store.getEventStats(params.id) };
  });

  app.post("/api/events/:id/guests/import", async (request, reply) => {
    if (!(await requireAdmin(request, reply, context.config))) {
      return reply;
    }
    const eventId = getIdParam(request);
    const event = await context.store.getEventById(eventId);
    if (!event) {
      return reply.code(404).send({ message: "Evento nao encontrado." });
    }
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ message: "Envie um arquivo Excel ou CSV." });
    }
    const query = request.query as { dryRun?: string };
    const preview = await parseGuestWorkbook(await file.toBuffer(), file.filename);
    const dryRun = query.dryRun !== "false";
    if (dryRun || preview.errors.length > 0) {
      const status = preview.errors.length > 0 && !dryRun ? 400 : 200;
      return reply.code(status).send({ ...preview, inserted: 0 });
    }
    const guests: CreateGuestInput[] = preview.validRows.map((row) => ({
      eventId,
      name: row.name,
      group: row.group
    }));
    const created = await context.store.createGuests(guests);
    return { ...preview, inserted: created.length, stats: await context.store.getEventStats(eventId) };
  });
}
