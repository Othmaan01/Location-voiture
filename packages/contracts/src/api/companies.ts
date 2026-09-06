import { z } from "zod";

/**
 * Annuaire des entreprises (source : recherche-entreprises.api.gouv.fr, donnees publiques).
 * Sert a pre-remplir raison sociale et adresse des etablissements a partir d'un SIREN ou d'un SIRET.
 * Ce que renvoie l'annuaire est une aide a la saisie : la verification reste humaine (admin).
 */
export const CompanyLookupQuerySchema = z
  .object({
    /** SIREN (9 chiffres) ou SIRET (14 chiffres). */
    q: z.string().regex(/^[0-9]{9}$|^[0-9]{14}$/, "SIREN (9 chiffres) ou SIRET (14 chiffres)"),
  })
  .strict();

export const CompanyEstablishmentSchema = z
  .object({
    siret: z.string(),
    addressLine: z.string().nullable(),
    postalCode: z.string().nullable(),
    cityName: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    isHeadOffice: z.boolean(),
    /** "A" actif, "F" ferme. */
    active: z.boolean(),
  })
  .strict();
export type CompanyEstablishment = z.infer<typeof CompanyEstablishmentSchema>;

export const CompanyLookupSchema = z
  .object({
    siren: z.string(),
    legalName: z.string(),
    active: z.boolean(),
    headOffice: CompanyEstablishmentSchema.nullable(),
    /** Etablissements correspondant a la requete (le siege, ou le SIRET demande). */
    establishments: z.array(CompanyEstablishmentSchema),
  })
  .strict();
export type CompanyLookup = z.infer<typeof CompanyLookupSchema>;
