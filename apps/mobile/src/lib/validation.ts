import { z } from "zod";

export const EmailField = z.email("Adresse e-mail invalide").max(200);
export const PasswordField = z.string().min(10, "10 caractères minimum").max(128);
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
