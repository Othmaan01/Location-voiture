import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import type { Database } from "../db/client.js";
import { idempotencyKeys } from "../db/schema.js";
import { DomainError } from "./errors.js";

declare module "fastify" {
  interface FastifyContextConfig {
    /** La route exige un en-tete Idempotency-Key ; la reponse est memorisee 24 h. */
    idempotent?: boolean;
  }
}

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Idempotence des creations (ADR-0005) : un retry reseau avec la meme cle renvoie
 * la meme reponse, jamais une seconde ressource. La cle est par utilisateur et par route ;
 * une meme cle avec un corps different est refusee.
 */
export const idempotencyPlugin = fp<{ db: Database }>(async (app: FastifyInstance, opts) => {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.routeOptions.config.idempotent) return;
    if (!request.identity) return; // requireAuth a deja repondu 401
    const key = request.headers["idempotency-key"];
    if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
      throw new DomainError(
        "validation_failed",
        "En-tete Idempotency-Key requis (8 a 128 caracteres).",
      );
    }
    const route = `${request.method} ${request.routeOptions.url ?? request.url}`;
    const requestHash = createHash("sha256")
      .update(JSON.stringify(request.body ?? null))
      .digest("hex");
    const [existing] = await opts.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, request.identity.userId), eq(idempotencyKeys.key, key)))
      .limit(1);
    if (existing) {
      if (existing.route !== route || existing.requestHash !== requestHash) {
        throw new DomainError(
          "idempotency_key_reused",
          "Cette cle d'idempotence a deja ete utilisee avec une autre requete.",
        );
      }
      if (existing.responseStatus !== null) {
        return reply
          .code(existing.responseStatus)
          .header("idempotent-replayed", "true")
          .send(existing.responseBody);
      }
      throw new DomainError("conflict", "Une requete identique est en cours de traitement.");
    }
    try {
      await opts.db
        .insert(idempotencyKeys)
        .values({ key, userId: request.identity.userId, route, requestHash });
    } catch {
      throw new DomainError("conflict", "Une requete identique est en cours de traitement.");
    }
    request.idempotency = { key, userId: request.identity.userId };
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const ctx = request.idempotency;
    if (!ctx) return payload;
    let body: unknown = null;
    if (typeof payload === "string" && payload.length > 0) {
      try {
        body = JSON.parse(payload);
      } catch {
        body = payload;
      }
    }
    if (reply.statusCode >= 500) {
      // Echec serveur : on libere la cle pour permettre un vrai retry.
      await opts.db
        .delete(idempotencyKeys)
        .where(and(eq(idempotencyKeys.userId, ctx.userId), eq(idempotencyKeys.key, ctx.key)));
    } else {
      await opts.db
        .update(idempotencyKeys)
        .set({ responseStatus: reply.statusCode, responseBody: body })
        .where(and(eq(idempotencyKeys.userId, ctx.userId), eq(idempotencyKeys.key, ctx.key)));
    }
    return payload;
  });
});

declare module "fastify" {
  interface FastifyRequest {
    idempotency?: { key: string; userId: string };
  }
}
