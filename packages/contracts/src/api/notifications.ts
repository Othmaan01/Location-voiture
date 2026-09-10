import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/**
 * Centre de notifications (retour, 2026-09-10) : tout ce qui concerne l'utilisateur, lu ou non.
 * Meme source que les push : une ligne par notification, gardee 90 jours (purge quotidienne).
 */
export const NotificationSchema = z
  .object({
    id: UuidSchema,
    /** Famille : `booking.*`, `message.*`, `review.*`, `subscription.*`. */
    kind: z.string(),
    title: z.string(),
    body: z.string(),
    /** Cibles de navigation, ex. `bookingId`, `conversationId`. */
    data: z.record(z.string(), z.string()),
    readAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsResponseSchema = z
  .object({ notifications: z.array(NotificationSchema), unreadCount: z.number().int() })
  .strict();

/** Sans `ids` : tout est marque lu. */
export const MarkNotificationsReadBodySchema = z
  .object({ ids: z.array(UuidSchema).max(200).optional() })
  .strict();
