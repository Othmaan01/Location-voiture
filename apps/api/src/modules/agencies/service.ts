import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Agency, AgencyInput, AgencyUpdate } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { agencies, organizations } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";

function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "agence"}-${randomBytes(3).toString("hex")}`;
}

export function agencyDto(row: typeof agencies.$inferSelect): Agency {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    slug: row.slug,
    addressLine: row.addressLine,
    postalCode: row.postalCode,
    cityName: row.cityName,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    phone: row.phone,
    email: row.email,
    openingHours: (row.openingHours ?? {}) as Agency["openingHours"],
    services: row.services,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Une agence est "complete" quand elle peut apparaitre a un client : adresse et coordonnees. */
export function isAgencyComplete(
  row: Pick<typeof agencies.$inferSelect, "addressLine" | "cityName" | "latitude" | "longitude">,
): boolean {
  return !!row.addressLine && !!row.cityName && row.latitude !== null && row.longitude !== null;
}

function toRow(input: AgencyUpdate) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.addressLine !== undefined ? { addressLine: input.addressLine } : {}),
    ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
    ...(input.cityName !== undefined ? { cityName: input.cityName } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.openingHours !== undefined ? { openingHours: input.openingHours } : {}),
    ...(input.services !== undefined ? { services: input.services } : {}),
  };
}

export interface AgenciesService {
  list(actor: Actor, organizationId: string): Promise<Agency[]>;
  create(
    actor: Actor,
    organizationId: string,
    input: AgencyInput,
    requestId: string,
  ): Promise<Agency>;
  update(actor: Actor, agencyId: string, input: AgencyUpdate, requestId: string): Promise<Agency>;
  setPublished(
    actor: Actor,
    agencyId: string,
    published: boolean,
    requestId: string,
  ): Promise<Agency>;
}

export function createAgenciesService(db: Database): AgenciesService {
  async function load(actor: Actor, agencyId: string) {
    const [row] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
    if (!row) throw notFound("Agence");
    assertCanOrHide(actor, "organization.read", { organizationId: row.organizationId }, "Agence");
    return row;
  }

  return {
    async list(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const rows = await db
        .select()
        .from(agencies)
        .where(eq(agencies.organizationId, organizationId))
        .orderBy(agencies.createdAt);
      return rows.map(agencyDto);
    },

    async create(actor, organizationId, input, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "vehicle.write", { organizationId });
      if (
        (input.latitude === null) !== (input.longitude === null) &&
        (input.latitude === undefined) !== (input.longitude === undefined)
      ) {
        throw new DomainError("validation_failed", "Latitude et longitude vont ensemble.", {
          field: "latitude",
        });
      }
      try {
        return await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(agencies)
            .values({
              organizationId,
              slug: slugify(input.name),
              ...toRow(input),
              name: input.name,
            })
            .returning();
          await audit(tx, {
            actorId: actor.userId,
            actorType: "organization_member",
            action: "agency.create",
            subjectType: "agency",
            subjectId: row!.id,
            organizationId,
            requestId,
          });
          return agencyDto(row!);
        });
      } catch (error) {
        return translateDbError(error);
      }
    },

    async update(actor, agencyId, input, requestId) {
      const current = await load(actor, agencyId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      try {
        const [row] = await db
          .update(agencies)
          .set(toRow(input))
          .where(eq(agencies.id, agencyId))
          .returning();
        await audit(db, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "agency.update",
          subjectType: "agency",
          subjectId: agencyId,
          organizationId: current.organizationId,
          metadata: { fields: Object.keys(input) },
          requestId,
        });
        return agencyDto(row!);
      } catch (error) {
        return translateDbError(error);
      }
    },

    /** Publication : organisation verifiee et agence complete. Depublication toujours possible. */
    async setPublished(actor, agencyId, published, requestId) {
      const current = await load(actor, agencyId);
      assertCan(actor, "vehicle.publish", { organizationId: current.organizationId });
      if (current.status === "suspended")
        throw new DomainError("conflict", "Agence suspendue par la plateforme.");
      if (published) {
        const [org] = await db
          .select({ status: organizations.status })
          .from(organizations)
          .where(eq(organizations.id, current.organizationId))
          .limit(1);
        if (org?.status !== "verified")
          throw new DomainError(
            "conflict",
            "L'organisation doit etre verifiee avant de publier une agence.",
            { blocker: "organization_not_verified" },
          );
        if (!isAgencyComplete(current))
          throw new DomainError(
            "conflict",
            "Adresse et position de l'agence requises avant publication.",
            { blocker: "agency_incomplete" },
          );
      }
      const [row] = await db
        .update(agencies)
        .set({ status: published ? "published" : "draft" })
        .where(and(eq(agencies.id, agencyId)))
        .returning();
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: published ? "agency.publish" : "agency.unpublish",
        subjectType: "agency",
        subjectId: agencyId,
        organizationId: current.organizationId,
        requestId,
      });
      return agencyDto(row!);
    },
  };
}
