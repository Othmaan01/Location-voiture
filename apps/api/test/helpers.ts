import { exportJWK, generateKeyPair, SignJWT } from "jose";
import pino from "pino";

import { createDatabase, type Database } from "../src/db/client.js";
import { buildServer } from "../src/server.js";
import type { StorageClient } from "../src/shared/storage.js";
import {
  createLocalJWKSet,
  createVerifierFromKeySource,
  type TokenVerifier,
} from "../src/shared/auth.js";

export const TEST_ISSUER = "http://127.0.0.1:54321/auth/v1";

/** Jeu de cles ES256 ephemere : les tests signent leurs propres JWT, comme le ferait Supabase. */
export async function createTestKeys() {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "ES256";
  jwk.use = "sig";
  const verifyToken: TokenVerifier = createVerifierFromKeySource(
    createLocalJWKSet({ keys: [jwk] }),
    TEST_ISSUER,
  );
  const sign = (userId: string, overrides: Record<string, unknown> = {}) =>
    new SignJWT({ email: `${userId.slice(0, 8)}@test.local`, aal: "aal1", ...overrides })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setIssuer(TEST_ISSUER)
      .setAudience("authenticated")
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);
  return { verifyToken, sign };
}

export const testDatabaseUrl = process.env["TEST_DATABASE_URL"];

/** Base d'integration : sautee proprement si TEST_DATABASE_URL est absent. */
export function createTestDatabase() {
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL manquant");
  return createDatabase(testDatabaseUrl);
}

export async function createTestServer(db: Database, verifyToken: TokenVerifier) {
  return buildServer({
    env: {
      API_CORS_ORIGINS: [],
      API_VERSION: "test",
      NODE_ENV: "test",
      APP_DEEP_LINK_SCHEME: "lv",
    },
    supabaseAdmin: { deleteUser: async () => undefined },
    storage: fakeStorage(),
    notifications: { notifyUser: async () => undefined, notifyOrganization: async () => undefined },
    db,
    verifyToken,
    logger: pino({ level: process.env["TEST_LOG_LEVEL"] ?? "silent" }),
  });
}

/** Insere un utilisateur dans auth.users (le trigger cree le profil). */
export async function createAuthUser(
  sql: ReturnType<typeof createDatabase>["sql"],
  email: string,
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', ${email}, 'x', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    returning id`;
  return rows[0]!.id;
}

/**
 * Stockage simule : les tests d'integration verifient la logique metier (chemins,
 * autorisations, positions) sans dependre du service Storage. `exists` reconnait
 * les chemins pour lesquels une URL d'upload a ete emise.
 */
export function fakeStorage(): StorageClient & { issued: Set<string>; removed: string[] } {
  const issued = new Set<string>();
  const removed: string[] = [];
  return {
    issued,
    removed,
    async createSignedUploadUrl(bucket, path) {
      issued.add(`${bucket}/${path}`);
      return { uploadUrl: `https://storage.test/upload/${bucket}/${path}`, token: "t" };
    },
    async createSignedReadUrl(bucket, path) {
      return `https://storage.test/signed/${bucket}/${path}?exp=300`;
    },
    publicUrl(bucket, path) {
      return `https://storage.test/public/${bucket}/${path}`;
    },
    async remove(bucket, paths) {
      removed.push(...paths.map((p) => `${bucket}/${p}`));
    },
    async exists(bucket, path) {
      return issued.has(`${bucket}/${path}`);
    },
  };
}
