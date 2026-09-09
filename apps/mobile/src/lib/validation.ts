import { z } from "zod";

export const EmailField = z.email("Adresse e-mail invalide").max(200);
/** 8 caractères minimum avec au moins une lettre et un chiffre ; caractères spéciaux bienvenus, pas imposés. */
export const PasswordField = z
  .string()
  .min(8, "8 caractères minimum")
  .max(128)
  .regex(/[A-Za-z]/, "Ajoutez au moins une lettre")
  .regex(/[0-9]/, "Ajoutez au moins un chiffre");
export const PASSWORD_HINT = "8 caractères minimum, avec au moins une lettre et un chiffre";
export const NameField = z.string().trim().min(1, "Champ requis").max(80);
export const OtpField = z.string().regex(/^[0-9]{6}$/, "Code à 6 chiffres");

export const SignInSchema = z.object({
  email: EmailField,
  password: z.string().min(1, "Champ requis"),
});
export const SignUpSchema = z.object({
  firstName: NameField,
  lastName: NameField,
  email: EmailField,
  password: PasswordField,
});
export const ForgotSchema = z.object({ email: EmailField });
export const OtpSchema = z.object({ code: OtpField });
export const NewPasswordSchema = z.object({ password: PasswordField });
