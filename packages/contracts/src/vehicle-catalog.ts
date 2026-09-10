/**
 * Referentiel des marques et modeles (retour fondateur, 2026-09-09) : tout le monde ecrit
 * « Renault », jamais « REnaUlt ». L'app suggere, le moteur normalise. Les donnees vivent dans
 * vehicle-catalog-data.ts ; une marque absente reste acceptee, mise en forme proprement.
 */
export interface VehicleBrand {
  name: string;
  models: readonly string[];
}

import { VEHICLE_BRANDS } from "./vehicle-catalog-data.js";

export { VEHICLE_BRANDS };

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const squeeze = (s: string) => s.replace(/\s+/g, " ").trim();
/** Mise en forme d'un libelle inconnu : sigles courts conserves (BMW, DFSK), sinon initiale en capitale. */
const titleCase = (s: string) =>
  squeeze(s)
    .split(" ")
    .map((w) =>
      w.length <= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)
        ? w
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");

export function findBrand(input: string): VehicleBrand | undefined {
  const key = fold(input);
  if (!key) return undefined;
  return VEHICLE_BRANDS.find((b) => fold(b.name) === key);
}

/** « REnaUlt » → « Renault » ; marque inconnue → mise en forme propre, jamais rejetee. */
export function normalizeBrand(input: string): string {
  return findBrand(input)?.name ?? titleCase(input);
}

/**
 * « clio v » → « Clio V » : le modele connu garde sa casse officielle, le reste (generation,
 * finition tapee ici) est mis en forme ; un modele inconnu prend une capitale initiale.
 */
export function normalizeModel(brand: string, input: string): string {
  const key = fold(input);
  if (!key) return squeeze(input);
  const models = findBrand(brand)?.models ?? [];
  const exact = models.find((m) => fold(m) === key);
  if (exact) return exact;
  const prefix = [...models]
    .sort((a, b) => b.length - a.length)
    .find((m) => key.startsWith(fold(m) + " "));
  if (prefix) {
    const rest = squeeze(input).slice(prefix.length).trim();
    return rest ? `${prefix} ${titleCase(rest)}` : prefix;
  }
  return squeeze(input).charAt(0).toUpperCase() + squeeze(input).slice(1);
}

const byAlpha = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

/** Liste deroulante : toutes les marques par ordre alphabetique, reduites au prefixe tape (« A » → marques en A). */
export function listBrands(query = ""): string[] {
  const key = fold(query);
  return VEHICLE_BRANDS.map((b) => b.name)
    .filter((n) => !key || fold(n).startsWith(key))
    .sort(byAlpha);
}

/** Modeles de la marque, par ordre alphabetique, reduits au prefixe tape ; vide si la marque est inconnue. */
export function listModels(brand: string, query = ""): string[] {
  const key = fold(query);
  return [...(findBrand(brand)?.models ?? [])]
    .filter((m) => !key || fold(m).startsWith(key))
    .sort(byAlpha);
}

export function suggestBrands(query: string, limit = 6): string[] {
  const key = fold(query);
  if (!key) return [];
  const starts = VEHICLE_BRANDS.filter((b) => fold(b.name).startsWith(key)).map((b) => b.name);
  const contains = VEHICLE_BRANDS.filter(
    (b) => !fold(b.name).startsWith(key) && fold(b.name).includes(key),
  ).map((b) => b.name);
  return [...starts, ...contains].slice(0, limit);
}

export function suggestModels(brand: string, query: string, limit = 8): string[] {
  const models = findBrand(brand)?.models ?? [];
  const key = fold(query);
  if (!key) return models.slice(0, limit);
  const starts = models.filter((m) => fold(m).startsWith(key));
  const contains = models.filter((m) => !fold(m).startsWith(key) && fold(m).includes(key));
  return [...starts, ...contains].slice(0, limit);
}
