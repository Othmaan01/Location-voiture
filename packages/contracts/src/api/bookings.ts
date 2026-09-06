import { z } from "zod";

import { BookingStatusSchema } from "../enums.js";
import { CurrencySchema, MoneySchema } from "../money.js";
import { IsoDateTimeSchema, UuidSchema } from "./common.js";
import { PublicVehicleCardSchema } from "./public-catalog.js";

// ---------------------------------------------------------------------
// Devis : calcule et fige par le serveur, reference par la demande (ADR-0005)
// ---------------------------------------------------------------------
export const QuoteRequestSchema = z
  .object({
    vehicleId: UuidSchema,
    from: IsoDateTimeSchema,
    to: IsoDateTimeSchema,
  })
  .strict();
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export const QuoteLineSchema = z
  .object({
    kind: z.enum(["daily", "weekend", "weekly", "monthly"]),
    label: z.string(),
    quantity: z.number().int(),
    unit: MoneySchema,
    amount: MoneySchema,
  })
  .strict();

export const QuoteSchema = z
  .object({
    id: UuidSchema,
    vehicleId: UuidSchema,
    agencyId: UuidSchema,
    from: IsoDateTimeSchema,
    to: IsoDateTimeSchema,
    days: z.number().int(),
    lines: z.array(QuoteLineSchema),
    subtotal: MoneySchema,
    fees: MoneySchema,
    total: MoneySchema,
    deposit: MoneySchema,
    kmIncludedPerDay: z.number().int().nullable(),
    extraKmCents: z.number().int().nullable(),
    expiresAt: IsoDateTimeSchema,
  })
  .strict();
export type Quote = z.infer<typeof QuoteSchema>;

// ---------------------------------------------------------------------
// Reservation
// ---------------------------------------------------------------------
export const CreateBookingBodySchema = z
  .object({
    quoteId: UuidSchema,
    message: z.string().trim().max(1000).optional(),
  })
  .strict();
export type CreateBookingBody = z.infer<typeof CreateBookingBodySchema>;

export const BookingEventSchema = z
  .object({
    id: UuidSchema,
    fromStatus: BookingStatusSchema.nullable(),
    toStatus: BookingStatusSchema,
    actorType: z.enum(["customer", "organization_member", "platform", "system"]),
    reason: z.string().nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();

export const BookingContactSchema = z
  .object({
    agencyName: z.string(),
    addressLine: z.string().nullable(),
    postalCode: z.string().nullable(),
    cityName: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    phone: z.string().nullable(),
  })
  .strict();

export const BookingCustomerSchema = z
  .object({
    userId: UuidSchema,
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    /** Telephone transmis au loueur uniquement une fois la reservation confirmee. */
    phone: z.string().nullable(),
    completedBookings: z.number().int(),
  })
  .strict();

export const BookingSchema = z
  .object({
    id: UuidSchema,
    reference: z.string(),
    status: BookingStatusSchema,
    statusChangedAt: IsoDateTimeSchema,
    from: IsoDateTimeSchema,
    to: IsoDateTimeSchema,
    days: z.number().int(),
    vehicle: PublicVehicleCardSchema,
    loueurId: UuidSchema,
    loueurName: z.string(),
    /** Coordonnees de l'agence : revelees au client une fois la demande confirmee. */
    contact: BookingContactSchema.nullable(),
    /** Vue loueur uniquement. */
    customer: BookingCustomerSchema.nullable(),
    total: MoneySchema,
    deposit: MoneySchema,
    currency: CurrencySchema,
    customerMessage: z.string().nullable(),
    declineReason: z.string().nullable(),
    cancellationReason: z.string().nullable(),
    /** Delai de reponse du loueur pour une demande en attente. */
    expiresAt: IsoDateTimeSchema.nullable(),
    events: z.array(BookingEventSchema),
    /** Le client peut laisser un avis : location terminee, moins de 30 jours, pas encore d'avis. */
    canReview: z.boolean(),
    review: z
      .object({ id: UuidSchema, rating: z.number().int(), comment: z.string().nullable() })
      .strict()
      .nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strict();
export type Booking = z.infer<typeof BookingSchema>;

export const BookingsResponseSchema = z.object({ bookings: z.array(BookingSchema) }).strict();

export const BookingListQuerySchema = z
  .object({
    scope: z.enum(["upcoming", "past", "all"]).default("upcoming"),
    status: BookingStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const DecisionBodySchema = z
  .object({ reason: z.string().trim().min(2).max(500).optional() })
  .strict();

export const CancelBodySchema = z
  .object({ reason: z.string().trim().min(2).max(500).optional() })
  .strict();

// ---------------------------------------------------------------------
// Blocages de disponibilite (pro)
// ---------------------------------------------------------------------
export const AvailabilityBlockInputSchema = z
  .object({
    from: IsoDateTimeSchema,
    to: IsoDateTimeSchema,
    reason: z.enum(["maintenance", "external_rental", "other"]).default("other"),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export const AvailabilityBlockSchema = z
  .object({
    id: UuidSchema,
    vehicleId: UuidSchema,
    from: IsoDateTimeSchema,
    to: IsoDateTimeSchema,
    reason: z.enum(["maintenance", "external_rental", "other"]),
    note: z.string().nullable(),
  })
  .strict();

/** Calendrier d'une organisation : reservations fermes et blocages sur une fenetre. */
export const CalendarQuerySchema = z
  .object({ from: IsoDateTimeSchema, to: IsoDateTimeSchema })
  .strict();
export const CalendarResponseSchema = z
  .object({
    bookings: z.array(BookingSchema),
    blocks: z.array(AvailabilityBlockSchema),
  })
  .strict();
