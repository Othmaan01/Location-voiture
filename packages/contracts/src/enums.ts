import { z } from "zod";

export const OrganizationRoleSchema = z.enum(["owner", "manager", "agent"]);
export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;

export const PlatformRoleSchema = z.enum(["support", "admin", "superadmin"]);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

export const OrganizationStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "verified",
  "rejected",
  "suspended",
]);
export type OrganizationStatus = z.infer<typeof OrganizationStatusSchema>;

export const VehicleStatusSchema = z.enum(["draft", "published", "archived"]);
export type VehicleStatus = z.infer<typeof VehicleStatusSchema>;

export const VehicleCategorySchema = z.enum([
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
]);
export type VehicleCategory = z.infer<typeof VehicleCategorySchema>;

export const TransmissionSchema = z.enum(["manuelle", "automatique"]);
export const FuelSchema = z.enum([
  "essence",
  "diesel",
  "hybride",
  "hybride_rechargeable",
  "electrique",
  "gpl",
]);

/** Etats d'une reservation (ADR-0005). L'ordre n'a pas de sens metier. */
export const BookingStatusSchema = z.enum([
  "requested",
  "confirmed",
  "active",
  "completed",
  "declined",
  "expired",
  "cancelled",
  "no_show",
  "disputed",
  "resolved",
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const DocumentKindSchema = z.enum([
  "kbis",
  "insurance",
  "id_card",
  "driving_license",
  "vehicle_registration",
  "other",
]);
export const DocumentStatusSchema = z.enum(["pending", "accepted", "rejected"]);
