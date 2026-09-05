import { SignJWT, generateKeyPair, exportJWK } from "jose";
import { describe, expect, it } from "vitest";

import { createLocalJWKSet, createVerifierFromKeySource } from "./auth.js";
import { DomainError } from "./errors.js";

const ISSUER = "https://example.supabase.co/auth/v1";

async function setup() {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256" };
  const verify = createVerifierFromKeySource(createLocalJWKSet({ keys: [jwk] }), ISSUER);
  const sign = (
    claims: Record<string, unknown>,
    opts: { iss?: string; aud?: string; exp?: string } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: "k1" })
      .setIssuer(opts.iss ?? ISSUER)
      .setAudience(opts.aud ?? "authenticated")
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "5m")
      .sign(privateKey);
  return { verify, sign };
}

describe("verification des JWT Supabase", () => {
  it("accepte un token valide et extrait l'identite", async () => {
    const { verify, sign } = await setup();
    const token = await sign({
      sub: "11111111-1111-4111-8111-111111111111",
      email: "a@b.c",
      aal: "aal2",
      session_id: "s1",
    });
    await expect(verify(token)).resolves.toEqual({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "a@b.c",
      aal: "aal2",
      sessionId: "s1",
    });
  });

  it("refuse un token expire, un mauvais emetteur, une mauvaise audience, une signature inconnue", async () => {
    const { verify, sign } = await setup();
    const expired = await sign({ sub: "u" }, { exp: "-1m" });
    const badIssuer = await sign({ sub: "u" }, { iss: "https://evil.example" });
    const badAudience = await sign({ sub: "u" }, { aud: "anon" });
    const other = await setup();
    const foreignKey = await other.sign({ sub: "u" });
    for (const token of [expired, badIssuer, badAudience, foreignKey, "not-a-jwt"]) {
      await expect(verify(token)).rejects.toBeInstanceOf(DomainError);
      await expect(verify(token)).rejects.toMatchObject({ code: "unauthenticated" });
    }
  });

  it("refuse un token sans sujet", async () => {
    const { verify, sign } = await setup();
    await expect(verify(await sign({ email: "x@y.z" }))).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });
});
