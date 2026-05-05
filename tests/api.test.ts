import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/server/app.js";
import { MemoryStore } from "../src/server/memoryStore.js";
import { makeGuestQrToken } from "../src/server/qr.js";
import { testConfig } from "./testConfig.js";

let app: FastifyInstance;
let cookie = "";
const config = testConfig();

async function login(): Promise<void> {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username: "admin", password: "secret-password" }
  });
  const rawCookie = response.headers["set-cookie"];
  cookie = Array.isArray(rawCookie) ? rawCookie[0] : String(rawCookie);
}

describe("API", () => {
  beforeEach(async () => {
    app = await buildApp({ config, store: new MemoryStore(), logger: false });
  });

  afterEach(async () => {
    await app.close();
    cookie = "";
  });

  it("protects admin APIs", async () => {
    const response = await app.inject({ method: "GET", url: "/api/events" });
    expect(response.statusCode).toBe(401);
  });

  it("runs the event, RSVP, QR check-in, and duplicate flow", async () => {
    await login();
    const eventResponse = await app.inject({
      method: "POST",
      url: "/api/events",
      headers: { cookie },
      payload: {
        eventType: "Casamento",
        name: "Ana & Bruno",
        hosts: "Ana e Bruno",
        description: "Cerimonia e festa.",
        startsAt: "2027-01-20T18:00",
        endsAt: "2027-01-21T02:00"
      }
    });
    expect(eventResponse.statusCode).toBe(201);
    const eventBody = eventResponse.json<{ event: { id: string; slug: string } }>();

    const guestResponse = await app.inject({
      method: "POST",
      url: `/api/events/${eventBody.event.id}/guests`,
      headers: { cookie },
      payload: { name: "José Silva", group: "adulto" }
    });
    expect(guestResponse.statusCode).toBe(201);

    const searchResponse = await app.inject({
      method: "GET",
      url: `/api/public/events/${eventBody.event.slug}/guests?search=jose`
    });
    const searchBody = searchResponse.json<{ guests: Array<{ id: string }> }>();
    expect(searchBody.guests).toHaveLength(1);

    const confirmResponse = await app.inject({
      method: "POST",
      url: `/api/public/events/${eventBody.event.slug}/confirm`,
      payload: { guestId: searchBody.guests[0].id }
    });
    expect(confirmResponse.statusCode).toBe(200);
    const confirmBody = confirmResponse.json<{ qrToken: string }>();

    const qrResponse = await app.inject({
      method: "POST",
      url: `/api/events/${eventBody.event.id}/checkins/qr`,
      headers: { cookie },
      payload: { token: confirmBody.qrToken }
    });
    expect(qrResponse.statusCode).toBe(200);
    expect(qrResponse.json<{ duplicate: boolean }>().duplicate).toBe(false);

    const duplicateResponse = await app.inject({
      method: "POST",
      url: `/api/events/${eventBody.event.id}/checkins/qr`,
      headers: { cookie },
      payload: { token: confirmBody.qrToken }
    });
    expect(duplicateResponse.statusCode).toBe(200);
    expect(duplicateResponse.json<{ duplicate: boolean }>().duplicate).toBe(true);

    const undoResponse = await app.inject({
      method: "DELETE",
      url: `/api/events/${eventBody.event.id}/checkins/${searchBody.guests[0].id}`,
      headers: { cookie }
    });
    expect(undoResponse.statusCode).toBe(200);
    expect(undoResponse.json<{ guest: { checkedInAt?: string } }>().guest.checkedInAt).toBeUndefined();
  });

  it("rejects QR tokens for the wrong event", async () => {
    await login();
    const eventResponse = await app.inject({
      method: "POST",
      url: "/api/events",
      headers: { cookie },
      payload: {
        eventType: "Aniversario",
        name: "Festa",
        hosts: "Lia",
        description: "",
        startsAt: "2027-02-20T18:00",
        endsAt: "2027-02-20T23:30"
      }
    });
    const eventBody = eventResponse.json<{ event: { id: string } }>();
    const token = makeGuestQrToken("other-event", "guest-1", config.qrSigningSecret);
    const response = await app.inject({
      method: "POST",
      url: `/api/events/${eventBody.event.id}/checkins/qr`,
      headers: { cookie },
      payload: { token }
    });
    expect(response.statusCode).toBe(400);
  });
});
