import { createPasswordHash } from "../src/server/auth.js";
import type { AppConfig } from "../src/server/config.js";

export function testConfig(): AppConfig {
  return {
    nodeEnv: "test",
    isProduction: false,
    host: "127.0.0.1",
    port: 0,
    mongoUri: "mongodb://example.invalid",
    mongoDb: "rsvp-test",
    adminUsername: "admin",
    adminPasswordHash: createPasswordHash("secret-password"),
    sessionSecret: "session-secret-for-tests-at-least-32-chars",
    qrSigningSecret: "qr-signing-secret-for-tests-at-least-32",
    publicBaseUrl: "https://rsvp.test"
  };
}
