import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

import type { Env } from "../env.js";
import { unauthenticated } from "./errors.js";

export interface VerifiedIdentity {
  userId: string;
  email: string | null;
  /** Niveau d'assurance d'authentification Supabase : "aal2" = MFA validee. */
  aal: "aal1" | "aal2";
  sessionId: string | null;
}

export type TokenVerifier = (token: string) => Promise<VerifiedIdentity>;

function toIdentity(payload: JWTPayload): VerifiedIdentity {
  const sub = payload.sub;
  if (!sub) throw unauthenticated();
  const email = typeof payload["email"] === "string" ? payload["email"] : null;
  const aal = payload["aal"] === "aal2" ? "aal2" : "aal1";
  const sessionId = typeof payload["session_id"] === "string" ? payload["session_id"] : null;
  return { userId: sub, email, aal, sessionId };
}

/**
 * Construit le verificateur de JWT Supabase.
 * - Production : JWKS distant (cles asymetriques, rotation geree par Supabase).
 * - Local : secret HS256 partage du projet local (SUPABASE_JWT_SECRET).
 * L'audience "authenticated" et l'emetteur sont toujours verifies.
 */
export function createTokenVerifier(
  env: Pick<Env, "SUPABASE_URL" | "API_JWT_ISSUER" | "SUPABASE_JWT_SECRET">,
): TokenVerifier {
  const issuer = env.API_JWT_ISSUER;
  if (env.SUPABASE_JWT_SECRET) {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    return async (token) => {
      try {
        const { payload } = await jwtVerify(token, secret, {
          issuer,
          audience: "authenticated",
          algorithms: ["HS256"],
        });
        return toIdentity(payload);
      } catch {
        throw unauthenticated();
      }
    };
  }
  const jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  return createVerifierFromKeySource(jwks, issuer);
}

/** Variante injectable (tests) : verifie avec un jeu de cles local. */
export function createVerifierFromKeySource(
  getKey: JWTVerifyGetKey,
  issuer: string,
): TokenVerifier {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, getKey, {
        issuer,
        audience: "authenticated",
        algorithms: ["ES256", "RS256"],
      });
      return toIdentity(payload);
    } catch {
      throw unauthenticated();
    }
  };
}

export { createLocalJWKSet };
