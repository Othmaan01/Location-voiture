import { z } from "zod";

import { DocumentKindSchema, DocumentStatusSchema, OrganizationStatusSchema } from "../enums.js";
import { IsoDateTimeSchema, UuidSchema } from "./common.js";

export const DocumentUploadRequestSchema = z
  .object({
    kind: DocumentKindSchema,
    mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().min(1).max(10_485_760),
  })
  .strict();

export const DocumentConfirmSchema = z
  .object({
    path: z.string().min(10).max(300),
    kind: DocumentKindSchema,
    /** Date d'expiration declaree (assurance). */
    expiresAt: z.iso.date().optional(),
  })
  .strict();

export const DocumentSchema = z
  .object({
    id: UuidSchema,
    kind: DocumentKindSchema,
    status: DocumentStatusSchema,
    mimeType: z.string(),
    sizeBytes: z.number().int(),
    expiresAt: z.iso.date().nullable(),
    rejectionReason: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Document = z.infer<typeof DocumentSchema>;
export const DocumentsResponseSchema = z.object({ documents: z.array(DocumentSchema) }).strict();

/** URL de lecture temporaire (<= 5 min), chaque emission est journalisee. */
export const DocumentReadUrlSchema = z
  .object({ url: z.string(), expiresAt: IsoDateTimeSchema })
  .strict();

export const VerificationStatusSchema = z
  .object({
    status: OrganizationStatusSchema,
    statusReason: z.string().nullable(),
    /** Ce qui manque avant de pouvoir soumettre. */
    missing: z.array(z.enum(["kbis", "insurance", "agency", "siret"])),
    submittedAt: IsoDateTimeSchema.nullable(),
  })
  .strict();

// Administration interne
export const VerificationQueueItemSchema = z
  .object({
    organizationId: UuidSchema,
    organizationName: z.string(),
    siret: z.string().nullable(),
    status: OrganizationStatusSchema,
    submittedAt: IsoDateTimeSchema,
    documents: z.array(DocumentSchema),
  })
  .strict();
export const VerificationQueueSchema = z
  .object({ items: z.array(VerificationQueueItemSchema) })
  .strict();

export const VerificationDecisionSchema = z
  .object({
    decision: z.enum(["verified", "rejected"]),
    notes: z.string().trim().max(1000).optional(),
    /** Pour un rejet : motif montre au loueur. */
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((v) => v.decision !== "rejected" || !!v.reason, {
    message: "Un motif est requis pour un rejet",
    path: ["reason"],
  });

export const DocumentReviewSchema = z
  .object({
    status: z.enum(["accepted", "rejected"]),
    rejectionReason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((v) => v.status !== "rejected" || !!v.rejectionReason, {
    message: "Un motif est requis pour un rejet",
    path: ["rejectionReason"],
  });
