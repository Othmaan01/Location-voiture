import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import Fastify, { type FastifyError } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { Logger } from "pino";

import type { Database } from "./db/client.js";
import type { Env } from "./env.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { agenciesRoutes } from "./modules/agencies/routes.js";
import { availabilityRoutes } from "./modules/availability/routes.js";
import { bookingsRoutes } from "./modules/bookings/routes.js";
import { devicesRoutes } from "./modules/devices/routes.js";
import { documentsRoutes } from "./modules/documents/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { identityRoutes } from "./modules/identity/routes.js";
import type { NotificationsService } from "./modules/notifications/service.js";
import { organizationsRoutes } from "./modules/organizations/routes.js";
import { publicCatalogRoutes } from "./modules/public-catalog/routes.js";
import { vehiclesRoutes } from "./modules/vehicles/routes.js";
import type { TokenVerifier } from "./shared/auth.js";
import { DomainError } from "./shared/errors.js";
import { idempotencyPlugin } from "./shared/idempotency.js";
import { authPlugin } from "./shared/plugins.js";
import type { StorageClient } from "./shared/storage.js";
import type { SupabaseAdmin } from "./shared/supabase-admin.js";

export interface BuildServerOptions {
  env: Pick<Env, "API_CORS_ORIGINS" | "API_VERSION" | "NODE_ENV" | "APP_DEEP_LINK_SCHEME">;
  db: Database;
  verifyToken: TokenVerifier;
  supabaseAdmin: SupabaseAdmin;
  storage: StorageClient;
  notifications: NotificationsService;
  logger: Logger;
}

/** Assemble l'application sans l'ecouter : reutilise par main.ts et par les tests. */
export async function buildServer(opts: BuildServerOptions) {
  const app = Fastify({
    loggerInstance: opts.logger,
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,
    bodyLimit: 1024 * 256,
    disableRequestLogging: opts.env.NODE_ENV === "test",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: opts.env.API_CORS_ORIGINS.length > 0 ? opts.env.API_CORS_ORIGINS : false,
    credentials: false,
  });
  await app.register(sensible);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.identity?.userId ?? request.ip,
    errorResponseBuilder: (request, context) => ({
      error: {
        code: "rate_limited",
        message: `Trop de requetes. Reessayez dans ${context.after}.`,
        requestId: request.id,
      },
    }),
  });
  await app.register(swagger, {
    openapi: {
      info: { title: "Location Voiture API", version: opts.env.API_VERSION },
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      },
      security: [{ bearerAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(authPlugin, {
    db: opts.db,
    verifyToken: opts.verifyToken,
    supabaseAdmin: opts.supabaseAdmin,
    storage: opts.storage,
    notifications: opts.notifications,
  });
  await app.register(idempotencyPlugin, { db: opts.db });

  app.setErrorHandler((rawError: unknown, request, reply) => {
    const error = rawError as FastifyError;
    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }
    if (hasZodFastifySchemaValidationErrors(rawError)) {
      return reply.code(422).send({
        error: {
          code: "validation_failed",
          message: "Requete invalide.",
          requestId: request.id,
          details: {
            issues: rawError.validation.map((v) => ({ path: v.instancePath, message: v.message })),
          },
        },
      });
    }
    const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error, requestId: request.id }, "unhandled error");
      return reply
        .code(500)
        .send({ error: { code: "internal", message: "Erreur interne.", requestId: request.id } });
    }
    const code =
      statusCode === 401
        ? "unauthenticated"
        : statusCode === 403
          ? "forbidden"
          : statusCode === 404
            ? "not_found"
            : statusCode === 429
              ? "rate_limited"
              : "validation_failed";
    return reply
      .code(statusCode)
      .send({ error: { code, message: error.message, requestId: request.id } });
  });

  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .send({ error: { code: "not_found", message: "Route introuvable.", requestId: request.id } }),
  );

  await app.register(healthRoutes, { version: opts.env.API_VERSION });
  await app.register(identityRoutes);
  await app.register(devicesRoutes);
  await app.register(organizationsRoutes, { deepLinkScheme: opts.env.APP_DEEP_LINK_SCHEME });
  await app.register(agenciesRoutes);
  await app.register(vehiclesRoutes);
  await app.register(documentsRoutes);
  await app.register(publicCatalogRoutes);
  await app.register(availabilityRoutes);
  await app.register(bookingsRoutes);
  await app.register(adminRoutes, { requireMfa: opts.env.NODE_ENV === "production" });

  app.get("/openapi.json", { config: { rateLimit: false } }, async () => app.swagger());

  return app;
}

export type AppServer = Awaited<ReturnType<typeof buildServer>>;
