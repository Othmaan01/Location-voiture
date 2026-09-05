import { z } from "zod";

import { OrganizationRoleSchema, OrganizationStatusSchema } from "../enums.js";
import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/** SIRET francais : 14 chiffres. La validite (cle de Luhn) est verifiee cote serveur. */
export const SiretSchema = z.string().regex(/^[0-9]{14}$/, "SIRET : 14 chiffres attendus");

export const CreateOrganizationBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    legalName: z.string().trim().min(2).max(200).optional(),
    siret: SiretSchema.optional(),
    countryCode: z.literal("FR").default("FR"),
  })
  .strict();
export type CreateOrganizationBody = z.infer<typeof CreateOrganizationBodySchema>;

export const UpdateOrganizationBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    legalName: z.string().trim().min(2).max(200).nullable().optional(),
    siret: SiretSchema.nullable().optional(),
    billingEmail: z.email().nullable().optional(),
  })
  .strict();
export type UpdateOrganizationBody = z.infer<typeof UpdateOrganizationBodySchema>;

export const OrganizationSchema = z
  .object({
    id: UuidSchema,
    name: z.string(),
    legalName: z.string().nullable(),
    siret: z.string().nullable(),
    countryCode: z.string(),
    status: OrganizationStatusSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Organization = z.infer<typeof OrganizationSchema>;

export const OrganizationMemberSchema = z
  .object({
    userId: UuidSchema,
    role: OrganizationRoleSchema,
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    joinedAt: IsoDateTimeSchema,
  })
  .strict();
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

export const OrganizationMembersResponseSchema = z
  .object({ members: z.array(OrganizationMemberSchema) })
  .strict();

/** Roles attribuables par invitation : jamais owner (le transfert de propriete est une action dediee). */
export const InvitableRoleSchema = z.enum(["manager", "agent"]);

export const UpdateMemberBodySchema = z.object({ role: OrganizationRoleSchema }).strict();

export const CreateInvitationBodySchema = z
  .object({
    email: z.email().max(200),
    role: InvitableRoleSchema,
  })
  .strict();
export type CreateInvitationBody = z.infer<typeof CreateInvitationBodySchema>;

export const InvitationSchema = z
  .object({
    id: UuidSchema,
    email: z.string(),
    role: InvitableRoleSchema,
    expiresAt: IsoDateTimeSchema,
    acceptedAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Invitation = z.infer<typeof InvitationSchema>;

/** Renvoye une seule fois, a la creation : le jeton n'est jamais restocke en clair. */
export const CreatedInvitationSchema = InvitationSchema.extend({
  token: z.string(),
  /** Lien profond a partager : lv://invitations/<token> */
  link: z.string(),
}).strict();

export const InvitationsResponseSchema = z
  .object({ invitations: z.array(InvitationSchema) })
  .strict();

export const AcceptInvitationBodySchema = z.object({ token: z.string().min(20).max(200) }).strict();

export const AcceptInvitationResponseSchema = z
  .object({
    organizationId: UuidSchema,
    organizationName: z.string(),
    role: InvitableRoleSchema,
  })
  .strict();
