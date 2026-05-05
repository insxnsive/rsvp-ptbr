import type { FastifyInstance } from "fastify";
import {
  createSessionToken,
  sessionCookieName,
  sessionMaxAgeSeconds,
  verifyPassword,
  verifySessionToken
} from "../auth.js";
import type { RouteContext } from "./helpers.js";

type LoginBody = {
  username: string;
  password: string;
};

export async function registerAuthRoutes(app: FastifyInstance, context: RouteContext): Promise<void> {
  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute"
        }
      },
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          additionalProperties: false,
          properties: {
            username: { type: "string", minLength: 1, maxLength: 120 },
            password: { type: "string", minLength: 1, maxLength: 240 }
          }
        }
      }
    },
    async (request, reply) => {
      const body = request.body as LoginBody;
      const validUsername = body.username === context.config.adminUsername;
      const validPassword = verifyPassword(body.password, context.config.adminPasswordHash);
      if (!validUsername || !validPassword) {
        return reply.code(401).send({ message: "Usuario ou senha invalidos." });
      }
      const token = createSessionToken(body.username, context.config.sessionSecret);
      return reply
        .setCookie(sessionCookieName, token, {
          httpOnly: true,
          secure: context.config.isProduction,
          sameSite: "strict",
          path: "/",
          maxAge: sessionMaxAgeSeconds
        })
        .send({ authenticated: true, username: body.username });
    }
  );

  app.get("/api/auth/session", async (request) => {
    const claims = verifySessionToken(request.cookies[sessionCookieName], context.config.sessionSecret);
    if (!claims || claims.sub !== context.config.adminUsername) {
      return { authenticated: false };
    }
    return { authenticated: true, username: claims.sub };
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    return reply
      .clearCookie(sessionCookieName, { path: "/" })
      .send({ authenticated: false });
  });
}
