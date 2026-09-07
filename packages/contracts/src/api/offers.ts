import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/**
 * Offres (ADR-0015) : remise temporaire d'un loueur, sur un vehicule ou sur toute la flotte.
 * Le moteur applique la remise dans le devis ; l'app ne fait qu'afficher.
 */
export const DiscountTypeSchema = z.enum(["percent", "fixed"]);
export type DiscountType = z.infer<typeof DiscountTypeSchema>;

export const OfferInputSchema = z
  .object({
    /** null = toute la flotte publiee de l'organisation. */
    vehicleId: UuidSchema.nullable().optional(),
    title: z.string().trim().min(2).max(60),
    discountType: DiscountTypeSchema,
    /** Pourcent (5 a 70) ou centimes (montant fixe par location). */
    discountValue: z.number().int().min(1).max(1_000_000),
    /** Duree en jours a partir de maintenant (1 a 90). */
    durationDays: z.number().int().min(1).max(90),
  })
  .strict()
  .refine((v) => v.discountType !== "percent" || (v.discountValue >= 5 && v.discountValue <= 70), {
    message: "Une remise en pourcentage va de 5 a 70 %",
    path: ["discountValue"],
  });
export type OfferInput = z.infer<typeof OfferInputSchema>;

export const OfferSchema = z
  .object({
    id: UuidSchema,
    organizationId: UuidSchema,
    vehicleId: UuidSchema.nullable(),
    vehicleLabel: z.string().nullable(),
    title: z.string(),
    discountType: DiscountTypeSchema,
    discountValue: z.number().int(),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    status: z.enum(["active", "archived"]),
    /** Active et dans sa periode de validite. */
    live: z.boolean(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Offer = z.infer<typeof OfferSchema>;
export const OffersResponseSchema = z.object({ offers: z.array(OfferSchema) }).strict();

/** Ce que voit le client sur une carte ou un devis. */
export const PublicOfferSchema = z
  .object({
    id: UuidSchema,
    title: z.string(),
    discountType: DiscountTypeSchema,
    discountValue: z.number().int(),
    endsAt: IsoDateTimeSchema,
  })
  .strict();
export type PublicOffer = z.infer<typeof PublicOfferSchema>;
