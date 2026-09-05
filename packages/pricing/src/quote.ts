import type { Currency, Money } from "@lv/contracts";

import { billableDays, weekendFlags, type RentalPeriod } from "./days.js";
import { add, money, times } from "./money.js";

/**
 * Grille tarifaire d'un vehicule, telle que stockee (centimes).
 * Les paliers semaine/mois sont des prix forfaitaires pour 7 / 30 jours.
 */
export interface RatePlan {
  currency: Currency;
  dailyCents: number;
  weekendDailyCents: number | null;
  weeklyCents: number | null;
  monthlyCents: number | null;
  depositCents: number;
  kmIncludedPerDay: number | null;
  extraKmCents: number | null;
  minDays: number;
  maxDays: number | null;
}

export interface QuoteInput {
  ratePlan: RatePlan;
  period: RentalPeriod;
  /** Fuseau IANA de l'agence de retrait, ex. "Europe/Paris". */
  agencyTimeZone: string;
}

export type QuoteLineKind = "daily" | "weekend" | "weekly" | "monthly";

export interface QuoteLine {
  kind: QuoteLineKind;
  label: string;
  quantity: number;
  unit: Money;
  amount: Money;
}

export interface Quote {
  days: number;
  lines: QuoteLine[];
  subtotal: Money;
  fees: Money;
  total: Money;
  deposit: Money;
}

export class QuoteError extends Error {
  constructor(
    public readonly code: "below_min_days" | "above_max_days",
    message: string,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

/**
 * Regle v1 : le total est le minimum entre
 *   (a) jours au tarif jour / week-end, et
 *   (b) une decomposition mois + semaines + jours quand des forfaits existent.
 * Toute regle future (saisonnalite, promotion, options, livraison) s'ajoute comme
 * une ligne supplementaire, sans modifier ce calcul de base.
 */
export function quote(input: QuoteInput): Quote {
  const { ratePlan, period, agencyTimeZone } = input;
  const days = billableDays(period);

  if (days < ratePlan.minDays) {
    throw new QuoteError("below_min_days", `Duree minimale : ${ratePlan.minDays} jour(s)`);
  }
  if (ratePlan.maxDays !== null && days > ratePlan.maxDays) {
    throw new QuoteError("above_max_days", `Duree maximale : ${ratePlan.maxDays} jour(s)`);
  }

  const currency = ratePlan.currency;
  const daily = money(ratePlan.dailyCents, currency);
  const weekendDaily =
    ratePlan.weekendDailyCents !== null ? money(ratePlan.weekendDailyCents, currency) : null;

  // (a) Decompte jour par jour, week-end distingue si un tarif existe.
  const flags = weekendFlags(period, agencyTimeZone);
  const weekendDays = weekendDaily ? flags.filter(Boolean).length : 0;
  const weekDays = days - weekendDays;
  const perDayLines: QuoteLine[] = [];
  if (weekDays > 0) {
    perDayLines.push({
      kind: "daily",
      label: "Journees",
      quantity: weekDays,
      unit: daily,
      amount: times(daily, weekDays),
    });
  }
  if (weekendDaily && weekendDays > 0) {
    perDayLines.push({
      kind: "weekend",
      label: "Journees week-end",
      quantity: weekendDays,
      unit: weekendDaily,
      amount: times(weekendDaily, weekendDays),
    });
  }
  const perDayTotal = perDayLines.reduce((acc, l) => add(acc, l.amount), money(0, currency));

  // (b) Forfaits : mois puis semaines puis jours restants au tarif jour.
  let best: { lines: QuoteLine[]; total: Money } = { lines: perDayLines, total: perDayTotal };
  if (ratePlan.weeklyCents !== null || ratePlan.monthlyCents !== null) {
    const lines: QuoteLine[] = [];
    let remaining = days;
    if (ratePlan.monthlyCents !== null && remaining >= 30) {
      const months = Math.floor(remaining / 30);
      const unit = money(ratePlan.monthlyCents, currency);
      lines.push({
        kind: "monthly",
        label: "Forfait mois",
        quantity: months,
        unit,
        amount: times(unit, months),
      });
      remaining -= months * 30;
    }
    if (ratePlan.weeklyCents !== null && remaining >= 7) {
      const weeks = Math.floor(remaining / 7);
      const unit = money(ratePlan.weeklyCents, currency);
      lines.push({
        kind: "weekly",
        label: "Forfait semaine",
        quantity: weeks,
        unit,
        amount: times(unit, weeks),
      });
      remaining -= weeks * 7;
    }
    if (remaining > 0) {
      lines.push({
        kind: "daily",
        label: "Journees",
        quantity: remaining,
        unit: daily,
        amount: times(daily, remaining),
      });
    }
    const total = lines.reduce((acc, l) => add(acc, l.amount), money(0, currency));
    if (total.cents < best.total.cents) {
      best = { lines, total };
    }
  }

  const fees = money(0, currency); // Aucun frais plateforme cote client (ADR-0008).
  return {
    days,
    lines: best.lines,
    subtotal: best.total,
    fees,
    total: add(best.total, fees),
    deposit: money(ratePlan.depositCents, currency),
  };
}
