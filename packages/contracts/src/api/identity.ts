import { z } from "zod";

import { OrganizationRoleSchema, PlatformRoleSchema } from "../enums.js";
import { UuidSchema } from "./common.js";

export const MembershipSummarySchema = z
  .object({
    organizationId: UuidSchema,
    organizationName: z.string(),
    role: OrganizationRoleSchema,
  })
  .strict();

export const MeResponseSchema = z
  .object({
    userId: UuidSchema,
    email: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    platformRole: PlatformRoleSchema.nullable(),
    memberships: z.array(MembershipSummarySchema),
  })
  .strict();
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const UpdateProfileBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 .-]{6,20}$/)
      .optional(),
  })
  .strict();
export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;
