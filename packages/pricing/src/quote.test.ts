import { describe, expect, it } from "vitest";

import { billableDays, weekendFlags } from "./days.js";
import { QuoteError, quote, type RatePlan } from "./quote.js";

const PARIS = "Europe/Paris";

const basePlan: RatePlan = {
  currency: "EUR",
  dailyCents: 5000,
  weekendDailyCents: null,
  weeklyCents: null,
  monthlyCents: null,
  depositCents: 80000,
  kmIncludedPerDay: 200,
  extraKmCents: 25,
  minDays: 1,
  maxDays: null,
};

describe("billableDays", () => {
  it("compte toute periode de 24 h entamee, minimum 1", () => {
    expect(
      billableDays({ start: "2026-09-07T09:00:00+02:00", end: "2026-09-07T12:00:00+02:00" }),
    ).toBe(1);
    expect(
      billableDays({ start: "2026-09-07T09:00:00+02:00", end: "2026-09-08T09:00:00+02:00" }),
    ).toBe(1);
    expect(
      billableDays({ start: "2026-09-07T09:00:00+02:00", end: "2026-09-08T09:01:00+02:00" }),
    ).toBe(2);
    expect(
      billableDays({ start: "2026-09-07T09:00:00+02:00", end: "2026-09-14T09:00:00+02:00" }),
    ).toBe(7);
  });
  it("refuse une fin avant ou egale au debut", () => {
    expect(() =>
      billableDays({ start: "2026-09-07T09:00:00Z", end: "2026-09-07T09:00:00Z" }),
    ).toThrow(RangeError);
  });
});

describe("weekendFlags", () => {
  it("identifie samedi et dimanche dans le fuseau de l'agence", () => {
    // Vendredi 11 sept. 2026 10:00 Paris -> 3 jours : ven, sam, dim
    const flags = weekendFlags(
      { start: "2026-09-11T10:00:00+02:00", end: "2026-09-14T10:00:00+02:00" },
      PARIS,
    );
    expect(flags).toEqual([false, true, true]);
  });
  it("tient compte du fuseau : 23:30 UTC vendredi est deja samedi a Paris", () => {
    const flags = weekendFlags(
      { start: "2026-09-11T23:30:00Z", end: "2026-09-12T23:30:00Z" },
      PARIS,
    );
    expect(flags).toEqual([true]);
  });
});

describe("quote — regle v1", () => {
  it("tarif jour simple", () => {
    const q = quote({
      ratePlan: basePlan,
      period: { start: "2026-09-07T09:00:00+02:00", end: "2026-09-10T09:00:00+02:00" },
      agencyTimeZone: PARIS,
    });
    expect(q.days).toBe(3);
    expect(q.total).toEqual({ cents: 15000, currency: "EUR" });
    expect(q.deposit).toEqual({ cents: 80000, currency: "EUR" });
    expect(q.lines).toHaveLength(1);
  });

  it("applique le tarif week-end aux journees samedi/dimanche", () => {
    const plan = { ...basePlan, weekendDailyCents: 6500 };
    const q = quote({
      ratePlan: plan,
      period: { start: "2026-09-11T10:00:00+02:00", end: "2026-09-14T10:00:00+02:00" },
      agencyTimeZone: PARIS,
    });
    expect(q.lines.map((l) => [l.kind, l.quantity])).toEqual([
      ["daily", 1],
      ["weekend", 2],
    ]);
    expect(q.total.cents).toBe(5000 + 2 * 6500);
  });

  it("prend le forfait semaine quand il est plus avantageux", () => {
    const plan = { ...basePlan, weeklyCents: 28000 };
    const q = quote({
      ratePlan: plan,
      period: { start: "2026-09-07T09:00:00+02:00", end: "2026-09-16T09:00:00+02:00" },
      agencyTimeZone: PARIS,
    });
    expect(q.days).toBe(9);
    expect(q.lines.map((l) => [l.kind, l.quantity])).toEqual([
      ["weekly", 1],
      ["daily", 2],
    ]);
    expect(q.total.cents).toBe(28000 + 2 * 5000);
  });

  it("ignore un forfait semaine plus cher que le tarif jour", () => {
    const plan = { ...basePlan, weeklyCents: 40000 };
    const q = quote({
      ratePlan: plan,
      period: { start: "2026-09-07T09:00:00+02:00", end: "2026-09-14T09:00:00+02:00" },
      agencyTimeZone: PARIS,
    });
    expect(q.total.cents).toBe(7 * 5000);
    expect(q.lines[0]?.kind).toBe("daily");
  });

  it("combine mois + semaines + jours", () => {
    const plan = { ...basePlan, weeklyCents: 28000, monthlyCents: 90000 };
    const q = quote({
      ratePlan: plan,
      period: { start: "2026-09-01T09:00:00+02:00", end: "2026-10-10T09:00:00+02:00" },
      agencyTimeZone: PARIS,
    });
    expect(q.days).toBe(39);
    expect(q.lines.map((l) => [l.kind, l.quantity])).toEqual([
      ["monthly", 1],
      ["weekly", 1],
      ["daily", 2],
    ]);
    expect(q.total.cents).toBe(90000 + 28000 + 10000);
  });

  it("respecte la duree minimale et maximale", () => {
    expect(() =>
      quote({
        ratePlan: { ...basePlan, minDays: 2 },
        period: { start: "2026-09-07T09:00:00Z", end: "2026-09-08T09:00:00Z" },
        agencyTimeZone: PARIS,
      }),
    ).toThrow(QuoteError);
    expect(() =>
      quote({
        ratePlan: { ...basePlan, maxDays: 3 },
        period: { start: "2026-09-07T09:00:00Z", end: "2026-09-12T09:00:00Z" },
        agencyTimeZone: PARIS,
      }),
    ).toThrow(QuoteError);
  });

  it("n'ajoute aucun frais cote client (ADR-0008)", () => {
    const q = quote({
      ratePlan: basePlan,
      period: { start: "2026-09-07T09:00:00Z", end: "2026-09-08T09:00:00Z" },
      agencyTimeZone: PARIS,
    });
    expect(q.fees.cents).toBe(0);
    expect(q.total).toEqual(q.subtotal);
  });
});
