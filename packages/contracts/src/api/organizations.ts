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
    joinedAt: IsoDateTimeSchema,
  })
  .strict();

export const OrganizationMembersResponseSchema = z
  .object({ members: z.array(OrganizationMemberSchema) })
  .strict();
