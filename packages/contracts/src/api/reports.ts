import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/** Signalements (Phase 7, ADR-0013) : un utilisateur signale, l'administration tranche. */
export const ReportTargetSchema = z.enum(["organization", "vehicle", "review", "conversation"]);
export type ReportTarget = z.infer<typeof ReportTargetSchema>;
export const ReportReasonSchema = z.enum(["fraud", "inappropriate", "spam", "safety", "other"]);
export type ReportReason = z.infer<typeof ReportReasonSchema>;
export const ReportStatusSchema = z.enum(["open", "resolved", "dismissed"]);

export const CreateReportBodySchema = z
  .object({
    targetType: ReportTargetSchema,
    targetId: UuidSchema,
    reason: ReportReasonSchema,
    details: z.string().trim().max(1000).optional(),
  })
  .strict();
export type CreateReportBody = z.infer<typeof CreateReportBodySchema>;

export const ReportSchema = z
  .object({
    id: UuidSchema,
    targetType: ReportTargetSchema,
    targetId: UuidSchema,
    /** Loueur concerne (directement ou via le vehicule / l'avis / le fil). */
    organizationId: UuidSchema.nullable(),
    organizationName: z.string().nullable(),
    reason: ReportReasonSchema,
    details: z.string().nullable(),
    status: ReportStatusSchema,
    resolutionNote: z.string().nullable(),
    reporterName: z.string(),
    createdAt: IsoDateTimeSchema,
    resolvedAt: IsoDateTimeSchema.nullable(),
  })
  .strict();
export type Report = z.infer<typeof ReportSchema>;
export const ReportsResponseSchema = z.object({ reports: z.array(ReportSchema) }).strict();

export const ReportsQuerySchema = z.object({ status: ReportStatusSchema.default("open") }).strict();

export const ReportResolutionBodySchema = z
  .object({
    status: z.enum(["resolved", "dismissed"]),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
