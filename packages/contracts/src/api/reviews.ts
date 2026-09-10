import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/** Avis (Phase 6, ADR-0012) : un avis par reservation terminee, dans les 30 jours ; reponse publique du loueur. */
export const ReviewSchema = z
  .object({
    id: UuidSchema,
    bookingId: UuidSchema,
    organizationId: UuidSchema,
    /** Vehicule loue lors de la reservation notee (filtre « ce vehicule » sur la fiche). */
    vehicleId: UuidSchema.nullable(),
    vehicleLabel: z.string().nullable(),
    customerName: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().nullable(),
    reply: z.string().nullable(),
    repliedAt: IsoDateTimeSchema.nullable(),
    status: z.enum(["published", "hidden"]),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Review = z.infer<typeof ReviewSchema>;

export const ReviewsResponseSchema = z
  .object({
    reviews: z.array(ReviewSchema),
    ratingAverage: z.number().nullable(),
    ratingCount: z.number().int(),
  })
  .strict();

export const CreateReviewBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();
export type CreateReviewBody = z.infer<typeof CreateReviewBodySchema>;

export const ReplyReviewBodySchema = z
  .object({ reply: z.string().trim().min(1).max(1000) })
  .strict();

export const ModerateReviewBodySchema = z
  .object({ hidden: z.boolean(), reason: z.string().trim().min(3).max(500).optional() })
  .strict();
