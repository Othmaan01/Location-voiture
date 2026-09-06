import { z } from "zod";

import { FuelSchema, TransmissionSchema, VehicleCategorySchema } from "../enums.js";
import { CurrencySchema } from "../money.js";
import { IsoDateTimeSchema, UuidSchema } from "./common.js";

// ---------------------------------------------------------------------
// Feed des loueurs (accueil)
// ---------------------------------------------------------------------
export const FeedTabSchema = z.enum(["all", "nearby", "premium", "utility", "new"]);
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
    cityName: z.string().nullable(),
    distanceKm: z.number().nullable(),
    vehicleCount: z.number().int(),
    fromDailyCents: z.number().int().nullable(),
    currency: CurrencySchema,
    verified: z.boolean(),
    ratingAverage: z.number().nullable(),
    ratingCount: z.number().int(),
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
    depositCents: z.number().int().nullable(),
    currency: CurrencySchema,
    agencyId: UuidSchema,
    /** Present uniquement si des dates ont ete fournies. */
    available: z.boolean().nullable(),
  })
  .strict();
export type PublicVehicleCard = z.infer<typeof PublicVehicleCardSchema>;

export const LoueurProfileSchema = z
  .object({
    id: UuidSchema,
    name: z.string(),
    slug: z.string(),
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
export const FavoritesResponseSchema = z.object({ vehicles: z.array(SearchResultSchema) }).strict();
