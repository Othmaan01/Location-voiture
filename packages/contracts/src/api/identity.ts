import { z } from "zod";

import { OrganizationRoleSchema, PlatformRoleSchema } from "../enums.js";
import { UuidSchema } from "./common.js";

/** Mode prefere de l'app (choisi a l'inscription, modifiable). Jamais un role : le serveur ne s'en sert pas pour autoriser. */
export const PreferredModeSchema = z.enum(["client", "pro"]);
export type PreferredMode = z.infer<typeof PreferredModeSchema>;

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
    phone: z.string().nullable(),
    platformRole: PlatformRoleSchema.nullable(),
    preferredMode: PreferredModeSchema,
    memberships: z.array(MembershipSummarySchema),
  })
  .strict();
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 .-]{6,20}$/, "Numero de telephone invalide");

export const UpdateProfileBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: PhoneSchema.nullable().optional(),
  })
  .strict();
export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;

/** Suppression de compte : le client confirme explicitement (exigence stores). */
export const DeleteAccountBodySchema = z
  .object({
    confirmation: z.literal("SUPPRIMER"),
  })
  .strict();
export type DeleteAccountBody = z.infer<typeof DeleteAccountBodySchema>;

export const RegisterDeviceBodySchema = z
  .object({
    platform: z.enum(["ios", "android"]),
    /** Jeton Expo Push (ExponentPushToken[...]) */
    token: z.string().trim().min(10).max(200),
  })
  .strict();
export type RegisterDeviceBody = z.infer<typeof RegisterDeviceBodySchema>;

export const DeviceSchema = z
  .object({
    id: UuidSchema,
    platform: z.enum(["ios", "android"]),
    lastSeenAt: z.iso.datetime({ offset: true }),
  })
  .strict();
