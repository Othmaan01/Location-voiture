import { z } from "zod";

import { FuelSchema, TransmissionSchema, VehicleCategorySchema } from "../enums.js";
import { CurrencySchema } from "../money.js";
import { IsoDateTimeSchema, UuidSchema } from "./common.js";
import { PublicOfferSchema } from "./offers.js";
import { AccentSchema } from "./organizations.js";

// ---------------------------------------------------------------------
// Feed des loueurs (accueil)
// ---------------------------------------------------------------------
export const FeedTabSchema = z.enum(["all", "nearby", "premium", "utility", "new", "offers"]);
export type FeedTab = z.infer<typeof FeedTabSchema>;

export const FeedQuerySchema = z
  .object({
    tab: FeedTabSchema.default("all"),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(300).default(50),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
  })
  .strict();
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const VehicleThumbSchema = z
  .object({
    id: UuidSchema,
    brand: z.string(),
    model: z.string(),
    category: VehicleCategorySchema,
    photoUrl: z.string().nullable(),
    dailyCents: z.number().int().nullable(),
  })
  .strict();

export const LoueurSummarySchema = z
  .object({
    id: UuidSchema,
    name: z.string(),
    slug: z.string(),
    logoUrl: z.string().nullable(),
    accent: AccentSchema,
    cityName: z.string().nullable(),
    distanceKm: z.number().nullable(),
    vehicleCount: z.number().int(),
    fromDailyCents: z.number().int().nullable(),
    currency: CurrencySchema,
    verified: z.boolean(),
    ratingAverage: z.number().nullable(),
    ratingCount: z.number().int(),
    /** Meilleure offre en cours du loueur, s'il y en a une. */
    offer: PublicOfferSchema.nullable(),
    /** Jusqu'a 3 vignettes pour la carte du feed. */
    thumbnails: z.array(VehicleThumbSchema).max(3),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type LoueurSummary = z.infer<typeof LoueurSummarySchema>;

export const FeedResponseSchema = z
  .object({ items: z.array(LoueurSummarySchema), nextCursor: z.string().nullable() })
  .strict();

// ---------------------------------------------------------------------
// Profil public d'un loueur
// ---------------------------------------------------------------------
export const PublicAgencySchema = z
  .object({
    id: UuidSchema,
    name: z.string(),
    addressLine: z.string().nullable(),
    postalCode: z.string().nullable(),
    cityName: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    phone: z.string().nullable(),
    openingHours: z.record(z.string(), z.array(z.tuple([z.string(), z.string()]))),
    description: z.string().nullable(),
    photoUrl: z.string().nullable(),
  })
  .strict();

export const PublicVehicleCardSchema = z
  .object({
    id: UuidSchema,
    brand: z.string(),
    model: z.string(),
    version: z.string().nullable(),
    category: VehicleCategorySchema,
    transmission: TransmissionSchema,
    fuel: FuelSchema,
    seats: z.number().int(),
    photoUrl: z.string().nullable(),
    dailyCents: z.number().int().nullable(),
    /** Prix journalier apres offre, si une offre s'applique (affichage barre). */
    discountedDailyCents: z.number().int().nullable(),
    offer: PublicOfferSchema.nullable(),
    depositCents: z.number().int().nullable(),
    currency: CurrencySchema,
    agencyId: UuidSchema,
    /** Present uniquement si des dates ont ete fournies. */
    available: z.boolean().nullable(),
  })
  .strict();
export type PublicVehicleCard = z.infer<typeof PublicVehicleCardSchema>;

/** Fiche vehicule publique (retour fondateur, 2026-09-09) : toutes les photos, les caracteristiques, le tarif, l'agence, le loueur. */
export const PublicVehicleDetailSchema = PublicVehicleCardSchema.omit({ photoUrl: true })
  .extend({
    photos: z.array(z.string()),
    year: z.number().int().nullable(),
    doors: z.number().int().nullable(),
    luggage: z.number().int().nullable(),
    color: z.string().nullable(),
    description: z.string().nullable(),
    options: z.array(z.string()),
    minDriverAge: z.number().int().nullable(),
    minLicenseYears: z.number().int().nullable(),
    ratePlan: z
      .object({
        weekendDailyCents: z.number().int().nullable(),
        weeklyCents: z.number().int().nullable(),
        monthlyCents: z.number().int().nullable(),
        kmIncludedPerDay: z.number().int().nullable(),
        extraKmCents: z.number().int().nullable(),
        minDays: z.number().int().nullable(),
        maxDays: z.number().int().nullable(),
      })
      .nullable(),
    agency: z
      .object({
        id: UuidSchema,
        name: z.string(),
        addressLine: z.string().nullable(),
        postalCode: z.string().nullable(),
        cityName: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        phone: z.string().nullable(),
        /** Fuseau IANA de l'agence : l'estimation sur la fiche utilise le meme calcul que le devis. */
        timezone: z.string(),
      })
      .strict(),
    loueur: z
      .object({
        id: UuidSchema,
        name: z.string(),
        logoUrl: z.string().nullable(),
        accent: AccentSchema,
        verified: z.boolean(),
        ratingAverage: z.number().nullable(),
        ratingCount: z.number().int(),
        vehicleCount: z.number().int(),
      })
      .strict(),
  })
  .strict();
export type PublicVehicleDetail = z.infer<typeof PublicVehicleDetailSchema>;

export const LoueurProfileSchema = z
  .object({
    id: UuidSchema,
    name: z.string(),
    slug: z.string(),
    logoUrl: z.string().nullable(),
    bannerUrl: z.string().nullable(),
    bio: z.string().nullable(),
    website: z.string().nullable(),
    accent: AccentSchema,
    verified: z.boolean(),
    ratingAverage: z.number().nullable(),
    ratingCount: z.number().int(),
    vehicleCount: z.number().int(),
    /** Taux et delai de reponse : null tant qu'il n'y a pas assez de demandes. */
    responseRate: z.number().nullable(),
    responseTimeHours: z.number().nullable(),
    agencies: z.array(PublicAgencySchema),
    vehicles: z.array(PublicVehicleCardSchema),
    memberSince: IsoDateTimeSchema,
  })
  .strict();
export type LoueurProfile = z.infer<typeof LoueurProfileSchema>;

// ---------------------------------------------------------------------
// Recherche de vehicules (Explorer)
// ---------------------------------------------------------------------
export const SearchQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    citySlug: z.string().trim().max(80).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(300).default(30),
    from: IsoDateTimeSchema.optional(),
    to: IsoDateTimeSchema.optional(),
    categories: z
      .string()
      .transform((s) => s.split(",").filter(Boolean))
      .pipe(z.array(VehicleCategorySchema))
      .optional(),
    transmission: TransmissionSchema.optional(),
    fuel: FuelSchema.optional(),
    minSeats: z.coerce.number().int().min(1).max(60).optional(),
    maxDailyCents: z.coerce.number().int().min(100).optional(),
    sort: z.enum(["relevance", "price_asc", "price_desc", "distance"]).default("relevance"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .strict()
  .refine((v) => (v.from === undefined) === (v.to === undefined), {
    message: "from et to vont ensemble",
    path: ["to"],
  });
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultSchema = PublicVehicleCardSchema.extend({
  loueurId: UuidSchema,
  loueurName: z.string(),
  loueurVerified: z.boolean(),
  cityName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  distanceKm: z.number().nullable(),
  /** Total pour les dates demandees, calcule par le serveur ; null sans dates. */
  totalCents: z.number().int().nullable(),
  days: z.number().int().nullable(),
}).strict();
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z
  .object({ items: z.array(SearchResultSchema), total: z.number().int() })
  .strict();

export const CitySchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    departmentCode: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
  })
  .strict();
export const CitiesResponseSchema = z.object({ cities: z.array(CitySchema) }).strict();

// ---------------------------------------------------------------------
// Favoris
// ---------------------------------------------------------------------
/** Groupe de favoris (retour fondateur, 2026-09-10) : un nom libre, ex. « Mariage Mejdi 2027 ». */
export const FavoriteGroupSchema = z
  .object({ id: UuidSchema, name: z.string(), count: z.number().int() })
  .strict();
export type FavoriteGroup = z.infer<typeof FavoriteGroupSchema>;

export const FavoriteVehicleSchema = SearchResultSchema.extend({ groupId: UuidSchema.nullable() });
export type FavoriteVehicle = z.infer<typeof FavoriteVehicleSchema>;

export const FavoritesResponseSchema = z
  .object({ vehicles: z.array(FavoriteVehicleSchema), groups: z.array(FavoriteGroupSchema) })
  .strict();

/** Enregistrer un favori, eventuellement dans un groupe ; `null` = sans groupe. */
export const SaveFavoriteBodySchema = z
  .object({ groupId: UuidSchema.nullable().optional() })
  .strict();
export const FavoriteGroupBodySchema = z
  .object({ name: z.string().trim().min(1, "Nom requis").max(40, "40 caractères maximum") })
  .strict();

/** Disponibilite publique d'un vehicule : intervalles occupes (reservations fermes et blocages), sans detail. */
export const VehicleAvailabilitySchema = z
  .object({
    vehicleId: UuidSchema,
    from: IsoDateTimeSchema,
    to: IsoDateTimeSchema,
    unavailable: z.array(
      z
        .object({
          from: IsoDateTimeSchema,
          to: IsoDateTimeSchema,
          kind: z.enum(["booking", "block"]),
        })
        .strict(),
    ),
  })
  .strict();
export type VehicleAvailability = z.infer<typeof VehicleAvailabilitySchema>;
