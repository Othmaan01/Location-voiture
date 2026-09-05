import { describe, expect, it } from "vitest";

import { generateInvitationToken, hashInvitationToken, isValidSiret } from "./service.js";

describe("isValidSiret", () => {
  it("valide un SIRET avec cle de Luhn correcte", () => {
    expect(isValidSiret("73282932000074")).toBe(true);
    expect(isValidSiret("44306184100047")).toBe(true);
  });
  it("refuse un format ou une cle incorrects", () => {
    expect(isValidSiret("73282932000075")).toBe(false);
    expect(isValidSiret("1234")).toBe(false);
    expect(isValidSiret("7328293200007a")).toBe(false);
  });
});

describe("jetons d'invitation", () => {
  it("genere des jetons uniques, longs, en base64url", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("hache de facon deterministe et irreversible (sha256 hex)", () => {
    const t = generateInvitationToken();
    expect(hashInvitationToken(t)).toBe(hashInvitationToken(t));
    expect(hashInvitationToken(t)).toHaveLength(64);
    expect(hashInvitationToken(t)).not.toContain(t);
  });
});
