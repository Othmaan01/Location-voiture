import { randomBytes } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import type { Agency, AgencyInput, AgencyUpdate } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { agencies, organizations, quotes, vehicles } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";
import { isValidSiret } from "../organizations/service.js";

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
    siret: row.siret,
    addressLine: row.addressLine,
    postalCode: row.postalCode,
    cityName: row.cityName,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    phone: row.phone,
    email: row.email,
    openingHours: row.openingHours ?? {},
    services: row.services,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Une agence est "complete" quand elle peut apparaitre a un client : SIRET de
 * l'etablissement, adresse et coordonnees.
 */
export function isAgencyComplete(
  row: Pick<
    typeof agencies.$inferSelect,
    "siret" | "addressLine" | "cityName" | "latitude" | "longitude"
  >,
): boolean {
  return (
    !!row.siret &&
    !!row.addressLine &&
    !!row.cityName &&
    row.latitude !== null &&
    row.longitude !== null
  );
}

function toRow(input: AgencyUpdate) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.siret !== undefined ? { siret: input.siret } : {}),
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
  remove(actor: Actor, agencyId: string, requestId: string): Promise<void>;
}

export function createAgenciesService(db: Database): AgenciesService {
  async function load(actor: Actor, agencyId: string) {
    const [row] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
    if (!row) throw notFound("Agence");
    assertCanOrHide(actor, "organization.read", { organizationId: row.organizationId }, "Agence");
    return row;
  }

  /**
   * Le SIRET d'un etablissement commence toujours par le SIREN de son entreprise :
   * c'est la premiere verification, avant meme le controle humain.
   */
  async function assertSiretMatchesOrganization(organizationId: string, siret: string) {
    if (!isValidSiret(siret))
      throw new DomainError("validation_failed", "SIRET invalide.", { field: "siret" });
    const [org] = await db
      .select({ siren: organizations.siren })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org?.siren)
      throw new DomainError(
        "validation_failed",
        "Renseignez d'abord le SIREN de l'organisation (Informations).",
        { field: "siret", blocker: "siren_missing" },
      );
    if (!siret.startsWith(org.siren))
      throw new DomainError(
        "validation_failed",
        `Ce SIRET ne correspond pas a votre entreprise : il doit commencer par ${org.siren}.`,
        { field: "siret", blocker: "siret_mismatch" },
      );
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
      if (input.siret) await assertSiretMatchesOrganization(organizationId, input.siret);
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
        return translateDbError(error, "Un etablissement avec ce SIRET existe deja.");
      }
    },

    async update(actor, agencyId, input, requestId) {
      const current = await load(actor, agencyId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      if (input.siret) await assertSiretMatchesOrganization(current.organizationId, input.siret);
      try {
        const [row] = await db
          .update(agencies)
          .set({
            ...toRow(input),
            ...(current.status === "suspended"
              ? {}
              : {
                  status: isAgencyComplete({ ...current, ...toRow(input) }) ? "published" : "draft",
                }),
          })
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
        return translateDbError(error, "Un etablissement avec ce SIRET existe deja.");
      }
    },

    /**
     * Suppression : refusee tant que des vehicules (meme archives) y sont rattaches,
     * car leur historique de reservation pointe vers cette agence.
     */
    async remove(actor, agencyId, requestId) {
      const current = await load(actor, agencyId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      const [row] = await db
        .select({ n: count() })
        .from(vehicles)
        .where(eq(vehicles.agencyId, agencyId));
      const vehicleCount = row?.n ?? 0;
      if (vehicleCount > 0)
        throw new DomainError(
          "conflict",
          "Des vehicules sont rattaches a cette agence : supprimez-les ou deplacez-les vers une autre agence avant de la supprimer.",
          { blocker: "has_vehicles", vehicleCount },
        );
      await db.transaction(async (tx) => {
        await tx.delete(quotes).where(eq(quotes.pickupAgencyId, agencyId));
        await tx.delete(agencies).where(eq(agencies.id, agencyId));
        await audit(tx, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "agency.delete",
          subjectType: "agency",
          subjectId: agencyId,
          organizationId: current.organizationId,
          metadata: { name: current.name },
          requestId,
        });
      });
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
