import { z } from "zod";

const optionalString = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Indiquez votre nom complet.").max(120),
    email: z.email("Adresse e-mail invalide."),
    password: z
      .string()
      .min(8, "8 caracteres minimum.")
      .regex(/[a-z]/, "Au moins une minuscule.")
      .regex(/[A-Z]/, "Au moins une majuscule.")
      .regex(/[0-9]/, "Au moins un chiffre."),
    role: z.enum(["client", "pro"]),
    phone: optionalString(30),
    companyName: optionalString(160),
  })
  .refine((data) => data.role !== "pro" || Boolean(data.companyName), {
    message: "Indiquez le nom de votre agence.",
    path: ["companyName"],
  });

export const signInSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export const leadSchema = z.object({
  agencyId: z.uuid(),
  vehicleId: z.uuid().optional(),
  firstName: z.string().trim().min(2, "Prenom requis.").max(80),
  lastName: optionalString(80),
  email: z.email("Adresse e-mail invalide."),
  phone: optionalString(30),
  message: z.string().trim().max(2000).optional(),
  desiredStart: optionalString(10),
  desiredEnd: optionalString(10),
});

export const agencySchema = z.object({
  name: z.string().trim().min(2, "Nom de l'agence requis.").max(160),
  description: optionalString(2000),
  email: z.email("Adresse e-mail invalide.").optional().or(z.literal("")),
  phone: optionalString(30),
  website: optionalString(200),
  addressLine: optionalString(200),
  postalCode: optionalString(10),
  cityId: z.uuid().optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  services: z.array(z.string()).default([]),
});

export const vehicleSchema = z.object({
  brand: z.string().trim().min(1, "Marque requise.").max(60),
  model: z.string().trim().min(1, "Modele requis.").max(60),
  version: optionalString(80),
  year: z.coerce
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1)
    .optional(),
  category: z.enum([
    "citadine",
    "compacte",
    "berline",
    "suv",
    "break",
    "monospace",
    "cabriolet",
    "coupe",
    "utilitaire",
    "minibus",
    "prestige",
    "sans_permis",
  ]),
  transmission: z.enum(["manuelle", "automatique"]),
  fuel: z.enum(["essence", "diesel", "hybride", "hybride_rechargeable", "electrique", "gpl"]),
  seats: z.coerce.number().int().min(1).max(60),
  doors: z.coerce.number().int().min(2).max(6),
  luggage: z.coerce.number().int().min(0).max(20),
  pricePerDay: z.coerce.number().positive("Le prix journalier doit etre superieur a 0."),
  pricePerWeek: z.coerce.number().positive().optional(),
  pricePerMonth: z.coerce.number().positive().optional(),
  depositAmount: z.coerce.number().min(0).optional(),
  mileageIncludedDay: z.coerce.number().int().min(0).optional(),
  extraKmPrice: z.coerce.number().min(0).optional(),
  options: z.array(z.string()).default([]),
  description: optionalString(4000),
  images: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  isFeatured: z.coerce.boolean().default(false),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type AgencyInput = z.infer<typeof agencySchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;

/** Transforme une erreur Zod en dictionnaire champ -> premier message. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
