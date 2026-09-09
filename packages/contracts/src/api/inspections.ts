import { z } from "zod";

import { IsoDateTimeSchema, UuidSchema } from "./common.js";

/**
 * Etats des lieux (ADR-0018) : depart et retour, croquis des dommages sur un vehicule generique,
 * signature du client a l'ecran, PDF genere par le moteur et envoye par e-mail.
 */
export const InspectionKindSchema = z.enum(["departure", "return"]);
export type InspectionKind = z.infer<typeof InspectionKindSchema>;

export const DamageTypeSchema = z.enum(["rayure", "bosse", "eclat", "manque", "autre"]);
export type DamageType = z.infer<typeof DamageTypeSchema>;
export const DAMAGE_LABEL: Record<DamageType, string> = {
  rayure: "Rayure",
  bosse: "Bosse",
  eclat: "Éclat",
  manque: "Manquant",
  autre: "Autre",
};

/** Position relative sur le croquis (0 a 1 en largeur et en hauteur), independante de l'ecran. */
export const DamageSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    type: DamageTypeSchema,
    note: z.string().trim().max(120).optional(),
  })
  .strict();
export type Damage = z.infer<typeof DamageSchema>;

/** Signature : traits en coordonnees relatives (0 a 1), chaque trait est une suite de points. */
export const StrokeSchema = z
  .array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]))
  .min(1)
  .max(2000);
export const SignatureSchema = z.array(StrokeSchema).min(1).max(200);
export type Signature = z.infer<typeof SignatureSchema>;

export const InspectionInputSchema = z
  .object({
    kind: InspectionKindSchema,
    mileageKm: z.number().int().min(0).max(2_000_000).optional(),
    fuelEighths: z.number().int().min(0).max(8).optional(),
    damages: z.array(DamageSchema).max(60).default([]),
    comment: z.string().trim().max(2000).optional(),
    customerSignature: SignatureSchema,
    staffName: z.string().trim().min(1).max(80).optional(),
    /** Adresses supplementaires : le client recoit toujours le PDF sur l'adresse de son compte. */
    sendTo: z.array(z.email()).max(3).default([]),
  })
  .strict();
export type InspectionInput = z.infer<typeof InspectionInputSchema>;

export const InspectionSchema = z
  .object({
    id: UuidSchema,
    bookingId: UuidSchema,
    kind: InspectionKindSchema,
    mileageKm: z.number().int().nullable(),
    fuelEighths: z.number().int().nullable(),
    damages: z.array(DamageSchema),
    comment: z.string().nullable(),
    staffName: z.string().nullable(),
    /** Lien de lecture signe, valable une heure. */
    pdfUrl: z.string().nullable(),
    sentTo: z.array(z.string()),
    sentAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Inspection = z.infer<typeof InspectionSchema>;
export const InspectionsResponseSchema = z
  .object({ inspections: z.array(InspectionSchema) })
  .strict();

/** Croquis generique vue de dessus, partage par l'app et le PDF : memes proportions, memes traits. */
export const CAR_SKETCH = {
  width: 200,
  height: 400,
  /** Contours en chemins SVG ; l'ordre est celui du dessin. */
  paths: [
    "M62 18 C86 8 114 8 138 18 L156 54 L160 120 L160 300 L154 356 C130 392 70 392 46 356 L40 300 L40 120 L44 54 Z",
    "M58 118 C86 108 114 108 142 118 L146 150 L54 150 Z",
    "M54 262 L146 262 L142 300 C114 310 86 310 58 300 Z",
    "M56 152 L144 152 L146 258 L54 258 Z",
    "M40 74 L28 82 L28 118 L40 112",
    "M160 74 L172 82 L172 118 L160 112",
    "M40 272 L28 280 L28 316 L40 310",
    "M160 272 L172 280 L172 316 L160 310",
    "M78 24 L122 24",
    "M74 372 L126 372",
  ],
  /** Reperes en coordonnees relatives (0 a 1) : Avant en haut, Arriere en bas. */
  labels: [
    { text: "AVANT", x: 0.5, y: 0.02 },
    { text: "ARRIÈRE", x: 0.5, y: 0.985 },
  ],
} as const;
