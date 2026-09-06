import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema Drizzle : reflet type des tables SQL (source de verite : supabase/migrations).
 * Seules les tables utilisees par l'API sont declarees ; on complete au fil des phases.
 */
export const platformRoleEnum = pgEnum("platform_role", ["support", "admin", "superadmin"]);
export const devicePlatformEnum = pgEnum("device_platform", ["ios", "android"]);
export const agencyStatusEnum = pgEnum("agency_status", ["draft", "published", "suspended"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["draft", "published", "archived"]);
export const vehicleCategoryEnum = pgEnum("vehicle_category", [
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
export const transmissionEnum = pgEnum("transmission_type", ["manuelle", "automatique"]);
export const fuelEnum = pgEnum("fuel_type", [
  "essence",
  "diesel",
  "hybride",
  "hybride_rechargeable",
  "electrique",
  "gpl",
]);
export const documentKindEnum = pgEnum("document_kind", [
  "kbis",
  "insurance",
  "id_card",
  "driving_license",
  "vehicle_registration",
  "other",
]);
export const documentStatusEnum = pgEnum("document_status", ["pending", "accepted", "rejected"]);
export const organizationRoleEnum = pgEnum("organization_role", ["owner", "manager", "agent"]);
export const organizationStatusEnum = pgEnum("organization_status", [
  "draft",
  "submitted",
  "under_review",
  "verified",
  "rejected",
  "suspended",
]);
export const actorTypeEnum = pgEnum("actor_type", [
  "customer",
  "organization_member",
  "platform",
  "system",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  avatarPath: text("avatar_path"),
  locale: text("locale").notNull().default("fr"),
  preferredMode: text("preferred_mode").notNull().default("client"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  authDeletedAt: timestamp("auth_deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deviceTokens = pgTable("device_tokens", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  userId: uuid("user_id").notNull(),
  platform: devicePlatformEnum("platform").notNull(),
  token: text("token").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull(),
    vehicleId: uuid("vehicle_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.vehicleId] })],
);

export const platformRoles = pgTable("platform_roles", {
  userId: uuid("user_id").primaryKey(),
  role: platformRoleEnum("role").notNull(),
  grantedBy: uuid("granted_by"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isQuote: boolean("is_quote").notNull().default(false),
  minVehicles: integer("min_vehicles").notNull().default(1),
  maxPublishedVehicles: integer("max_published_vehicles"),
  monthlyPriceCents: integer("monthly_price_cents").notNull().default(0),
  currency: char("currency", { length: 3 }).notNull().default("EUR"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  legalName: text("legal_name"),
  siren: text("siren"),
  countryCode: char("country_code", { length: 2 }).notNull().default("FR"),
  status: organizationStatusEnum("status").notNull().default("draft"),
  billingEmail: text("billing_email"),
  statusReason: text("status_reason"),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
  planCode: text("plan_code").notNull(),
  logoPath: text("logo_path"),
  bannerPath: text("banner_path"),
  bio: text("bio"),
  website: text("website"),
  accent: text("accent").notNull().default("red"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: organizationRoleEnum("role").notNull(),
    invitedBy: uuid("invited_by"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

export const organizationInvitations = pgTable("organization_invitations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  organizationId: uuid("organization_id").notNull(),
  email: text("email").notNull(),
  role: organizationRoleEnum("role").notNull(),
  tokenHash: text("token_hash").notNull(),
  invitedBy: uuid("invited_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  actorId: uuid("actor_id"),
  actorType: actorTypeEnum("actor_type").notNull(),
  action: text("action").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: uuid("subject_id"),
  organizationId: uuid("organization_id"),
  metadata: jsonb("metadata").notNull().default({}),
  ipHash: text("ip_hash"),
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agencies = pgTable("agencies", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  organizationId: uuid("organization_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  siret: text("siret"),
  addressLine: text("address_line"),
  postalCode: text("postal_code"),
  cityId: uuid("city_id"),
  cityName: text("city_name"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  timezone: text("timezone").notNull().default("Europe/Paris"),
  phone: text("phone"),
  email: text("email"),
  openingHours: jsonb("opening_hours").notNull().default({}),
  services: text("services").array().notNull().default([]),
  description: text("description"),
  photoPath: text("photo_path"),
  status: agencyStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  organizationId: uuid("organization_id").notNull(),
  agencyId: uuid("agency_id").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  version: text("version"),
  year: integer("year"),
  category: vehicleCategoryEnum("category").notNull(),
  transmission: transmissionEnum("transmission").notNull(),
  fuel: fuelEnum("fuel").notNull(),
  seats: smallint("seats").notNull().default(5),
  doors: smallint("doors").notNull().default(5),
  luggage: smallint("luggage").notNull().default(2),
  color: text("color"),
  licensePlate: text("license_plate"),
  options: text("options").array().notNull().default([]),
  description: text("description"),
  minDriverAge: smallint("min_driver_age").notNull().default(21),
  minLicenseYears: smallint("min_license_years").notNull().default(2),
  status: vehicleStatusEnum("status").notNull().default("draft"),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspendedReason: text("suspended_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehiclePhotos = pgTable("vehicle_photos", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  vehicleId: uuid("vehicle_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  storagePath: text("storage_path").notNull(),
  position: smallint("position").notNull(),
  width: integer("width"),
  height: integer("height"),
  blurhash: text("blurhash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ratePlans = pgTable("rate_plans", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  vehicleId: uuid("vehicle_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  currency: char("currency", { length: 3 }).notNull().default("EUR"),
  dailyCents: integer("daily_cents").notNull(),
  weekendDailyCents: integer("weekend_daily_cents"),
  weeklyCents: integer("weekly_cents"),
  monthlyCents: integer("monthly_cents"),
  depositCents: integer("deposit_cents").notNull().default(0),
  kmIncludedPerDay: integer("km_included_per_day"),
  extraKmCents: integer("extra_km_cents"),
  minDays: smallint("min_days").notNull().default(1),
  maxDays: smallint("max_days"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  organizationId: uuid("organization_id").notNull(),
  uploadedBy: uuid("uploaded_by"),
  kind: documentKindEnum("kind").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256"),
  status: documentStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  expiresAt: date("expires_at"),
  subjectType: text("subject_type").notNull().default("organization"),
  subjectId: uuid("subject_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentAccessLog = pgTable("document_access_log", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  documentId: uuid("document_id").notNull(),
  accessedBy: uuid("accessed_by"),
  purpose: text("purpose").notNull(),
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationRequests = pgTable("verification_requests", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  organizationId: uuid("organization_id").notNull(),
  submittedBy: uuid("submitted_by"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  decidedBy: uuid("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decision: text("decision"),
  notes: text("notes"),
});

export const cities = pgTable("cities", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  postalCode: text("postal_code"),
  departmentCode: text("department_code"),
  departmentName: text("department_name"),
  regionName: text("region_name"),
  countryCode: text("country_code").notNull().default("FR"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  population: integer("population"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookingStatusEnum = pgEnum("booking_status", [
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
export const blockReasonEnum = pgEnum("block_reason", ["maintenance", "external_rental", "other"]);

export const quotes = pgTable("quotes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  userId: uuid("user_id"),
  vehicleId: uuid("vehicle_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  ratePlanId: uuid("rate_plan_id").notNull(),
  pickupAgencyId: uuid("pickup_agency_id").notNull(),
  period: text("period").notNull(),
  lines: jsonb("lines").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  feesCents: integer("fees_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  depositCents: integer("deposit_cents").notNull().default(0),
  currency: char("currency", { length: 3 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  reference: text("reference")
    .notNull()
    .default(sql`public.generate_booking_reference()`),
  organizationId: uuid("organization_id").notNull(),
  agencyId: uuid("agency_id").notNull(),
  vehicleId: uuid("vehicle_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  quoteId: uuid("quote_id").notNull(),
  period: text("period").notNull(),
  status: bookingStatusEnum("status").notNull().default("requested"),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
  customerMessage: text("customer_message"),
  declineReason: text("decline_reason"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: actorTypeEnum("cancelled_by"),
  totalCents: integer("total_cents").notNull(),
  depositCents: integer("deposit_cents").notNull().default(0),
  currency: char("currency", { length: 3 }).notNull(),
  priceSnapshot: jsonb("price_snapshot").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookingEvents = pgTable("booking_events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  bookingId: uuid("booking_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  fromStatus: bookingStatusEnum("from_status"),
  toStatus: bookingStatusEnum("to_status").notNull(),
  actorId: uuid("actor_id"),
  actorType: actorTypeEnum("actor_type").notNull(),
  reason: text("reason"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const availabilityBlocks = pgTable("availability_blocks", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  vehicleId: uuid("vehicle_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  period: text("period").notNull(),
  reason: blockReasonEnum("reason").notNull().default("other"),
  note: text("note"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  organizationId: uuid("organization_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  bookingId: uuid("booking_id"),
  vehicleId: uuid("vehicle_id"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  customerReadAt: timestamp("customer_read_at", { withTimezone: true }),
  organizationReadAt: timestamp("organization_read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  conversationId: uuid("conversation_id").notNull(),
  senderId: uuid("sender_id"),
  senderType: actorTypeEnum("sender_type").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  bookingId: uuid("booking_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  vehicleId: uuid("vehicle_id"),
  customerId: uuid("customer_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  reply: text("reply"),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  status: text("status").notNull().default("published"),
  hiddenReason: text("hidden_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  reporterId: uuid("reporter_id"),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  organizationId: uuid("organization_id"),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  resolutionNote: text("resolution_note"),
  resolvedBy: uuid("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  sentPushAt: timestamp("sent_push_at", { withTimezone: true }),
  sentEmailAt: timestamp("sent_email_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    key: text("key").notNull(),
    userId: uuid("user_id").notNull(),
    route: text("route").notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);
