import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const n = 32768;
  const r = 8;
  const p = 1;
  const key = scryptSync(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: SCRYPT_MAX_MEMORY }).toString(
    "base64url"
  );
  return `scrypt$${n}$${r}$${p}$${salt}$${key}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [scheme, nRaw, rRaw, pRaw, salt, expectedRaw] = hash.split("$");
  if (scheme !== "scrypt" || !nRaw || !rRaw || !pRaw || !salt || !expectedRaw) {
    return false;
  }
  const expected = Buffer.from(expectedRaw, "base64url");
  const actual = scryptSync(password, salt, expected.length, {
    N: Number(nRaw),
    r: Number(rRaw),
    p: Number(pRaw),
    maxmem: SCRYPT_MAX_MEMORY
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type SessionClaims = {
  sub: string;
  exp: number;
};

export function createSessionToken(username: string, secret: string, now = Date.now()): string {
  const claims: SessionClaims = {
    sub: username,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS
  };
  const payload = base64Url(JSON.stringify(claims));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): SessionClaims | null {
  if (!token) {
    return null;
  }
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
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.sub || claims.exp < Math.floor(now / 1000)) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export const sessionCookieName = "rsvp_session";
export const sessionMaxAgeSeconds = SESSION_TTL_SECONDS;
