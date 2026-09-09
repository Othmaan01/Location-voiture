import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/** Evaluation d'un client par un loueur (ADR-0020) : une note par reservation terminee. */
export const CustomerReviewInputSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(600).optional(),
  })
  .strict();
export type CustomerReviewInput = z.infer<typeof CustomerReviewInputSchema>;

export const CustomerReviewSchema = z
  .object({
    id: UuidSchema,
    bookingId: UuidSchema,
    organizationId: UuidSchema,
    organizationName: z.string(),
    rating: z.number().int(),
    comment: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type CustomerReview = z.infer<typeof CustomerReviewSchema>;
export const CustomerReviewsResponseSchema = z
  .object({
    reviews: z.array(CustomerReviewSchema),
    average: z.number().nullable(),
    count: z.number().int(),
  })
  .strict();
