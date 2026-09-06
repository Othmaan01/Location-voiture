import { z } from "zod";

import {
  FuelSchema,
  TransmissionSchema,
  VehicleCategorySchema,
  VehicleStatusSchema,
} from "../enums.js";
import { CurrencySchema } from "../money.js";
import { IsoDateTimeSchema, UuidSchema } from "./common.js";
import { SiretSchema } from "./organizations.js";

// ---------------------------------------------------------------------
// Agences (points de retrait)
// ---------------------------------------------------------------------
export const AgencyStatusSchema = z.enum(["draft", "published", "suspended"]);

const OpeningHoursSchema = z.partialRecord(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.array(z.tuple([z.string().regex(/^\d{2}:\d{2}$/), z.string().regex(/^\d{2}:\d{2}$/)])).max(3),
);

export const AgencyInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    /** SIRET de l'etablissement : doit commencer par le SIREN de l'organisation (verifie serveur). */
    siret: SiretSchema.nullable().optional(),
    addressLine: z.string().trim().min(3).max(200).nullable().optional(),
    postalCode: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z -]{3,10}$/)
      .nullable()
      .optional(),
    cityName: z.string().trim().min(1).max(120).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    timezone: z.string().min(3).max(64).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 .-]{6,20}$/)
      .nullable()
      .optional(),
    email: z.email().nullable().optional(),
    openingHours: OpeningHoursSchema.optional(),
    services: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    description: z.string().trim().max(600).nullable().optional(),
  })
  .strict();
export type AgencyInput = z.infer<typeof AgencyInputSchema>;
export const AgencyUpdateSchema = AgencyInputSchema.partial().strict();
export type AgencyUpdate = z.infer<typeof AgencyUpdateSchema>;

export const AgencySchema = z
  .object({
    id: UuidSchema,
    organizationId: UuidSchema,
    name: z.string(),
    slug: z.string(),
    siret: z.string().nullable(),
    addressLine: z.string().nullable(),
    postalCode: z.string().nullable(),
    cityName: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    timezone: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    openingHours: OpeningHoursSchema,
    services: z.array(z.string()),
    description: z.string().nullable(),
    photoUrl: z.string().nullable(),
    status: AgencyStatusSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Agency = z.infer<typeof AgencySchema>;
export const AgencyPhotoConfirmSchema = z.object({ path: z.string().min(10).max(300) }).strict();
export const AgenciesResponseSchema = z.object({ agencies: z.array(AgencySchema) }).strict();

/**
 * Suppression d'un vehicule : supprime vraiment s'il n'a aucun historique de reservation,
 * sinon archive (l'historique est conserve). Le serveur decide, la reponse le dit.
 */
export const VehicleDeleteOutcomeSchema = z
  .object({ outcome: z.enum(["deleted", "archived"]) })
  .strict();
export type VehicleDeleteOutcome = z.infer<typeof VehicleDeleteOutcomeSchema>;

// ---------------------------------------------------------------------
// Grille tarifaire (centimes, ADR-0004)
// ---------------------------------------------------------------------
export const RatePlanInputSchema = z
  .object({
    currency: CurrencySchema.default("EUR"),
    dailyCents: z.number().int().min(100).max(10_000_000),
    weekendDailyCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
    weeklyCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
    monthlyCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    depositCents: z.number().int().min(0).max(100_000_000).default(0),
    kmIncludedPerDay: z.number().int().min(0).max(10_000).nullable().optional(),
    extraKmCents: z.number().int().min(0).max(100_000).nullable().optional(),
    minDays: z.number().int().min(1).max(365).default(1),
    maxDays: z.number().int().min(1).max(365).nullable().optional(),
  })
  .strict()
  .refine((v) => v.maxDays == null || v.maxDays >= v.minDays, {
    message: "maxDays doit etre >= minDays",
    path: ["maxDays"],
  });
export type RatePlanInput = z.infer<typeof RatePlanInputSchema>;

export const RatePlanSchema = z
  .object({
    id: UuidSchema,
    currency: CurrencySchema,
    dailyCents: z.number().int(),
    weekendDailyCents: z.number().int().nullable(),
    weeklyCents: z.number().int().nullable(),
    monthlyCents: z.number().int().nullable(),
    depositCents: z.number().int(),
    kmIncludedPerDay: z.number().int().nullable(),
    extraKmCents: z.number().int().nullable(),
    minDays: z.number().int(),
    maxDays: z.number().int().nullable(),
  })
  .strict();
export type RatePlan = z.infer<typeof RatePlanSchema>;

// ---------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------
export const PhotoUploadRequestSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().min(1).max(8_388_608),
  })
  .strict();

export const SignedUploadSchema = z
  .object({
    /** Chemin a renvoyer a la confirmation. */
    path: z.string(),
    /** URL signee : PUT du fichier binaire, en-tete Content-Type = mimeType. */
    uploadUrl: z.string(),
    token: z.string(),
    expiresAt: IsoDateTimeSchema,
  })
  .strict();

export const PhotoConfirmSchema = z
  .object({
    path: z.string().min(10).max(300),
    width: z.number().int().min(1).max(20000).optional(),
    height: z.number().int().min(1).max(20000).optional(),
    blurhash: z.string().max(60).optional(),
  })
  .strict();

export const VehiclePhotoSchema = z
  .object({
    id: UuidSchema,
    position: z.number().int(),
    url: z.string(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    blurhash: z.string().nullable(),
  })
  .strict();
export type VehiclePhoto = z.infer<typeof VehiclePhotoSchema>;

export const ReorderPhotosSchema = z
  .object({ photoIds: z.array(UuidSchema).min(1).max(30) })
  .strict();

// ---------------------------------------------------------------------
// Vehicules
// ---------------------------------------------------------------------
export const VehicleInputSchema = z
  .object({
    agencyId: UuidSchema,
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    version: z.string().trim().max(60).nullable().optional(),
    year: z.number().int().min(1950).max(2100).nullable().optional(),
    category: VehicleCategorySchema,
    transmission: TransmissionSchema,
    fuel: FuelSchema,
    seats: z.number().int().min(1).max(60).default(5),
    doors: z.number().int().min(2).max(6).default(5),
    luggage: z.number().int().min(0).max(20).default(2),
    color: z.string().trim().max(40).nullable().optional(),
    licensePlate: z.string().trim().max(20).nullable().optional(),
    options: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    description: z.string().trim().max(4000).nullable().optional(),
    minDriverAge: z.number().int().min(16).max(99).default(21),
    minLicenseYears: z.number().int().min(0).max(50).default(2),
  })
  .strict();
export type VehicleInput = z.infer<typeof VehicleInputSchema>;
export const VehicleUpdateSchema = VehicleInputSchema.partial().strict();
export type VehicleUpdate = z.infer<typeof VehicleUpdateSchema>;

/** Vue membre : complete (plaque incluse). */
export const VehicleSchema = z
  .object({
    id: UuidSchema,
    organizationId: UuidSchema,
    agencyId: UuidSchema,
    brand: z.string(),
    model: z.string(),
    version: z.string().nullable(),
    year: z.number().int().nullable(),
    category: VehicleCategorySchema,
    transmission: TransmissionSchema,
    fuel: FuelSchema,
    seats: z.number().int(),
    doors: z.number().int(),
    luggage: z.number().int(),
    color: z.string().nullable(),
    licensePlate: z.string().nullable(),
    options: z.array(z.string()),
    description: z.string().nullable(),
    minDriverAge: z.number().int(),
    minLicenseYears: z.number().int(),
    status: VehicleStatusSchema,
    suspendedAt: IsoDateTimeSchema.nullable(),
    photos: z.array(VehiclePhotoSchema),
    ratePlan: RatePlanSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();
export type Vehicle = z.infer<typeof VehicleSchema>;
export const VehiclesResponseSchema = z.object({ vehicles: z.array(VehicleSchema) }).strict();

/** Ce qui empeche la publication, pour guider le pro. */
export const PublishBlockerSchema = z.enum([
  "organization_not_verified",
  "no_photo",
  "no_rate_plan",
  "agency_incomplete",
  "quota_reached",
]);
export const PublishCheckSchema = z
  .object({ canPublish: z.boolean(), blockers: z.array(PublishBlockerSchema) })
  .strict();
