import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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
});

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`public.uuid_generate_v7()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  legalName: text("legal_name"),
  siret: text("siret"),
  countryCode: char("country_code", { length: 2 }).notNull().default("FR"),
  status: organizationStatusEnum("status").notNull().default("draft"),
  billingEmail: text("billing_email"),
  planCode: text("plan_code").notNull(),
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
