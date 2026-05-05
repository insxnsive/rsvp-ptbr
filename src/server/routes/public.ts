import type { FastifyInstance } from "fastify";
import type { PublicGuest } from "../../shared/types.js";
import { createStableGuestNonce, hashQrNonce, makeGuestQrToken } from "../qr.js";
import { getSlugParam, normalizeEvent, type RouteContext } from "./helpers.js";

type ConfirmBody = {
  guestId: string;
};

export async function registerPublicRoutes(app: FastifyInstance, context: RouteContext): Promise<void> {
  app.get("/api/public/events/:slug", async (request, reply) => {
    const event = await context.store.getEventBySlug(getSlugParam(request));
    if (!event) {
      return reply.code(404).send({ message: "Evento nao encontrado." });
    }
    const normalized = normalizeEvent(event);
    return {
      event: {
        id: normalized.id,
        eventType: normalized.eventType,
        name: normalized.name,
        hosts: normalized.hosts,
        description: normalized.description ?? "",
        startsAt: normalized.startsAt,
        endsAt: normalized.endsAt,
        dateTime: normalized.dateTime,
        slug: normalized.slug
      }
    };
  });

  app.get("/api/public/events/:slug/guests", async (request, reply) => {
    const event = await context.store.getEventBySlug(getSlugParam(request));
    if (!event) {
      return reply.code(404).send({ message: "Evento nao encontrado." });
    }
    const query = request.query as { search?: string };
    const search = query.search?.trim() ?? "";
    if (search.length < 2) {
      return { guests: [] };
    }
    const guests = await context.store.listGuests(event.id, { search, limit: 20 });
    const publicGuests: PublicGuest[] = guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      group: guest.group,
      rsvpAt: guest.rsvpAt,
      checkedInAt: guest.checkedInAt
    }));
    return { guests: publicGuests };
  });

  app.post(
    "/api/public/events/:slug/confirm",
    {
      schema: {
        body: {
          type: "object",
          required: ["guestId"],
          additionalProperties: false,
          properties: {
            guestId: { type: "string", minLength: 1, maxLength: 120 }
          }
        }
      }
    },
    async (request, reply) => {
      const event = await context.store.getEventBySlug(getSlugParam(request));
      if (!event) {
        return reply.code(404).send({ message: "Evento nao encontrado." });
      }
      const body = request.body as ConfirmBody;
      const guest = await context.store.getGuestById(body.guestId);
      if (!guest || guest.eventId !== event.id) {
        return reply.code(404).send({ message: "Convidado nao encontrado." });
      }
      const nonce = createStableGuestNonce(event.id, guest.id, context.config.qrSigningSecret);
      const updated = await context.store.confirmGuest(
        event.id,
        guest.id,
        hashQrNonce(nonce, context.config.qrSigningSecret)
      );
      if (!updated) {
        return reply.code(404).send({ message: "Convidado nao encontrado." });
      }
      return {
        guest: {
          id: updated.id,
          name: updated.name,
          group: updated.group,
          rsvpAt: updated.rsvpAt
        },
        qrToken: makeGuestQrToken(event.id, updated.id, context.config.qrSigningSecret)
      };
    }
  );
}
