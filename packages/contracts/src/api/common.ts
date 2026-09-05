import { z } from "zod";

export const UuidSchema = z.uuid();
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });

export const HealthResponseSchema = z
  .object({
    status: z.literal("ok"),
    version: z.string(),
    time: IsoDateTimeSchema,
  })
  .strict();
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/** Pagination par curseur : jamais d'offset sur des listes qui grandissent. */
export const PaginationQuerySchema = z
  .object({
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
