import type { FastifyInstance } from "fastify";
import { hashQrNonce, verifyQrToken } from "../qr.js";
import { getIdParam, requireAdmin, type RouteContext } from "./helpers.js";

type ManualBody = {
  guestId: string;
};

type QrBody = {
  token: string;
};

export async function registerCheckinRoutes(app: FastifyInstance, context: RouteContext): Promise<void> {
  app.post(
    "/api/events/:id/checkins/manual",
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
      if (!(await requireAdmin(request, reply, context.config))) {
        return reply;
      }
      const eventId = getIdParam(request);
      const event = await context.store.getEventById(eventId);
      if (!event) {
        return reply.code(404).send({ message: "Evento nao encontrado." });
      }
      const body = request.body as ManualBody;
      const guest = await context.store.getGuestById(body.guestId);
      if (!guest || guest.eventId !== eventId) {
        return reply.code(404).send({ message: "Convidado nao encontrado." });
      }
      const result = await context.store.checkInGuest(guest.id, "manual");
      if (!result) {
        return reply.code(404).send({ message: "Convidado nao encontrado." });
      }
      await context.store.createCheckinLog({
        eventId,
        guestId: result.guest.id,
        method: "manual",
        duplicate: result.duplicate
      });
      return { ...result, stats: await context.store.getEventStats(eventId) };
    }
  );

  app.delete("/api/events/:id/checkins/:guestId", async (request, reply) => {
    if (!(await requireAdmin(request, reply, context.config))) {
      return reply;
    }
    const params = request.params as { id: string; guestId: string };
    const event = await context.store.getEventById(params.id);
    if (!event) {
      return reply.code(404).send({ message: "Evento nao encontrado." });
    }
    const guest = await context.store.getGuestById(params.guestId);
    if (!guest || guest.eventId !== params.id || !guest.checkedInAt) {
      return reply.code(404).send({ message: "Entrada nao encontrada." });
    }
    const updated = await context.store.undoCheckInGuest(params.guestId);
    if (!updated) {
      return reply.code(404).send({ message: "Entrada nao encontrada." });
    }
    await context.store.createCheckinLog({
      eventId: params.id,
      guestId: updated.id,
      method: "undo",
      duplicate: false
    });
    return { guest: updated, duplicate: false, stats: await context.store.getEventStats(params.id) };
  });

  app.post(
    "/api/events/:id/checkins/qr",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          additionalProperties: false,
          properties: {
            token: { type: "string", minLength: 20, maxLength: 2000 }
          }
        }
      }
    },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply, context.config))) {
        return reply;
      }
      const eventId = getIdParam(request);
      const event = await context.store.getEventById(eventId);
      if (!event) {
        return reply.code(404).send({ message: "Evento nao encontrado." });
      }
      const body = request.body as QrBody;
      const claims = verifyQrToken(body.token, context.config.qrSigningSecret);
      if (!claims || claims.eventId !== eventId) {
        return reply.code(400).send({ message: "QRCode invalido para este evento." });
      }
      const guest = await context.store.getGuestById(claims.guestId);
      if (!guest || guest.eventId !== eventId || !guest.rsvpAt || !guest.qrNonceHash) {
        return reply.code(400).send({ message: "QRCode ainda nao confirmado." });
      }
      const nonceHash = hashQrNonce(claims.nonce, context.config.qrSigningSecret);
      if (nonceHash !== guest.qrNonceHash) {
        return reply.code(400).send({ message: "QRCode foi substituido ou nao e valido." });
      }
      const result = await context.store.checkInGuest(guest.id, "qr");
      if (!result) {
        return reply.code(404).send({ message: "Convidado nao encontrado." });
      }
      await context.store.createCheckinLog({
        eventId,
        guestId: result.guest.id,
        method: "qr",
        duplicate: result.duplicate
      });
      return { ...result, stats: await context.store.getEventStats(eventId) };
    }
  );
}
