import { and, desc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import type { Offer, OfferInput, PublicOffer } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { offers, vehicles } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";

type OfferRow = typeof offers.$inferSelect;

export function isLive(row: OfferRow, at = new Date()): boolean {
  return row.status === "active" && row.startsAt <= at && row.endsAt > at;
}

export function publicOffer(row: OfferRow): PublicOffer {
  return {
    id: row.id,
    title: row.title,
    discountType: row.discountType as PublicOffer["discountType"],
    discountValue: row.discountValue,
    endsAt: row.endsAt.toISOString(),
  };
}

/** Prix journalier apres offre, pour l'affichage barre (le devis reste la seule verite). */
export function discountedDaily(dailyCents: number, offer: PublicOffer): number {
  const raw =
    offer.discountType === "percent"
      ? Math.round((dailyCents * (100 - offer.discountValue)) / 100)
      : dailyCents - offer.discountValue;
  return Math.max(100, raw);
}

/**
 * Offre applicable a chaque vehicule : la meilleure remise en cours, une offre ciblee sur
 * le vehicule primant sur une offre "toute la flotte". Une requete pour N vehicules.
 */
export async function liveOffersFor(
  db: Database,
  vehicleRows: { id: string; organizationId: string }[],
  at = new Date(),
): Promise<Map<string, OfferRow>> {
  if (vehicleRows.length === 0) return new Map();
  const orgIds = [...new Set(vehicleRows.map((v) => v.organizationId))];
  const rows = await db
    .select()
    .from(offers)
    .where(
      and(
        inArray(offers.organizationId, orgIds),
        eq(offers.status, "active"),
        lte(offers.startsAt, at),
        gt(offers.endsAt, at),
      ),
    );
  const result = new Map<string, OfferRow>();
  for (const v of vehicleRows) {
    const candidates = rows.filter(
      (o) =>
        o.organizationId === v.organizationId && (o.vehicleId === null || o.vehicleId === v.id),
    );
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => {
      // Cible precise d'abord, puis remise la plus forte (en pourcentage, puis en montant).
      if ((a.vehicleId === null) !== (b.vehicleId === null)) return a.vehicleId === null ? 1 : -1;
      if (a.discountType !== b.discountType) return a.discountType === "percent" ? -1 : 1;
      return b.discountValue - a.discountValue;
    });
    result.set(v.id, candidates[0]!);
  }
  return result;
}

/** Meilleure offre en cours par organisation (feed). */
export async function liveOffersByOrganization(
  db: Database,
  orgIds: string[],
  at = new Date(),
): Promise<Map<string, OfferRow>> {
  if (orgIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(offers)
    .where(
      and(
        inArray(offers.organizationId, orgIds),
        eq(offers.status, "active"),
        lte(offers.startsAt, at),
        gt(offers.endsAt, at),
      ),
    )
    .orderBy(desc(offers.discountValue));
  const result = new Map<string, OfferRow>();
  for (const r of rows) if (!result.has(r.organizationId)) result.set(r.organizationId, r);
  return result;
}

export interface OffersService {
  list(actor: Actor, organizationId: string): Promise<Offer[]>;
  create(
    actor: Actor,
    organizationId: string,
    input: OfferInput,
    requestId: string,
  ): Promise<Offer>;
  archive(actor: Actor, offerId: string, requestId: string): Promise<void>;
}

export function createOffersService(db: Database): OffersService {
  async function hydrate(rows: OfferRow[]): Promise<Offer[]> {
    const vehicleIds = rows.map((r) => r.vehicleId).filter((v): v is string => !!v);
    const vehicleRows =
      vehicleIds.length > 0
        ? await db
            .select({ id: vehicles.id, brand: vehicles.brand, model: vehicles.model })
            .from(vehicles)
            .where(inArray(vehicles.id, vehicleIds))
        : [];
    const labels = new Map(vehicleRows.map((v) => [v.id, `${v.brand} ${v.model}`]));
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      vehicleId: r.vehicleId,
      vehicleLabel: r.vehicleId ? (labels.get(r.vehicleId) ?? null) : null,
      title: r.title,
      discountType: r.discountType as Offer["discountType"],
      discountValue: r.discountValue,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      status: r.status as Offer["status"],
      live: isLive(r),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  return {
    async list(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const rows = await db
        .select()
        .from(offers)
        .where(eq(offers.organizationId, organizationId))
        .orderBy(desc(offers.createdAt))
        .limit(100);
      return hydrate(rows);
    },

    async create(actor, organizationId, input, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "rate_plan.write", { organizationId });
      if (input.vehicleId) {
        const [v] = await db
          .select({
            id: vehicles.id,
            organizationId: vehicles.organizationId,
            status: vehicles.status,
          })
          .from(vehicles)
          .where(eq(vehicles.id, input.vehicleId))
          .limit(1);
        if (!v || v.organizationId !== organizationId) throw notFound("Vehicule");
        if (v.status === "archived") throw new DomainError("conflict", "Vehicule archive.");
      }
      // Une seule offre en cours par cible : on archive l'ancienne, elle reste dans l'historique.
      const now = new Date();
      await db
        .update(offers)
        .set({ status: "archived" })
        .where(
          and(
            eq(offers.organizationId, organizationId),
            eq(offers.status, "active"),
            gt(offers.endsAt, now),
            input.vehicleId ? eq(offers.vehicleId, input.vehicleId) : isNull(offers.vehicleId),
          ),
        );
      try {
        const [row] = await db
          .insert(offers)
          .values({
            organizationId,
            vehicleId: input.vehicleId ?? null,
            title: input.title,
            discountType: input.discountType,
            discountValue: input.discountValue,
            startsAt: now,
            endsAt: new Date(now.getTime() + input.durationDays * 86_400_000),
            createdBy: actor.userId,
          })
          .returning();
        await audit(db, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "offer.create",
          subjectType: "offer",
          subjectId: row!.id,
          organizationId,
          metadata: { discountType: input.discountType, discountValue: input.discountValue },
          requestId,
        });
        const [dto] = await hydrate([row!]);
        return dto!;
      } catch (error) {
        return translateDbError(error);
      }
    },

    async archive(actor, offerId, requestId) {
      const [row] = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
      if (!row) throw notFound("Offre");
      assertCanOrHide(actor, "organization.read", { organizationId: row.organizationId }, "Offre");
      assertCan(actor, "rate_plan.write", { organizationId: row.organizationId });
      await db.update(offers).set({ status: "archived" }).where(eq(offers.id, offerId));
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "offer.archive",
        subjectType: "offer",
        subjectId: offerId,
        organizationId: row.organizationId,
        requestId,
      });
    },
  };
}
