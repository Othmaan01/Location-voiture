import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { quote as computeQuote, type RatePlan as PricingRatePlan } from "@lv/pricing";
import type { Booking, BookingStatus, CreateBookingBody, Quote, QuoteRequest } from "@lv/contracts";

import type { Database, Transaction } from "../../db/client.js";
import {
  agencies,
  bookingEvents,
  bookings,
  customerReviews,
  organizations,
  profiles,
  quotes,
  ratePlans,
  reviews,
  vehiclePhotos,
  vehicles,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, type Actor } from "../../shared/authz.js";
import { isBusinessRuleViolation, translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";
import type { StorageClient } from "../../shared/storage.js";
import { parseRange, toRange } from "../availability/service.js";
import type { NotificationsService } from "../notifications/service.js";
import { liveOffersFor, publicOffer } from "../offers/service.js";
import { canReviewBooking } from "../reviews/service.js";
import { PHOTOS_BUCKET } from "../vehicles/service.js";
import { customerRatingsFor } from "../customer-reviews/service.js";
import { canTransition, type ActorKind } from "./state-machine.js";

const QUOTE_TTL_MS = 15 * 60 * 1000;
const RESPONSE_DELAY_MS = 24 * 60 * 60 * 1000;
/** Retrait possible le jour meme (retour fondateur, 2026-09-09) : 30 minutes de marge, pas plus. */
const MIN_LEAD_MS = 30 * 60 * 1000;

type BookingRow = typeof bookings.$inferSelect;

export interface BookingsService {
  createQuote(actor: Actor, input: QuoteRequest): Promise<Quote>;
  create(actor: Actor, input: CreateBookingBody, requestId: string): Promise<Booking>;
  get(actor: Actor, bookingId: string): Promise<Booking>;
  listMine(actor: Actor, scope: "upcoming" | "past" | "all"): Promise<Booking[]>;
  /** Administration : litiges ouverts, toutes organisations. */
  listDisputed(actor: Actor): Promise<Booking[]>;
  listForOrganization(
    actor: Actor,
    organizationId: string,
    scope: "upcoming" | "past" | "all",
    status?: BookingStatus,
  ): Promise<Booking[]>;
  decide(
    actor: Actor,
    bookingId: string,
    decision: "confirmed" | "declined",
    reason: string | undefined,
    requestId: string,
  ): Promise<Booking>;
  transition(
    actor: Actor,
    bookingId: string,
    to: "active" | "completed" | "no_show" | "cancelled" | "disputed" | "resolved",
    reason: string | undefined,
    requestId: string,
    extra?: Partial<typeof bookings.$inferInsert>,
  ): Promise<Booking>;
  expireOverdue(): Promise<number>;
}

export function createBookingsService(
  db: Database,
  storage: StorageClient,
  notify: NotificationsService,
): BookingsService {
  function toPricing(p: typeof ratePlans.$inferSelect): PricingRatePlan {
    return {
      currency: p.currency as PricingRatePlan["currency"],
      dailyCents: p.dailyCents,
      weekendDailyCents: p.weekendDailyCents,
      weeklyCents: p.weeklyCents,
      monthlyCents: p.monthlyCents,
      depositCents: p.depositCents,
      kmIncludedPerDay: p.kmIncludedPerDay,
      extraKmCents: p.extraKmCents,
      minDays: p.minDays,
      maxDays: p.maxDays,
    };
  }

  /** Vehicule publiquement reservable : organisation verifiee, agence positionnee, vehicule publie non suspendu, plan actif. */
  async function loadBookable(vehicleId: string) {
    const [row] = await db
      .select({
        v: vehicles,
        agency: agencies,
        orgName: organizations.name,
        orgStatus: organizations.status,
      })
      .from(vehicles)
      .innerJoin(agencies, eq(agencies.id, vehicles.agencyId))
      .innerJoin(organizations, eq(organizations.id, vehicles.organizationId))
      .where(eq(vehicles.id, vehicleId))
      .limit(1);
    if (
      !row ||
      row.v.status !== "published" ||
      row.v.suspendedAt ||
      row.orgStatus !== "verified" ||
      row.agency.status === "suspended" ||
      row.agency.latitude === null
    )
      throw notFound("Vehicule");
    const [plan] = await db
      .select()
      .from(ratePlans)
      .where(and(eq(ratePlans.vehicleId, vehicleId), eq(ratePlans.isActive, true)))
      .limit(1);
    if (!plan) throw notFound("Vehicule");
    return { ...row, plan };
  }

  async function hydrate(rows: BookingRow[], viewer: Actor): Promise<Booking[]> {
    if (rows.length === 0) return [];
    const vehicleIds = [...new Set(rows.map((r) => r.vehicleId))];
    const agencyIds = [...new Set(rows.map((r) => r.agencyId))];
    const customerIds = [...new Set(rows.map((r) => r.customerId))];
    const [
      vehicleRows,
      agencyRows,
      orgRows,
      photoRows,
      planRows,
      customerRows,
      events,
      completedRows,
      reviewRows,
    ] = await Promise.all([
      db.select().from(vehicles).where(inArray(vehicles.id, vehicleIds)),
      db.select().from(agencies).where(inArray(agencies.id, agencyIds)),
      db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(inArray(organizations.id, [...new Set(rows.map((r) => r.organizationId))])),
      db
        .select({ vehicleId: vehiclePhotos.vehicleId, path: vehiclePhotos.storagePath })
        .from(vehiclePhotos)
        .where(and(inArray(vehiclePhotos.vehicleId, vehicleIds), eq(vehiclePhotos.position, 0))),
      db
        .select()
        .from(ratePlans)
        .where(and(inArray(ratePlans.vehicleId, vehicleIds), eq(ratePlans.isActive, true))),
      db
        .select({
          id: profiles.id,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          phone: profiles.phone,
          avatarPath: profiles.avatarPath,
        })
        .from(profiles)
        .where(inArray(profiles.id, customerIds)),
      db
        .select()
        .from(bookingEvents)
        .where(
          inArray(
            bookingEvents.bookingId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(bookingEvents.createdAt),
      db
        .select({ customerId: bookings.customerId, n: sql<number>`count(*)::int` })
        .from(bookings)
        .where(and(inArray(bookings.customerId, customerIds), eq(bookings.status, "completed")))
        .groupBy(bookings.customerId),
      db
        .select({
          id: reviews.id,
          bookingId: reviews.bookingId,
          rating: reviews.rating,
          comment: reviews.comment,
        })
        .from(reviews)
        .where(
          inArray(
            reviews.bookingId,
            rows.map((r) => r.id),
          ),
        ),
    ]);
    const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
    const vehicleMap = byId(vehicleRows);
    const agencyMap = byId(agencyRows);
    const orgMap = byId(orgRows);
    const customerMap = byId(customerRows);
    const photoMap = new Map(photoRows.map((p) => [p.vehicleId, p.path]));
    const planMap = new Map(planRows.map((p) => [p.vehicleId, p]));
    const completedMap = new Map(completedRows.map((c) => [c.customerId, c.n]));
    const reviewMap = new Map(reviewRows.map((rv) => [rv.bookingId, rv]));
    // Note des clients par les loueurs (ADR-0020), et reservations deja notees par l'organisation.
    const customerRatings = await customerRatingsFor(db, customerIds);
    const reviewedBookings = new Set(
      (
        await db
          .select({ bookingId: customerReviews.bookingId })
          .from(customerReviews)
          .where(
            inArray(
              customerReviews.bookingId,
              rows.map((r) => r.id),
            ),
          )
      ).map((x) => x.bookingId),
    );

    return rows.map((r) => {
      const v = vehicleMap.get(r.vehicleId)!;
      const a = agencyMap.get(r.agencyId)!;
      const isMember = viewer.memberships.has(r.organizationId) || viewer.platformRole !== null;
      const isCustomer = viewer.userId === r.customerId;
      const contactRevealed =
        r.status === "confirmed" || r.status === "active" || r.status === "completed" || isMember;
      const period = parseRange(r.period);
      const days = Math.max(
        1,
        Math.ceil((new Date(period.to).getTime() - new Date(period.from).getTime()) / 86_400_000),
      );
      const c = customerMap.get(r.customerId);
      return {
        id: r.id,
        reference: r.reference,
        status: r.status,
        statusChangedAt: r.statusChangedAt.toISOString(),
        handedOverAt: r.handedOverAt?.toISOString() ?? null,
        contractSignedAt: r.contractSignedAt?.toISOString() ?? null,
        from: period.from,
        to: period.to,
        days,
        vehicle: {
          id: v.id,
          brand: v.brand,
          model: v.model,
          version: v.version,
          category: v.category,
          transmission: v.transmission,
          fuel: v.fuel,
          seats: v.seats,
          photoUrl: photoMap.has(v.id)
            ? storage.publicUrl(PHOTOS_BUCKET, photoMap.get(v.id)!)
            : null,
          dailyCents: planMap.get(v.id)?.dailyCents ?? null,
          discountedDailyCents: null,
          offer: null,
          depositCents: r.depositCents,
          currency: "EUR",
          agencyId: v.agencyId,
          available: null,
        },
        loueurId: r.organizationId,
        loueurName: orgMap.get(r.organizationId)?.name ?? "",
        contact: contactRevealed
          ? {
              agencyName: a.name,
              addressLine: a.addressLine,
              postalCode: a.postalCode,
              cityName: a.cityName,
              latitude: a.latitude,
              longitude: a.longitude,
              phone: a.phone,
            }
          : null,
        customer:
          isMember && c
            ? {
                userId: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
                phone:
                  r.status === "confirmed" || r.status === "active" || r.status === "completed"
                    ? c.phone
                    : null,
                completedBookings: completedMap.get(c.id) ?? 0,
                avatarUrl: c.avatarPath ? storage.publicUrl(PHOTOS_BUCKET, c.avatarPath) : null,
                ratingAverage: customerRatings.get(c.id)?.average ?? null,
                ratingCount: customerRatings.get(c.id)?.count ?? 0,
                reviewedByOrganization: reviewedBookings.has(r.id),
              }
            : null,
        total: { cents: r.totalCents, currency: "EUR" },
        deposit: { cents: r.depositCents, currency: "EUR" },
        currency: "EUR",
        customerMessage: isMember || isCustomer ? r.customerMessage : null,
        declineReason: r.declineReason,
        cancellationReason: r.cancellationReason,
        expiresAt: r.status === "requested" ? (r.expiresAt?.toISOString() ?? null) : null,
        events: events
          .filter((e) => e.bookingId === r.id)
          .map((e) => ({
            id: e.id,
            fromStatus: e.fromStatus,
            toStatus: e.toStatus,
            actorType: e.actorType,
            reason: e.reason,
            createdAt: e.createdAt.toISOString(),
          })),
        canReview: isCustomer && !reviewMap.has(r.id) && canReviewBooking(r),
        review: reviewMap.has(r.id)
          ? {
              id: reviewMap.get(r.id)!.id,
              rating: reviewMap.get(r.id)!.rating,
              comment: reviewMap.get(r.id)!.comment,
            }
          : null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  /** Charge une reservation visible par l'acteur (client ou membre), sinon 404. */
  async function loadVisible(actor: Actor, bookingId: string): Promise<BookingRow> {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!row) throw notFound("Reservation");
    const ok =
      actor.userId === row.customerId ||
      actor.memberships.has(row.organizationId) ||
      actor.platformRole !== null;
    if (!ok) throw notFound("Reservation");
    return row;
  }

  async function applyTransition(
    tx: Transaction,
    row: BookingRow,
    to: BookingStatus,
    actor: Actor,
    actorType: ActorKind,
    reason: string | undefined,
    requestId: string,
    extra: Partial<typeof bookings.$inferInsert> = {},
  ) {
    if (!canTransition(row.status, to, actorType))
      throw new DomainError("conflict", `Transition ${row.status} -> ${to} impossible.`);
    const [updated] = await tx
      .update(bookings)
      .set({ status: to, ...extra })
      .where(and(eq(bookings.id, row.id), eq(bookings.status, row.status)))
      .returning();
    if (!updated) throw new DomainError("conflict", "La reservation a change entre-temps.");
    await tx.insert(bookingEvents).values({
      bookingId: row.id,
      organizationId: row.organizationId,
      fromStatus: row.status,
      toStatus: to,
      actorId: actor.userId,
      actorType,
      reason: reason ?? null,
    });
    await audit(tx, {
      actorId: actor.userId,
      actorType:
        actorType === "customer" ? "customer" : actorType === "system" ? "system" : actorType,
      action: `booking.${to}`,
      subjectType: "booking",
      subjectId: row.id,
      organizationId: row.organizationId,
      metadata: { reason: reason ?? null },
      requestId,
    });
    return updated;
  }

  return {
    async createQuote(actor, input) {
      // Un devis peut etre demande sans compte (affichage du prix) ; la reservation, elle, exige un compte.
      const target = await loadBookable(input.vehicleId);
      const from = new Date(input.from);
      const to = new Date(input.to);
      if (from.getTime() < Date.now() + MIN_LEAD_MS)
        throw new DomainError(
          "validation_failed",
          "Le retrait doit etre au moins 30 minutes apres maintenant.",
          { field: "from" },
        );
      // Une seule demande par client, par vehicule et par periode : on l'oriente vers sa demande existante.
      if (actor.userId) {
        const [dup] = await db.execute<{ id: string }>(
          sql`select id from ${bookings} where customer_id = ${actor.userId}::uuid and vehicle_id = ${input.vehicleId}::uuid
              and status in ('requested', 'confirmed', 'active') and period && ${toRange(input.from, input.to)} limit 1`,
        );
        if (dup)
          throw new DomainError(
            "conflict",
            "Vous avez deja une demande en cours pour ce vehicule sur ces dates.",
            { blocker: "duplicate_request", bookingId: dup.id },
          );
      }
      // Offre du loueur en cours au moment de la demande (pas au moment du retrait).
      const offerRow = (
        await liveOffersFor(db, [{ id: target.v.id, organizationId: target.v.organizationId }])
      ).get(target.v.id);
      const offer = offerRow ? publicOffer(offerRow) : null;
      let priced;
      try {
        priced = computeQuote({
          ratePlan: toPricing(target.plan),
          period: { start: input.from, end: input.to },
          agencyTimeZone: target.agency.timezone,
          discount: offer
            ? {
                label: `Offre : ${offer.title}`,
                type: offer.discountType,
                value: offer.discountValue,
              }
            : null,
        });
      } catch (error) {
        throw new DomainError(
          "validation_failed",
          error instanceof Error ? error.message : "Periode invalide.",
          { field: "to" },
        );
      }
      const [avail] = await db.execute<{ ok: boolean }>(
        sql`select public.vehicle_is_available(${input.vehicleId}::uuid, ${toRange(input.from, input.to)}) as ok`,
      );
      if (!avail?.ok)
        throw new DomainError("conflict", "Ce vehicule est deja reserve sur ces dates.", {
          blocker: "unavailable",
        });
      const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
      const [row] = await db
        .insert(quotes)
        .values({
          userId: actor.userId,
          vehicleId: input.vehicleId,
          organizationId: target.v.organizationId,
          ratePlanId: target.plan.id,
          pickupAgencyId: target.agency.id,
          period: toRange(input.from, input.to),
          lines: priced.lines,
          subtotalCents: priced.subtotal.cents,
          feesCents: priced.fees.cents,
          totalCents: priced.total.cents,
          depositCents: priced.deposit.cents,
          currency: "EUR",
          expiresAt,
          offerId: offer?.id ?? null,
        })
        .returning({ id: quotes.id });
      return {
        id: row!.id,
        vehicleId: input.vehicleId,
        agencyId: target.agency.id,
        from: from.toISOString(),
        to: to.toISOString(),
        days: priced.days,
        lines: priced.lines,
        subtotal: priced.subtotal,
        fees: priced.fees,
        total: priced.total,
        deposit: priced.deposit,
        kmIncludedPerDay: target.plan.kmIncludedPerDay,
        extraKmCents: target.plan.extraKmCents,
        offer,
        expiresAt: expiresAt.toISOString(),
      };
    },

    /**
     * Demande de reservation (ADR-0005) : devis non expire appartenant au demandeur, verrou par
     * vehicule, re-verification de disponibilite, insertion en `requested`, evenement, notification.
     * Le client ne transmet jamais un montant : tout vient du devis.
     */
    async create(actor, input, requestId) {
      assertCan(actor, "booking.create");
      const userId = actor.userId!;
      const [q] = await db.select().from(quotes).where(eq(quotes.id, input.quoteId)).limit(1);
      if (!q || (q.userId !== null && q.userId !== userId)) throw notFound("Devis");
      if (q.expiresAt.getTime() < Date.now())
        throw new DomainError("conflict", "Ce devis a expire, recalculez le prix.", {
          code: "quote_expired",
        });
      if (actor.memberships.has(q.organizationId))
        throw new DomainError(
          "conflict",
          "Vous ne pouvez pas reserver un vehicule de votre propre organisation.",
        );
      const period = parseRange(q.period);
      try {
        const created = await db.transaction(async (tx) => {
          await tx.execute(
            sql`select id from ${vehicles} where id = ${q.vehicleId}::uuid for update`,
          );
          const [avail] = await tx.execute<{ ok: boolean }>(
            sql`select public.vehicle_is_available(${q.vehicleId}::uuid, ${toRange(period.from, period.to)}) as ok`,
          );
          if (!avail?.ok)
            throw new DomainError("conflict", "Ce vehicule vient d'etre reserve sur ces dates.", {
              blocker: "unavailable",
            });
          const [dup] = await tx.execute<{ id: string }>(
            sql`select id from ${bookings} where customer_id = ${actor.userId}::uuid and vehicle_id = ${q.vehicleId}::uuid
                and status in ('requested', 'confirmed', 'active') and period && ${toRange(period.from, period.to)} limit 1`,
          );
          if (dup)
            throw new DomainError(
              "conflict",
              "Vous avez deja une demande en cours pour ce vehicule sur ces dates.",
              { blocker: "duplicate_request", bookingId: dup.id },
            );
          const [existing] = await tx.execute<{ id: string }>(
            sql`select id from ${bookings} where quote_id = ${q.id}::uuid limit 1`,
          );
          if (existing)
            throw new DomainError("conflict", "Ce devis a deja donne lieu a une demande.");
          const [row] = await tx
            .insert(bookings)
            .values({
              organizationId: q.organizationId,
              agencyId: q.pickupAgencyId,
              vehicleId: q.vehicleId,
              customerId: userId,
              quoteId: q.id,
              period: toRange(period.from, period.to),
              status: "requested",
              customerMessage: input.message ?? null,
              totalCents: q.totalCents,
              depositCents: q.depositCents,
              currency: q.currency,
              priceSnapshot: {
                lines: q.lines,
                subtotalCents: q.subtotalCents,
                feesCents: q.feesCents,
                totalCents: q.totalCents,
                depositCents: q.depositCents,
              },
              expiresAt: new Date(
                Math.min(Date.now() + RESPONSE_DELAY_MS, new Date(period.from).getTime()),
              ),
            })
            .returning();
          await tx.insert(bookingEvents).values({
            bookingId: row!.id,
            organizationId: q.organizationId,
            fromStatus: null,
            toStatus: "requested",
            actorId: userId,
            actorType: "customer",
          });
          await audit(tx, {
            actorId: userId,
            actorType: "customer",
            action: "booking.request",
            subjectType: "booking",
            subjectId: row!.id,
            organizationId: q.organizationId,
            metadata: { totalCents: q.totalCents },
            requestId,
          });
          return row!;
        });
        const [dto] = await hydrate([created], actor);
        void notify.notifyOrganization(q.organizationId, {
          kind: "booking.requested",
          title: "Nouvelle demande de reservation",
          body: `${dto!.vehicle.brand} ${dto!.vehicle.model} · ${dto!.days} jour${dto!.days > 1 ? "s" : ""} · ${(dto!.total.cents / 100).toFixed(0)} €`,
          data: { bookingId: created.id },
        });
        return dto!;
      } catch (error) {
        if (isBusinessRuleViolation(error))
          throw new DomainError("conflict", "Ce vehicule n'est plus disponible sur ces dates.");
        return translateDbError(error);
      }
    },

    async get(actor, bookingId) {
      const row = await loadVisible(actor, bookingId);
      const [dto] = await hydrate([row], actor);
      return dto!;
    },

    async listMine(actor, scope) {
      assertCan(actor, "booking.read_own");
      const rows = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.customerId, actor.userId!), scopeFilter(scope)))
        .orderBy(desc(bookings.createdAt))
        .limit(100);
      return hydrate(rows, actor);
    },

    async listDisputed(actor) {
      assertCan(actor, "organization.suspend");
      const rows = await db
        .select()
        .from(bookings)
        .where(eq(bookings.status, "disputed"))
        .orderBy(desc(bookings.statusChangedAt))
        .limit(200);
      return hydrate(rows, actor);
    },

    async listForOrganization(actor, organizationId, scope, status) {
      assertCan(actor, "booking.read_org", { organizationId });
      const rows = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.organizationId, organizationId),
            scopeFilter(scope),
            status ? eq(bookings.status, status) : undefined,
          ),
        )
        .orderBy(desc(bookings.createdAt))
        .limit(200);
      return hydrate(rows, actor);
    },

    async decide(actor, bookingId, decision, reason, requestId) {
      const row = await loadVisible(actor, bookingId);
      assertCan(actor, "booking.decide", { organizationId: row.organizationId });
      if (decision === "declined" && !reason)
        throw new DomainError("validation_failed", "Indiquez un motif de refus.", {
          field: "reason",
        });
      try {
        const updated = await db.transaction(async (tx) => {
          await tx.execute(
            sql`select id from ${vehicles} where id = ${row.vehicleId}::uuid for update`,
          );
          if (decision === "confirmed") {
            const period = parseRange(row.period);
            const [avail] = await tx.execute<{ ok: boolean }>(
              sql`select public.vehicle_is_available(${row.vehicleId}::uuid, ${toRange(period.from, period.to)}) as ok`,
            );
            if (!avail?.ok)
              throw new DomainError(
                "conflict",
                "Le vehicule n'est plus disponible sur cette periode (autre reservation ou blocage).",
              );
          }
          return applyTransition(
            tx,
            row,
            decision,
            actor,
            "organization_member",
            reason,
            requestId,
            decision === "declined" ? { declineReason: reason ?? null } : {},
          );
        });
        const [dto] = await hydrate([updated], actor);
        void notify.notifyUser(
          row.customerId,
          decision === "confirmed"
            ? {
                kind: "booking.confirmed",
                title: "Reservation confirmee",
                body: `${dto!.loueurName} a confirme votre ${dto!.vehicle.brand} ${dto!.vehicle.model}.`,
                data: { bookingId: row.id },
              }
            : {
                kind: "booking.declined",
                title: "Demande refusee",
                body: `${dto!.loueurName} n'a pas pu accepter votre demande.`,
                data: { bookingId: row.id },
              },
        );
        return dto!;
      } catch (error) {
        if (isBusinessRuleViolation(error))
          throw new DomainError("conflict", "Le vehicule n'est plus disponible sur cette periode.");
        return translateDbError(error);
      }
    },

    async transition(actor, bookingId, to, reason, requestId, extra = {}) {
      const row = await loadVisible(actor, bookingId);
      const isCustomer = actor.userId === row.customerId;
      const actorType: ActorKind = isCustomer
        ? "customer"
        : actor.platformRole && !actor.memberships.has(row.organizationId)
          ? "platform"
          : "organization_member";
      if (actorType === "organization_member")
        assertCan(actor, "booking.decide", { organizationId: row.organizationId });
      if (to === "cancelled" && actorType === "organization_member" && !reason)
        throw new DomainError("validation_failed", "Indiquez un motif d'annulation.", {
          field: "reason",
        });
      if ((to === "disputed" || to === "resolved") && !reason)
        throw new DomainError("validation_failed", "Indiquez le motif.", { field: "reason" });
      try {
        const updated = await db.transaction(async (tx) =>
          applyTransition(tx, row, to, actor, actorType, reason, requestId, {
            ...(to === "cancelled"
              ? {
                  cancellationReason: reason ?? null,
                  cancelledBy:
                    actorType === "customer"
                      ? "customer"
                      : actorType === "platform"
                        ? "platform"
                        : "organization_member",
                }
              : {}),
            ...extra,
          }),
        );
        const [dto] = await hydrate([updated], actor);
        if (to === "disputed") {
          const payload = {
            kind: "booking.disputed",
            title: "Litige ouvert",
            body: `${dto!.reference} : ${(reason ?? "").slice(0, 100)}`,
            data: { bookingId: row.id },
          };
          if (actorType === "customer") void notify.notifyOrganization(row.organizationId, payload);
          else void notify.notifyUser(row.customerId, payload);
        }
        if (to === "resolved") {
          const payload = {
            kind: "booking.resolved",
            title: "Litige resolu",
            body: `${dto!.reference} : ${(reason ?? "").slice(0, 100)}`,
            data: { bookingId: row.id },
          };
          void notify.notifyOrganization(row.organizationId, payload);
          void notify.notifyUser(row.customerId, payload);
        }
        if (to === "active") {
          void notify.notifyUser(row.customerId, {
            kind: "booking.started",
            title: "Vehicule remis",
            body: `${dto!.loueurName} a valide la remise de votre ${dto!.vehicle.brand} ${dto!.vehicle.model}. Bonne route !`,
            data: { bookingId: row.id },
          });
        }
        if (to === "completed") {
          void notify.notifyUser(row.customerId, {
            kind: "review.request",
            title: "Comment s'est passee votre location ?",
            body: `Laissez un avis sur ${dto!.loueurName} : cela aide les autres clients.`,
            data: { bookingId: row.id },
          });
        }
        if (to === "cancelled") {
          if (actorType === "customer")
            void notify.notifyOrganization(row.organizationId, {
              kind: "booking.cancelled",
              title: "Reservation annulee par le client",
              body: `${dto!.vehicle.brand} ${dto!.vehicle.model} · ${dto!.reference}`,
              data: { bookingId: row.id },
            });
          else
            void notify.notifyUser(row.customerId, {
              kind: "booking.cancelled",
              title: "Reservation annulee",
              body: `${dto!.loueurName} a annule la reservation ${dto!.reference}.`,
              data: { bookingId: row.id },
            });
        }
        return dto!;
      } catch (error) {
        return translateDbError(error);
      }
    },

    /** Job : les demandes sans reponse passent en `expired` et le client est prevenu. */
    async expireOverdue() {
      const overdue = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.status, "requested"), sql`${bookings.expiresAt} < now()`))
        .limit(100);
      let n = 0;
      for (const row of overdue) {
        try {
          await db.transaction(async (tx) =>
            applyTransition(
              tx,
              row,
              "expired",
              { userId: null, platformRole: null, memberships: new Map() },
              "system",
              "Sans reponse du loueur dans le delai",
              "job:expire",
            ),
          );
          void notify.notifyUser(row.customerId, {
            kind: "booking.expired",
            title: "Demande expiree",
            body: "Le loueur n'a pas repondu a temps. Essayez un autre vehicule.",
            data: { bookingId: row.id },
          });
          n += 1;
        } catch {
          // deja traitee entre-temps
        }
      }
      return n;
    },
  };
}

function scopeFilter(scope: "upcoming" | "past" | "all") {
  if (scope === "all") return undefined;
  if (scope === "upcoming")
    return sql`(upper(${bookings.period}) >= now() and ${bookings.status} in ('requested', 'confirmed', 'active'))`;
  return sql`(upper(${bookings.period}) < now() or ${bookings.status} in ('completed', 'declined', 'expired', 'cancelled', 'no_show', 'resolved'))`;
}
