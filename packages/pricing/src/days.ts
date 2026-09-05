/**
 * Decoupage d'une periode de location en journees, dans le fuseau de l'agence.
 * Regle v1 : toute periode de 24 h entamee est due (minimum 1 jour).
 * Le fuseau sert a determiner quels jours sont des jours de week-end.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface RentalPeriod {
  /** Instant de debut, ISO 8601 avec offset ou Z. */
  start: string;
  /** Instant de fin, ISO 8601 avec offset ou Z. Strictement apres start. */
  end: string;
}

export function parsePeriod(period: RentalPeriod): { start: Date; end: Date } {
  const start = new Date(period.start);
  const end = new Date(period.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new RangeError("Periode invalide : dates non parsables");
  }
  if (end.getTime() <= start.getTime()) {
    throw new RangeError("Periode invalide : la fin doit etre apres le debut");
  }
  return { start, end };
}

/** Nombre de journees facturables : ceil(duree / 24 h), minimum 1. */
export function billableDays(period: RentalPeriod): number {
  const { start, end } = parsePeriod(period);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
}

/** Jour de la semaine (0 = dimanche … 6 = samedi) d'un instant, dans un fuseau donne. */
export function weekdayInTimeZone(instant: Date, timeZone: string): number {
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
  if (index === -1) throw new RangeError(`Fuseau inconnu : ${timeZone}`);
  return index;
}

/**
 * Pour chaque journee facturable, indique si elle demarre un samedi ou un dimanche
 * dans le fuseau de l'agence. La journee i commence a start + i * 24 h.
 */
export function weekendFlags(period: RentalPeriod, timeZone: string): boolean[] {
  const { start } = parsePeriod(period);
  const days = billableDays(period);
  const flags: boolean[] = [];
  for (let i = 0; i < days; i += 1) {
    const dayStart = new Date(start.getTime() + i * DAY_MS);
    const weekday = weekdayInTimeZone(dayStart, timeZone);
    flags.push(weekday === 0 || weekday === 6);
  }
  return flags;
}
