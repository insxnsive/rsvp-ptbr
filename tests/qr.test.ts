import { describe, expect, it } from "vitest";
import { createStableGuestNonce, hashQrNonce, makeGuestQrToken, verifyQrToken } from "../src/server/qr.js";

const secret = "qr-signing-secret-for-tests-at-least-32";

describe("QR tokens", () => {
  it("signs and verifies stable guest tokens", () => {
    const token = makeGuestQrToken("event-1", "guest-1", secret, 1_700_000_000_000);
    const claims = verifyQrToken(token, secret);
    expect(claims?.eventId).toBe("event-1");
    expect(claims?.guestId).toBe("guest-1");
    expect(hashQrNonce(claims?.nonce ?? "", secret)).toBe(
      hashQrNonce(createStableGuestNonce("event-1", "guest-1", secret), secret)
    );
  });

  it("rejects tampered tokens", () => {
    const token = makeGuestQrToken("event-1", "guest-1", secret);
    expect(verifyQrToken(`${token}x`, secret)).toBeNull();
  });
});
