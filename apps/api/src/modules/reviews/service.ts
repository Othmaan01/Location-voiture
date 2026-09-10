import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { CreateReviewBody, Review } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { bookings, organizationMembers, profiles, reviews, vehicles } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { translateDbError } from "../../shared/db-errors.js";
import { DomainError, forbidden, notFound } from "../../shared/errors.js";
import type { NotificationsService } from "../notifications/service.js";

/** Fenetre pour laisser un avis apres la fin de la location. */
export const REVIEW_WINDOW_DAYS = 30;

/** Prenom + initiale : jamais le nom complet en public. */
export function displayName(firstName: string | null, lastName: string | null): string {
  const first = firstName?.trim();
  const initial = lastName?.trim()?.[0];
  if (!first) return "Client";
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}

export function canReviewBooking(row: { status: string; statusChangedAt: Date }): boolean {
  return (
    row.status === "completed" &&
    Date.now() - row.statusChangedAt.getTime() < REVIEW_WINDOW_DAYS * 86_400_000
  );
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

/** Note moyenne et nombre d'avis publies, par organisation (une requete pour N). */
export async function ratingsFor(
  db: Database,
  orgIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (orgIds.length === 0) return new Map();
  const rows = await db
    .select({
      organizationId: reviews.organizationId,
      average: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(and(inArray(reviews.organizationId, orgIds), eq(reviews.status, "published")))
    .groupBy(reviews.organizationId);
  return new Map(rows.map((r) => [r.organizationId, { average: r.average, count: r.count }]));
}

export interface ReviewsService {
  create(
    actor: Actor,
    bookingId: string,
    input: CreateReviewBody,
    requestId: string,
  ): Promise<Review>;
  listPublic(
    organizationId: string,
    viewer: Actor,
  ): Promise<{ reviews: Review[]; rating: RatingSummary }>;
  reply(actor: Actor, reviewId: string, reply: string, requestId: string): Promise<Review>;
  moderate(
    actor: Actor,
    reviewId: string,
    hidden: boolean,
    reason: string | undefined,
    requestId: string,
  ): Promise<Review>;
}

export function createReviewsService(db: Database, notify: NotificationsService): ReviewsService {
  async function hydrate(rows: (typeof reviews.$inferSelect)[]): Promise<Review[]> {
    if (rows.length === 0) return [];
    const customerIds = [...new Set(rows.map((r) => r.customerId))];
    const vehicleIds = [...new Set(rows.map((r) => r.vehicleId).filter((v): v is string => !!v))];
    const [customers, vehicleRows] = await Promise.all([
      db
        .select({ id: profiles.id, firstName: profiles.firstName, lastName: profiles.lastName })
        .from(profiles)
        .where(inArray(profiles.id, customerIds)),
      vehicleIds.length > 0
        ? db
            .select({ id: vehicles.id, brand: vehicles.brand, model: vehicles.model })
            .from(vehicles)
            .where(inArray(vehicles.id, vehicleIds))
        : Promise.resolve([]),
    ]);
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const vehicleMap = new Map(vehicleRows.map((v) => [v.id, `${v.brand} ${v.model}`]));
    return rows.map((r) => {
      const c = customerMap.get(r.customerId);
      return {
        id: r.id,
        bookingId: r.bookingId,
        organizationId: r.organizationId,
        vehicleId: r.vehicleId,
        vehicleLabel: r.vehicleId ? (vehicleMap.get(r.vehicleId) ?? null) : null,
        customerName: displayName(c?.firstName ?? null, c?.lastName ?? null),
        rating: r.rating,
        comment: r.comment,
        reply: r.reply,
        repliedAt: r.repliedAt?.toISOString() ?? null,
        status: r.status as Review["status"],
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  async function load(reviewId: string) {
    const [row] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
    if (!row) throw notFound("Avis");
    return row;
  }

  return {
    async create(actor, bookingId, input, requestId) {
      assertCan(actor, "booking.read_own");
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
      if (!booking || booking.customerId !== actor.userId) throw notFound("Reservation");
      if (!canReviewBooking(booking))
        throw new DomainError(
          "conflict",
          `Un avis se laisse apres une location terminee, dans les ${REVIEW_WINDOW_DAYS} jours.`,
        );
      try {
        const row = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(reviews)
            .values({
              bookingId,
              organizationId: booking.organizationId,
              vehicleId: booking.vehicleId,
              customerId: actor.userId!,
              rating: input.rating,
              comment: input.comment?.trim() || null,
            })
            .returning();
          await audit(tx, {
            actorId: actor.userId,
            actorType: "customer",
            action: "review.create",
            subjectType: "review",
            subjectId: created!.id,
            organizationId: booking.organizationId,
            metadata: { rating: input.rating },
            requestId,
          });
          return created!;
        });
        void notify.notifyOrganization(booking.organizationId, {
          kind: "review.new",
          title: "Nouvel avis client",
          body: `${input.rating}/5 sur la reservation ${booking.reference}.`,
          data: { bookingId },
        });
        const [dto] = await hydrate([row]);
        return dto!;
      } catch (error) {
        return translateDbError(error, "Vous avez deja laisse un avis pour cette reservation.");
      }
    },

    async listPublic(organizationId, viewer) {
      const isMember = viewer.memberships.has(organizationId) || viewer.platformRole !== null;
      const rows = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.organizationId, organizationId),
            isMember ? undefined : eq(reviews.status, "published"),
          ),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(100);
      const ratings = await ratingsFor(db, [organizationId]);
      return {
        reviews: await hydrate(rows),
        rating: ratings.get(organizationId) ?? { average: null, count: 0 },
      };
    },

    async reply(actor, reviewId, reply, requestId) {
      const row = await load(reviewId);
      assertCanOrHide(actor, "organization.read", { organizationId: row.organizationId }, "Avis");
      assertCan(actor, "vehicle.write", { organizationId: row.organizationId });
      const [updated] = await db
        .update(reviews)
        .set({ reply: reply.trim(), repliedAt: new Date() })
        .where(eq(reviews.id, reviewId))
        .returning();
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "review.reply",
        subjectType: "review",
        subjectId: reviewId,
        organizationId: row.organizationId,
        requestId,
      });
      void notify.notifyUser(row.customerId, {
        kind: "review.reply",
        title: "Le loueur a repondu a votre avis",
        body: reply.trim().slice(0, 120),
        data: { bookingId: row.bookingId },
      });
      const [dto] = await hydrate([updated!]);
      return dto!;
    },

    async moderate(actor, reviewId, hidden, reason, requestId) {
      assertCan(actor, "organization.suspend");
      if (!actor.userId) throw forbidden();
      const row = await load(reviewId);
      const [updated] = await db
        .update(reviews)
        .set({
          status: hidden ? "hidden" : "published",
          hiddenReason: hidden ? (reason ?? null) : null,
        })
        .where(eq(reviews.id, reviewId))
        .returning();
      await audit(db, {
        actorId: actor.userId,
        actorType: "platform",
        action: hidden ? "review.hide" : "review.unhide",
        subjectType: "review",
        subjectId: reviewId,
        organizationId: row.organizationId,
        metadata: reason ? { reason } : {},
        requestId,
      });
      const [dto] = await hydrate([updated!]);
      return dto!;
    },
  };
}

/** Utilise par la messagerie : les membres d'une organisation (pour les noms). */
export async function memberIds(db: Database, organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));
  return rows.map((r) => r.userId);
}
