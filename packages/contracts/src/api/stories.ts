import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";
import { PublicOfferSchema } from "./offers.js";
import { AccentSchema } from "./organizations.js";

/**
 * Stories (ADR-0016) : bulles en tete du feed. Le contenu est genere par le moteur
 * (offre en cours, vehicules ajoutes cette semaine) et complete par une story manuelle
 * du loueur (photo + legende, 48 h). Zero travail impose au loueur.
 */
export const StoryItemSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["offer", "new_vehicle", "story"]),
    imageUrl: z.string().nullable(),
    title: z.string(),
    subtitle: z.string().nullable(),
    vehicleId: UuidSchema.nullable(),
    offer: PublicOfferSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type StoryItem = z.infer<typeof StoryItemSchema>;

export const StoryGroupSchema = z
  .object({
    organizationId: UuidSchema,
    name: z.string(),
    logoUrl: z.string().nullable(),
    accent: AccentSchema,
    /** Type dominant, pour la couleur de l'anneau. */
    highlight: z.enum(["offer", "new_vehicle", "story"]),
    items: z.array(StoryItemSchema).min(1),
    latestAt: IsoDateTimeSchema,
  })
  .strict();
export type StoryGroup = z.infer<typeof StoryGroupSchema>;
export const StoriesResponseSchema = z.object({ groups: z.array(StoryGroupSchema) }).strict();

/** Story manuelle (cote loueur). */
export const StorySchema = z
  .object({
    id: UuidSchema,
    photoUrl: z.string(),
    caption: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict();
export const OrgStoriesResponseSchema = z.object({ stories: z.array(StorySchema) }).strict();
export const StoryConfirmSchema = z
  .object({ path: z.string().min(10).max(300), caption: z.string().trim().max(120).optional() })
  .strict();
