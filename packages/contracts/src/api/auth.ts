import { z } from "zod";

import { PreferredModeSchema } from "./identity.js";

/**
 * Inscription par le moteur (ADR-0019) : le compte est cree confirme, puis l'app se connecte
 * avec le mot de passe. Regle de mot de passe partagee avec l'app : 8 caracteres, une lettre, un chiffre.
 */
export const PasswordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(128)
  .regex(/[A-Za-z]/, "Ajoutez au moins une lettre")
  .regex(/[0-9]/, "Ajoutez au moins un chiffre");

export const SignUpBodySchema = z
  .object({
    email: z.email().max(254),
    password: PasswordSchema,
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    preferredMode: PreferredModeSchema.default("client"),
  })
  .strict();
export type SignUpBody = z.infer<typeof SignUpBodySchema>;
export const SignUpResponseSchema = z.object({ userId: z.string() }).strict();
