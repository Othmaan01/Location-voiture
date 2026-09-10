import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/**
 * Messagerie (Phase 6, ADR-0012) : un fil par couple client / loueur, ou par reservation.
 * Le loueur repond depuis son espace ; chaque membre de l'organisation voit le fil.
 */
export const MessageSchema = z
  .object({
    id: UuidSchema,
    conversationId: UuidSchema,
    /** Cote de l'expediteur, du point de vue du fil. */
    senderSide: z.enum(["customer", "organization"]),
    senderName: z.string(),
    /** Vrai si le lecteur est l'expediteur (affichage a droite). */
    mine: z.boolean(),
    body: z.string(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z
  .object({
    id: UuidSchema,
    organizationId: UuidSchema,
    organizationName: z.string(),
    organizationLogoUrl: z.string().nullable(),
    customerId: UuidSchema,
    /** Prenom et initiale du client (jamais le nom complet cote loueur avant confirmation). */
    customerName: z.string(),
    bookingId: UuidSchema.nullable(),
    bookingReference: z.string().nullable(),
    vehicleLabel: z.string().nullable(),
    lastMessageAt: IsoDateTimeSchema.nullable(),
    lastMessagePreview: z.string().nullable(),
    /** Messages non lus pour le lecteur courant. */
    unreadCount: z.number().int(),
    /** Derniere lecture par l'autre partie : un message envoye avant est « lu » (statut facon iMessage). */
    otherReadAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationsResponseSchema = z
  .object({ conversations: z.array(ConversationSchema) })
  .strict();

export const ConversationDetailSchema = z
  .object({ conversation: ConversationSchema, messages: z.array(MessageSchema) })
  .strict();

export const MessageBodySchema = z
  .string()
  .trim()
  .min(1, "Message vide")
  .max(2000, "2000 caracteres maximum");

/** Ouverture d'un fil par le client : loueur cible, contexte optionnel (vehicule ou reservation), premier message. */
export const StartConversationBodySchema = z
  .object({
    organizationId: UuidSchema,
    vehicleId: UuidSchema.optional(),
    bookingId: UuidSchema.optional(),
    body: MessageBodySchema,
  })
  .strict();
export type StartConversationBody = z.infer<typeof StartConversationBodySchema>;

export const SendMessageBodySchema = z.object({ body: MessageBodySchema }).strict();

export const ConversationMessagesQuerySchema = z
  .object({
    /** Ne renvoie que les messages posterieurs a cette date (rafraichissement leger). */
    after: IsoDateTimeSchema.optional(),
  })
  .strict();

/** Non lus toutes conversations confondues, pour le badge. */
export const UnreadSummarySchema = z
  .object({ customer: z.number().int(), organizations: z.record(z.string(), z.number().int()) })
  .strict();
