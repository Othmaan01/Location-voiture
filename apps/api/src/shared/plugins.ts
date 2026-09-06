import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import type { Database } from "../db/client.js";
import { loadActor } from "./actor.js";
import type { TokenVerifier } from "./auth.js";
import { anonymousActor, type Actor } from "./authz.js";
import { unauthenticated } from "./errors.js";
import type { StorageClient } from "./storage.js";
import type { SupabaseAdmin } from "./supabase-admin.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Acteur resolu pour la requete (anonyme si pas de token). */
    actor: Actor;
    /** Identite verifiee, ou null. */
    identity: { userId: string; email: string | null; aal: "aal1" | "aal2" } | null;
  }
  interface FastifyInstance {
    db: Database;
    verifyToken: TokenVerifier;
    supabaseAdmin: SupabaseAdmin;
    storage: StorageClient;
    /** Hook a poser sur les routes qui exigent un utilisateur authentifie. */
    requireAuth: (request: FastifyRequest) => Promise<void>;
  }
}

export interface AuthPluginOptions {
  db: Database;
  verifyToken: TokenVerifier;
  supabaseAdmin: SupabaseAdmin;
  storage: StorageClient;
}

/**
 * Resout l'acteur sur chaque requete : Authorization: Bearer <jwt>.
 * Un token absent donne un acteur anonyme ; un token invalide donne 401 (jamais silencieux).
 */
export const authPlugin = fp<AuthPluginOptions>(async (app: FastifyInstance, opts) => {
  app.decorate("db", opts.db);
  app.decorate("verifyToken", opts.verifyToken);
  app.decorate("supabaseAdmin", opts.supabaseAdmin);
  app.decorate("storage", opts.storage);
  app.decorateRequest("actor", null as unknown as Actor);
  app.decorateRequest("identity", null);

  app.addHook("onRequest", async (request) => {
    request.actor = anonymousActor;
    request.identity = null;
    const header = request.headers.authorization;
    if (!header) return;
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) throw unauthenticated();
    const identity = await opts.verifyToken(token);
    request.identity = { userId: identity.userId, email: identity.email, aal: identity.aal };
    request.actor = await loadActor(opts.db, identity.userId);
  });

  app.decorate("requireAuth", async (request) => {
    if (!request.identity) throw unauthenticated();
  });
});
