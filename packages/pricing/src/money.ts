import type { Currency, Money } from "@lv/contracts";

/**
 * Arithmetique monetaire entiere (ADR-0004).
 * Toute operation sur un montant passe par ici. Aucun flottant ne sort de ce module.
 */

function assertInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${label} doit etre un entier sur (recu ${value})`);
  }
}

export function money(cents: number, currency: Currency): Money {
  assertInteger(cents, "cents");
  if (cents < 0) throw new RangeError("Un Money ne peut pas etre negatif");
  return { cents, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Devises differentes : ${String(a.currency)} vs ${String(b.currency)}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents + b.cents, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  if (b.cents > a.cents) throw new RangeError("Resultat negatif interdit");
  return money(a.cents - b.cents, a.currency);
}

/** Multiplie par un entier (ex. : tarif jour x nombre de jours). */
export function times(a: Money, factor: number): Money {
  assertInteger(factor, "factor");
  if (factor < 0) throw new RangeError("Facteur negatif interdit");
  return money(a.cents * factor, a.currency);
}

/**
 * Applique un pourcentage exprime en points de base (10 000 = 100 %),
 * arrondi au centime le plus proche, demi-centime vers le haut.
 */
export function percentBps(a: Money, bps: number): Money {
  assertInteger(bps, "bps");
  if (bps < 0) throw new RangeError("Pourcentage negatif interdit");
  const numerator = a.cents * bps;
  const rounded = Math.floor((numerator + 5000) / 10000);
  return money(rounded, a.currency);
}

export function min(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.cents <= b.cents ? a : b;
}

export function isZero(a: Money): boolean {
  return a.cents === 0;
}
