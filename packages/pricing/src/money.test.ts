import { describe, expect, it } from "vitest";

import { add, money, percentBps, subtract, times } from "./money.js";

describe("money", () => {
  it("refuse les non-entiers et les negatifs", () => {
    expect(() => money(10.5, "EUR")).toThrow(TypeError);
    expect(() => money(-1, "EUR")).toThrow(RangeError);
  });
  it("additionne et soustrait dans la meme devise", () => {
    expect(add(money(100, "EUR"), money(250, "EUR"))).toEqual({ cents: 350, currency: "EUR" });
    expect(subtract(money(350, "EUR"), money(100, "EUR"))).toEqual({ cents: 250, currency: "EUR" });
    expect(() => subtract(money(100, "EUR"), money(101, "EUR"))).toThrow(RangeError);
  });
  it("multiplie par un entier", () => {
    expect(times(money(4990, "EUR"), 3)).toEqual({ cents: 14970, currency: "EUR" });
    expect(() => times(money(1, "EUR"), 1.5)).toThrow(TypeError);
  });
  it("applique un pourcentage en points de base avec arrondi au centime, demi vers le haut", () => {
    expect(percentBps(money(10000, "EUR"), 1500)).toEqual({ cents: 1500, currency: "EUR" });
    expect(percentBps(money(333, "EUR"), 1500)).toEqual({ cents: 50, currency: "EUR" }); // 49.95 -> 50
    expect(percentBps(money(1, "EUR"), 4999)).toEqual({ cents: 0, currency: "EUR" }); // 0.4999 -> 0
    expect(percentBps(money(1, "EUR"), 5000)).toEqual({ cents: 1, currency: "EUR" }); // 0.5 -> 1
  });
});
