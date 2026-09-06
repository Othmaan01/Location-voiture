import type { CompanyEstablishment, CompanyLookup } from "@lv/contracts";

import { DomainError, notFound } from "../../shared/errors.js";

/**
 * Annuaire des entreprises : recherche-entreprises.api.gouv.fr (donnees publiques,
 * sans cle). Aide a la saisie uniquement : la verification reste humaine.
 * Cache memoire court pour ne pas solliciter l'annuaire a chaque frappe.
 */
const DIRECTORY_URL = "https://recherche-entreprises.api.gouv.fr/search";
const TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 500;

interface DirectoryEstablishment {
  siret?: string | null;
  adresse?: string | null;
  numero_voie?: string | null;
  type_voie?: string | null;
  libelle_voie?: string | null;
  code_postal?: string | null;
  libelle_commune?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  etat_administratif?: string | null;
  est_siege?: boolean | null;
}
interface DirectoryResult {
  siren?: string | null;
  nom_complet?: string | null;
  nom_raison_sociale?: string | null;
  etat_administratif?: string | null;
  siege?: DirectoryEstablishment | null;
  matching_etablissements?: DirectoryEstablishment[] | null;
}
export interface DirectoryResponse {
  results?: DirectoryResult[] | null;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Ligne d'adresse sans code postal ni ville (l'annuaire renvoie l'adresse complete en un bloc). */
function addressLineOf(e: DirectoryEstablishment): string | null {
  const parts = [e.numero_voie, e.type_voie, e.libelle_voie].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (!e.adresse) return null;
  const tail = [e.code_postal, e.libelle_commune].filter(Boolean).join(" ");
  const line = tail ? e.adresse.replace(tail, "") : e.adresse;
  return line.trim() || null;
}

function establishmentDto(e: DirectoryEstablishment): CompanyEstablishment | null {
  if (!e.siret) return null;
  return {
    siret: e.siret,
    addressLine: addressLineOf(e),
    postalCode: e.code_postal ?? null,
    cityName: e.libelle_commune ?? null,
    latitude: toNumber(e.latitude),
    longitude: toNumber(e.longitude),
    isHeadOffice: e.est_siege === true,
    active: e.etat_administratif !== "F",
  };
}

/** Pur et teste : transforme la reponse de l'annuaire en contrat API. */
export function mapCompany(response: DirectoryResponse, query: string): CompanyLookup | null {
  const result = response.results?.[0];
  if (!result?.siren) return null;
  if (!result.siren.startsWith(query.slice(0, 9))) return null;
  const headOffice = result.siege ? establishmentDto(result.siege) : null;
  const matching = (result.matching_etablissements ?? [])
    .map(establishmentDto)
    .filter((e): e is CompanyEstablishment => e !== null);
  const establishments =
    query.length === 14
      ? matching.filter((e) => e.siret === query)
      : matching.length > 0
        ? matching
        : headOffice
          ? [headOffice]
          : [];
  if (query.length === 14 && establishments.length === 0 && headOffice?.siret === query)
    establishments.push(headOffice);
  return {
    siren: result.siren,
    legalName: result.nom_raison_sociale ?? result.nom_complet ?? result.siren,
    active: result.etat_administratif !== "F",
    headOffice,
    establishments,
  };
}

export interface CompaniesService {
  lookup(query: string): Promise<CompanyLookup>;
}

export function createCompaniesService(
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): CompaniesService {
  const cache = new Map<string, { at: number; value: CompanyLookup | null }>();

  async function fetchDirectory(query: string): Promise<DirectoryResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const url = `${DIRECTORY_URL}?q=${encodeURIComponent(query)}&page=1&per_page=1`;
      const response = await fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`directory ${response.status}`);
      return (await response.json()) as DirectoryResponse;
    } catch {
      throw new DomainError(
        "unavailable",
        "L'annuaire des entreprises ne repond pas. Reessayez dans un instant ou saisissez les informations a la main.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async lookup(query) {
      const cached = cache.get(query);
      if (cached && now() - cached.at < CACHE_TTL_MS) {
        if (!cached.value) throw notFound("Entreprise");
        return cached.value;
      }
      const value = mapCompany(await fetchDirectory(query), query);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
      cache.set(query, { at: now(), value });
      if (!value)
        throw new DomainError(
          "not_found",
          "Aucune entreprise trouvee pour ce numero dans l'annuaire officiel.",
        );
      return value;
    },
  };
}
