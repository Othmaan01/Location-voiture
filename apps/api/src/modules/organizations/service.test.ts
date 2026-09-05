import { describe, expect, it } from "vitest";

import { isValidSiret } from "./service.js";

describe("isValidSiret", () => {
  it("valide un SIRET avec cle de Luhn correcte", () => {
    expect(isValidSiret("73282932000074")).toBe(true); // exemple INSEE
    expect(isValidSiret("44306184100047")).toBe(true);
  });
  it("refuse un format ou une cle incorrects", () => {
    expect(isValidSiret("73282932000075")).toBe(false);
    expect(isValidSiret("1234")).toBe(false);
    expect(isValidSiret("7328293200007a")).toBe(false);
  });
});
