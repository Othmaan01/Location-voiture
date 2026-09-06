import { randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type {
  PhotoConfirmSchema,
  RatePlan,
  RatePlanInput,
  Vehicle,
  VehicleInput,
  VehiclePhoto,
  VehicleUpdate,
} from "@lv/contracts";
import type { z } from "zod";

import type { Database } from "../../db/client.js";
import {
  agencies,
  bookings,
  organizations,
  plans,
  quotes,
  ratePlans,
  subscriptions,
  vehiclePhotos,
  vehicles,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";
import { PHOTOS_BUCKET, type StorageClient } from "../../shared/storage.js";
import { isAgencyComplete } from "../agencies/service.js";

export { PHOTOS_BUCKET };
const MAX_PHOTOS = 30;
const UPLOAD_TTL_SECONDS = 600;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type VehicleRow = typeof vehicles.$inferSelect;
type PublishBlocker =
  | "organization_not_verified"
  | "no_photo"
  | "no_rate_plan"
  | "agency_incomplete"
  | "quota_reached"
  | "subscription_required";

function ratePlanDto(row: typeof ratePlans.$inferSelect): RatePlan {
  return {
    id: row.id,
    currency: row.currency as RatePlan["currency"],
    dailyCents: row.dailyCents,
    weekendDailyCents: row.weekendDailyCents,
    weeklyCents: row.weeklyCents,
    monthlyCents: row.monthlyCents,
    depositCents: row.depositCents,
    kmIncludedPerDay: row.kmIncludedPerDay,
    extraKmCents: row.extraKmCents,
    minDays: row.minDays,
    maxDays: row.maxDays,
  };
}

export interface VehiclesService {
  list(actor: Actor, organizationId: string): Promise<Vehicle[]>;
  get(actor: Actor, vehicleId: string): Promise<Vehicle>;
  create(
    actor: Actor,
    organizationId: string,
    input: VehicleInput,
    requestId: string,
  ): Promise<Vehicle>;
  update(
    actor: Actor,
    vehicleId: string,
    input: VehicleUpdate,
    requestId: string,
  ): Promise<Vehicle>;
  archive(actor: Actor, vehicleId: string, requestId: string): Promise<void>;
  /** Supprime vraiment sans historique de reservation, archive sinon. */
  remove(actor: Actor, vehicleId: string, requestId: string): Promise<"deleted" | "archived">;
  setRatePlan(
    actor: Actor,
    vehicleId: string,
    input: RatePlanInput,
    requestId: string,
  ): Promise<RatePlan>;
  publishCheck(
    actor: Actor,
    vehicleId: string,
  ): Promise<{ canPublish: boolean; blockers: PublishBlocker[] }>;
  publish(actor: Actor, vehicleId: string, requestId: string): Promise<Vehicle>;
  unpublish(actor: Actor, vehicleId: string, requestId: string): Promise<Vehicle>;
  createPhotoUpload(
    actor: Actor,
    vehicleId: string,
    mimeType: string,
  ): Promise<{ path: string; uploadUrl: string; token: string; expiresAt: string }>;
  confirmPhoto(
    actor: Actor,
    vehicleId: string,
    input: z.infer<typeof PhotoConfirmSchema>,
    requestId: string,
  ): Promise<VehiclePhoto>;
  reorderPhotos(
    actor: Actor,
    vehicleId: string,
    photoIds: string[],
    requestId: string,
  ): Promise<VehiclePhoto[]>;
  deletePhoto(actor: Actor, vehicleId: string, photoId: string, requestId: string): Promise<void>;
}

export function createVehiclesService(db: Database, storage: StorageClient): VehiclesService {
  const photoDto = (row: typeof vehiclePhotos.$inferSelect): VehiclePhoto => ({
    id: row.id,
    position: row.position,
    url: storage.publicUrl(PHOTOS_BUCKET, row.storagePath),
    width: row.width,
    height: row.height,
    blurhash: row.blurhash,
  });

  async function hydrate(rows: VehicleRow[], includePlate: boolean): Promise<Vehicle[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [photos, plansRows] = await Promise.all([
      db
        .select()
        .from(vehiclePhotos)
        .where(inArray(vehiclePhotos.vehicleId, ids))
        .orderBy(asc(vehiclePhotos.position)),
      db
        .select()
        .from(ratePlans)
        .where(and(inArray(ratePlans.vehicleId, ids), eq(ratePlans.isActive, true))),
    ]);
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      agencyId: r.agencyId,
      brand: r.brand,
      model: r.model,
      version: r.version,
      year: r.year,
      category: r.category,
      transmission: r.transmission,
      fuel: r.fuel,
      seats: r.seats,
      doors: r.doors,
      luggage: r.luggage,
      color: r.color,
      licensePlate: includePlate ? r.licensePlate : null,
      options: r.options,
      description: r.description,
      minDriverAge: r.minDriverAge,
      minLicenseYears: r.minLicenseYears,
      status: r.status,
      suspendedAt: r.suspendedAt?.toISOString() ?? null,
      photos: photos.filter((p) => p.vehicleId === r.id).map(photoDto),
      ratePlan: (() => {
        const p = plansRows.find((x) => x.vehicleId === r.id);
        return p ? ratePlanDto(p) : null;
      })(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /** Charge un vehicule pour un membre (404 si autre organisation). */
  async function loadForMember(actor: Actor, vehicleId: string): Promise<VehicleRow> {
    const [row] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    if (!row) throw notFound("Vehicule");
    assertCanOrHide(actor, "vehicle.read_org", { organizationId: row.organizationId }, "Vehicule");
    return row;
  }

  async function assertAgencyInOrg(agencyId: string, organizationId: string) {
    const [a] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(and(eq(agencies.id, agencyId), eq(agencies.organizationId, organizationId)))
      .limit(1);
    if (!a)
      throw new DomainError("validation_failed", "Agence inconnue pour cette organisation.", {
        field: "agencyId",
      });
  }

  function toRow(input: VehicleUpdate) {
    const out: Partial<typeof vehicles.$inferInsert> = {};
    for (const key of [
      "agencyId",
      "brand",
      "model",
      "version",
      "year",
      "category",
      "transmission",
      "fuel",
      "seats",
      "doors",
      "luggage",
      "color",
      "licensePlate",
      "options",
      "description",
      "minDriverAge",
      "minLicenseYears",
    ] as const) {
      if (input[key] !== undefined) (out as Record<string, unknown>)[key] = input[key];
    }
    return out;
  }

  async function computeBlockers(row: VehicleRow): Promise<PublishBlocker[]> {
    const blockers: PublishBlocker[] = [];
    const [org] = await db
      .select({ status: organizations.status, planCode: organizations.planCode })
      .from(organizations)
      .where(eq(organizations.id, row.organizationId))
      .limit(1);
    if (org?.status !== "verified") blockers.push("organization_not_verified");
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, row.agencyId)).limit(1);
    if (!agency || !isAgencyComplete(agency)) blockers.push("agency_incomplete");
    const [photoRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, row.id));
    if (!photoRow?.n) blockers.push("no_photo");
    const [plan] = await db
      .select({ id: ratePlans.id })
      .from(ratePlans)
      .where(and(eq(ratePlans.vehicleId, row.id), eq(ratePlans.isActive, true)))
      .limit(1);
    if (!plan) blockers.push("no_rate_plan");
    // Abonnement en ligne resilie ou impaye : plus de nouvelle publication (ADR-0014).
    const [sub] = await db
      .select({
        status: subscriptions.status,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, row.organizationId))
      .limit(1);
    if (
      sub?.stripeSubscriptionId &&
      (sub.status === "canceled" || sub.status === "unpaid") &&
      row.status !== "published"
    )
      blockers.push("subscription_required");
    if (org && row.status !== "published") {
      const [limit] = await db
        .select({ max: plans.maxPublishedVehicles })
        .from(plans)
        .where(eq(plans.code, org.planCode))
        .limit(1);
      if (limit && limit.max !== null) {
        const [publishedRow] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(vehicles)
          .where(
            and(eq(vehicles.organizationId, row.organizationId), eq(vehicles.status, "published")),
          );
        if ((publishedRow?.n ?? 0) >= limit.max) blockers.push("quota_reached");
      }
    }
    return blockers;
  }

  return {
    async list(actor, organizationId) {
      assertCanOrHide(actor, "vehicle.read_org", { organizationId }, "Organisation");
      const rows = await db
        .select()
        .from(vehicles)
        .where(
          and(eq(vehicles.organizationId, organizationId), sql`${vehicles.status} <> 'archived'`),
        )
        .orderBy(asc(vehicles.createdAt));
      return hydrate(rows, true);
    },

    async get(actor, vehicleId) {
      const [row] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
      if (!row) throw notFound("Vehicule");
      const member =
        actor.userId !== null &&
        (actor.memberships.has(row.organizationId) || actor.platformRole !== null);
      if (!member) {
        // Vue publique : uniquement publie, non suspendu, organisation verifiee (sans plaque).
        const [org] = await db
          .select({ status: organizations.status })
          .from(organizations)
          .where(eq(organizations.id, row.organizationId))
          .limit(1);
        if (row.status !== "published" || row.suspendedAt || org?.status !== "verified")
          throw notFound("Vehicule");
      }
      const [dto] = await hydrate([row], member);
      return dto!;
    },

    async create(actor, organizationId, input, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "vehicle.write", { organizationId });
      await assertAgencyInOrg(input.agencyId, organizationId);
      try {
        const [row] = await db
          .insert(vehicles)
          .values({ organizationId, ...toRow(input) } as typeof vehicles.$inferInsert)
          .returning();
        await audit(db, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "vehicle.create",
          subjectType: "vehicle",
          subjectId: row!.id,
          organizationId,
          requestId,
        });
        const [dto] = await hydrate([row!], true);
        return dto!;
      } catch (error) {
        return translateDbError(error);
      }
    },

    async update(actor, vehicleId, input, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      if (current.status === "archived") throw new DomainError("conflict", "Vehicule archive.");
      if (input.agencyId) await assertAgencyInOrg(input.agencyId, current.organizationId);
      try {
        const [row] = await db
          .update(vehicles)
          .set(toRow(input))
          .where(eq(vehicles.id, vehicleId))
          .returning();
        await audit(db, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "vehicle.update",
          subjectType: "vehicle",
          subjectId: vehicleId,
          organizationId: current.organizationId,
          metadata: { fields: Object.keys(input) },
          requestId,
        });
        const [dto] = await hydrate([row!], true);
        return dto!;
      } catch (error) {
        return translateDbError(error);
      }
    },

    async remove(actor, vehicleId, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      const [bookingRow] = await db
        .select({ n: count() })
        .from(bookings)
        .where(eq(bookings.vehicleId, vehicleId));
      if ((bookingRow?.n ?? 0) > 0) {
        await this.archive(actor, vehicleId, requestId);
        return "archived";
      }
      const photos = await db
        .select({ path: vehiclePhotos.storagePath })
        .from(vehiclePhotos)
        .where(eq(vehiclePhotos.vehicleId, vehicleId));
      await db.transaction(async (tx) => {
        await tx.delete(quotes).where(eq(quotes.vehicleId, vehicleId));
        await tx.delete(vehicles).where(eq(vehicles.id, vehicleId));
        await audit(tx, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "vehicle.delete",
          subjectType: "vehicle",
          subjectId: vehicleId,
          organizationId: current.organizationId,
          metadata: { brand: current.brand, model: current.model },
          requestId,
        });
      });
      if (photos.length > 0)
        await storage.remove(
          PHOTOS_BUCKET,
          photos.map((p) => p.path),
        );
      return "deleted";
    },

    /** Archivage : le vehicule disparait de la flotte, son historique est conserve. */
    async archive(actor, vehicleId, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      await db.update(vehicles).set({ status: "archived" }).where(eq(vehicles.id, vehicleId));
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "vehicle.archive",
        subjectType: "vehicle",
        subjectId: vehicleId,
        organizationId: current.organizationId,
        requestId,
      });
    },

    async setRatePlan(actor, vehicleId, input, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "rate_plan.write", { organizationId: current.organizationId });
      try {
        return await db.transaction(async (tx) => {
          // v1 : un seul plan actif ; l'ancien est desactive (historique conserve).
          await tx
            .update(ratePlans)
            .set({ isActive: false })
            .where(and(eq(ratePlans.vehicleId, vehicleId), eq(ratePlans.isActive, true)));
          const [row] = await tx
            .insert(ratePlans)
            .values({
              vehicleId,
              organizationId: current.organizationId,
              currency: input.currency,
              dailyCents: input.dailyCents,
              weekendDailyCents: input.weekendDailyCents ?? null,
              weeklyCents: input.weeklyCents ?? null,
              monthlyCents: input.monthlyCents ?? null,
              depositCents: input.depositCents,
              kmIncludedPerDay: input.kmIncludedPerDay ?? null,
              extraKmCents: input.extraKmCents ?? null,
              minDays: input.minDays,
              maxDays: input.maxDays ?? null,
            })
            .returning();
          await audit(tx, {
            actorId: actor.userId,
            actorType: "organization_member",
            action: "rate_plan.set",
            subjectType: "vehicle",
            subjectId: vehicleId,
            organizationId: current.organizationId,
            metadata: { dailyCents: input.dailyCents },
            requestId,
          });
          return ratePlanDto(row!);
        });
      } catch (error) {
        return translateDbError(error);
      }
    },

    async publishCheck(actor, vehicleId) {
      const current = await loadForMember(actor, vehicleId);
      const blockers = await computeBlockers(current);
      return { canPublish: blockers.length === 0, blockers };
    },

    async publish(actor, vehicleId, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.publish", { organizationId: current.organizationId });
      if (current.status === "archived") throw new DomainError("conflict", "Vehicule archive.");
      if (current.suspendedAt)
        throw new DomainError("conflict", "Vehicule suspendu par la plateforme.");
      const blockers = await computeBlockers(current);
      if (blockers.length > 0)
        throw new DomainError("conflict", "Publication impossible en l'etat.", { blockers });
      try {
        const [row] = await db
          .update(vehicles)
          .set({ status: "published" })
          .where(eq(vehicles.id, vehicleId))
          .returning();
        await audit(db, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "vehicle.publish",
          subjectType: "vehicle",
          subjectId: vehicleId,
          organizationId: current.organizationId,
          requestId,
        });
        const [dto] = await hydrate([row!], true);
        return dto!;
      } catch (error) {
        return translateDbError(error, "Quota de publication atteint.");
      }
    },

    async unpublish(actor, vehicleId, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.publish", { organizationId: current.organizationId });
      const [row] = await db
        .update(vehicles)
        .set({ status: "draft" })
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.status, "published")))
        .returning();
      if (!row) {
        const [dto] = await hydrate([current], true);
        return dto!;
      }
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "vehicle.unpublish",
        subjectType: "vehicle",
        subjectId: vehicleId,
        organizationId: current.organizationId,
        requestId,
      });
      const [dto] = await hydrate([row], true);
      return dto!;
    },

    async createPhotoUpload(actor, vehicleId, mimeType) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      const [countRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(vehiclePhotos)
        .where(eq(vehiclePhotos.vehicleId, vehicleId));
      const n = countRow?.n ?? 0;
      if (n >= MAX_PHOTOS)
        throw new DomainError("conflict", `Maximum ${MAX_PHOTOS} photos par vehicule.`);
      const path = `${current.organizationId}/${vehicleId}/${randomUUID()}.${EXT[mimeType] ?? "bin"}`;
      const signed = await storage.createSignedUploadUrl(PHOTOS_BUCKET, path);
      return {
        path,
        uploadUrl: signed.uploadUrl,
        token: signed.token,
        expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
      };
    },

    /** Confirmation apres upload : le chemin doit appartenir au vehicule et le fichier exister. */
    async confirmPhoto(actor, vehicleId, input, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      if (!input.path.startsWith(`${current.organizationId}/${vehicleId}/`))
        throw notFound("Fichier");
      if (!(await storage.exists(PHOTOS_BUCKET, input.path))) throw notFound("Fichier");
      try {
        return await db.transaction(async (tx) => {
          const [nextRow] = await tx
            .select({ next: sql<number>`coalesce(max(position) + 1, 0)::int` })
            .from(vehiclePhotos)
            .where(eq(vehiclePhotos.vehicleId, vehicleId));
          const next = nextRow?.next ?? 0;
          if (next >= MAX_PHOTOS)
            throw new DomainError("conflict", `Maximum ${MAX_PHOTOS} photos par vehicule.`);
          const [row] = await tx
            .insert(vehiclePhotos)
            .values({
              vehicleId,
              organizationId: current.organizationId,
              storagePath: input.path,
              position: next,
              width: input.width ?? null,
              height: input.height ?? null,
              blurhash: input.blurhash ?? null,
            })
            .returning();
          await audit(tx, {
            actorId: actor.userId,
            actorType: "organization_member",
            action: "vehicle.photo.add",
            subjectType: "vehicle",
            subjectId: vehicleId,
            organizationId: current.organizationId,
            requestId,
          });
          return photoDto(row!);
        });
      } catch (error) {
        return translateDbError(error, "Ce fichier est deja enregistre.");
      }
    },

    async reorderPhotos(actor, vehicleId, photoIds, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      const existing = await db
        .select({ id: vehiclePhotos.id })
        .from(vehiclePhotos)
        .where(eq(vehiclePhotos.vehicleId, vehicleId));
      const known = new Set(existing.map((p) => p.id));
      if (
        photoIds.length !== known.size ||
        photoIds.some((id) => !known.has(id)) ||
        new Set(photoIds).size !== photoIds.length
      ) {
        throw new DomainError(
          "validation_failed",
          "La liste doit contenir exactement toutes les photos du vehicule.",
        );
      }
      await db.transaction(async (tx) => {
        // L'unicite (vehicle_id, position) est differee en fin de transaction : une seule passe suffit.
        for (const [i, id] of photoIds.entries())
          await tx.update(vehiclePhotos).set({ position: i }).where(eq(vehiclePhotos.id, id));
        await audit(tx, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "vehicle.photo.reorder",
          subjectType: "vehicle",
          subjectId: vehicleId,
          organizationId: current.organizationId,
          requestId,
        });
      });
      const rows = await db
        .select()
        .from(vehiclePhotos)
        .where(eq(vehiclePhotos.vehicleId, vehicleId))
        .orderBy(asc(vehiclePhotos.position));
      return rows.map(photoDto);
    },

    async deletePhoto(actor, vehicleId, photoId, requestId) {
      const current = await loadForMember(actor, vehicleId);
      assertCan(actor, "vehicle.write", { organizationId: current.organizationId });
      const [photo] = await db
        .select()
        .from(vehiclePhotos)
        .where(and(eq(vehiclePhotos.id, photoId), eq(vehiclePhotos.vehicleId, vehicleId)))
        .limit(1);
      if (!photo) throw notFound("Photo");
      await db.transaction(async (tx) => {
        await tx.delete(vehiclePhotos).where(eq(vehiclePhotos.id, photoId));
        const rest = await tx
          .select({ id: vehiclePhotos.id })
          .from(vehiclePhotos)
          .where(eq(vehiclePhotos.vehicleId, vehicleId))
          .orderBy(asc(vehiclePhotos.position));
        for (const [i, r] of rest.entries())
          await tx.update(vehiclePhotos).set({ position: i }).where(eq(vehiclePhotos.id, r.id));
        await audit(tx, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "vehicle.photo.delete",
          subjectType: "vehicle",
          subjectId: vehicleId,
          organizationId: current.organizationId,
          requestId,
        });
      });
      await storage.remove(PHOTOS_BUCKET, [photo.storagePath]);
    },
  };
}
