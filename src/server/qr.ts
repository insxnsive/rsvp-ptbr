import { createHmac, timingSafeEqual } from "node:crypto";

export type QrClaims = {
  v: 1;
  eventId: string;
  guestId: string;
  nonce: string;
  iat: number;
};

function sign(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function createStableGuestNonce(eventId: string, guestId: string, secret: string): string {
  return createHmac("sha256", secret).update(`nonce:v1:${eventId}:${guestId}`).digest("base64url");
}

export function hashQrNonce(nonce: string, secret: string): string {
  return createHmac("sha256", secret).update(`hash:v1:${nonce}`).digest("base64url");
}

export function signQrToken(claims: QrClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyQrToken(token: string, secret: string): QrClaims | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }
  const expected = sign(payload, secret);
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as QrClaims;
    if (claims.v !== 1 || !claims.eventId || !claims.guestId || !claims.nonce || !claims.iat) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function makeGuestQrToken(eventId: string, guestId: string, secret: string, now = Date.now()): string {
  const nonce = createStableGuestNonce(eventId, guestId, secret);
  return signQrToken(
    {
      v: 1,
      eventId,
      guestId,
      nonce,
      iat: Math.floor(now / 1000)
    },
    secret
  );
}
