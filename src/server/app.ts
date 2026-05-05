import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import type { AppConfig } from "./config.js";
import type { AppStore } from "./store.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCheckinRoutes } from "./routes/checkins.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerPublicRoutes } from "./routes/public.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export type BuildAppOptions = {
  config: AppConfig;
  store: AppStore;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? options.config.isProduction,
    trustProxy: true,
    bodyLimit: 1_000_000
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute"
  });
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024
    }
  });

  const context = { config: options.config, store: options.store };
  await registerAuthRoutes(app, context);
  await registerEventRoutes(app, context);
  await registerPublicRoutes(app, context);
  await registerCheckinRoutes(app, context);

  const clientRoot = path.resolve(dirname, "../../client");
  if (existsSync(path.join(clientRoot, "index.html"))) {
    await app.register(fastifyStatic, {
      root: clientRoot,
      prefix: "/"
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api")) {
        return reply.code(404).send({ message: "Rota nao encontrada." });
      }
      return reply.sendFile("index.html");
    });
  }

  app.addHook("onClose", async () => {
    await options.store.close();
  });

  return app;
}
