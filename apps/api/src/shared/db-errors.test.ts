import { describe, expect, it } from "vitest";

import { isBusinessRuleViolation, isUniqueViolation, translateDbError } from "./db-errors.js";
import { DomainError } from "./errors.js";

const pg = (code: string, message = "boom") => Object.assign(new Error(message), { code });

describe("db-errors — erreurs Postgres enveloppees par Drizzle", () => {
  it("reconnait un code SQLSTATE direct ou dans la chaine des causes", () => {
    expect(isUniqueViolation(pg("23505"))).toBe(true);
    const wrapped = Object.assign(new Error("Failed query"), { cause: pg("23505") });
    expect(isUniqueViolation(wrapped)).toBe(true);
    const twice = Object.assign(new Error("outer"), { cause: wrapped });
    expect(isUniqueViolation(twice)).toBe(true);
    expect(
      isBusinessRuleViolation(Object.assign(new Error("x"), { cause: pg("23514", "regle") })),
    ).toBe(true);
  });
  it("traduit en 409 avec le message du trigger, et relance le reste", () => {
    const wrapped = Object.assign(new Error("Failed query"), {
      cause: pg("23514", "Une organisation doit conserver au moins un proprietaire"),
    });
    expect(() => translateDbError(wrapped)).toThrow(DomainError);
    try {
      translateDbError(wrapped);
    } catch (e) {
      expect((e as DomainError).code).toBe("conflict");
      expect((e as DomainError).message).toContain("proprietaire");
    }
    expect(() => translateDbError(new Error("autre"))).toThrow("autre");
  });
});
