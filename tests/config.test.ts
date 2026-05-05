import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "NODE_ENV",
  "PORT",
  "HOST",
  "MONGODB_URI",
  "MONGODB_DB",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD_HASH",
  "SESSION_SECRET",
  "QR_SIGNING_SECRET",
  "PUBLIC_BASE_URL"
] as const;

const originalEnv = new Map<string, string | undefined>();
for (const key of ENV_KEYS) {
  originalEnv.set(key, process.env[key]);
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("config", () => {
  let previousCwd = process.cwd();
  let tempDir = "";

  afterEach(() => {
    process.chdir(previousCwd);
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    restoreEnv();
  });

  it("loads MongoDB URI and secrets from .env", async () => {
    previousCwd = process.cwd();
    tempDir = mkdtempSync(path.join(tmpdir(), "rsvp-config-"));
    process.chdir(tempDir);
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    writeFileSync(
      path.join(tempDir, ".env"),
      [
        "NODE_ENV=production",
        "PORT=8081",
        "HOST=127.0.0.1",
        "MONGODB_URI=mongodb+srv://user:password@cluster.example.mongodb.net/?retryWrites=true&w=majority",
        "MONGODB_DB=rsvp",
        "ADMIN_USERNAME=admin",
        "ADMIN_PASSWORD_HASH=scrypt$32768$8$1$salt$key",
        "SESSION_SECRET=session-secret-at-least-32-characters",
        "QR_SIGNING_SECRET=qr-signing-secret-at-least-32-chars",
        "PUBLIC_BASE_URL=https://rsvp.example.com/"
      ].join("\n")
    );

    vi.resetModules();
    const module = await import("../src/server/config.js");
    const config = module.loadConfig();

    expect(config.mongoUri).toBe("mongodb+srv://user:password@cluster.example.mongodb.net/?retryWrites=true&w=majority");
    expect(config.publicBaseUrl).toBe("https://rsvp.example.com");
  });
});
