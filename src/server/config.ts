import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

export type AppConfig = {
  nodeEnv: string;
  isProduction: boolean;
  host: string;
  port: number;
  mongoUri: string;
  mongoDb: string;
  adminUsername: string;
  adminPasswordHash: string;
  sessionSecret: string;
  qrSigningSecret: string;
  publicBaseUrl: string;
};

let envLoaded = false;

function loadDotEnvIfPresent(): void {
  if (envLoaded) {
    return;
  }
  envLoaded = true;

  const envPath = path.join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function requiredSecret(name: string): string {
  const value = required(name);
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  loadDotEnvIfPresent();
  const lifecycleEvent = process.env.npm_lifecycle_event ?? "";
  const nodeEnv = process.env.NODE_ENV ?? (lifecycleEvent.startsWith("dev") ? "development" : "production");
  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? "8080"),
    mongoUri: required("MONGODB_URI"),
    mongoDb: required("MONGODB_DB"),
    adminUsername: required("ADMIN_USERNAME"),
    adminPasswordHash: required("ADMIN_PASSWORD_HASH"),
    sessionSecret: requiredSecret("SESSION_SECRET"),
    qrSigningSecret: requiredSecret("QR_SIGNING_SECRET"),
    publicBaseUrl: required("PUBLIC_BASE_URL").replace(/\/$/, "")
  };
}

export function makePublicUrl(config: Pick<AppConfig, "publicBaseUrl">, slug: string): string {
  return `${config.publicBaseUrl}/${slug}`;
}
