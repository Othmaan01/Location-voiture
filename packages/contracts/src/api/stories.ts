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
    /** Story video filmee en direct : lue en boucle unique, la progression suit la video. */
    videoUrl: z.string().nullable(),
    durationSeconds: z.number().int().positive().nullable(),
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
export const StoryMediaTypeSchema = z.enum(["photo", "video"]);
export type StoryMediaType = z.infer<typeof StoryMediaTypeSchema>;
/** Duree maximale d'une story video, en secondes : la camera coupe toute seule. */
export const STORY_VIDEO_MAX_SECONDS = 15;
export const STORY_MEDIA_MAX_BYTES = 60 * 1024 * 1024;

export const StorySchema = z
  .object({
    id: UuidSchema,
    mediaType: StoryMediaTypeSchema,
    mediaUrl: z.string(),
    durationSeconds: z.number().int().positive().nullable(),
    caption: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
  })
  .strict();
export const OrgStoriesResponseSchema = z.object({ stories: z.array(StorySchema) }).strict();
export const StoryUploadRequestSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]),
    sizeBytes: z.number().int().min(1).max(STORY_MEDIA_MAX_BYTES),
  })
  .strict();
export type StoryUploadRequest = z.infer<typeof StoryUploadRequestSchema>;
export const StoryConfirmSchema = z
  .object({
    path: z.string().min(10).max(300),
    caption: z.string().trim().max(120).optional(),
    /** Renseigne pour une video ; le moteur tolere une marge au-dela du maximum affiche. */
    durationSeconds: z.number().int().min(1).max(30).optional(),
  })
  .strict();
export type StoryConfirm = z.infer<typeof StoryConfirmSchema>;
