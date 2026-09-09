import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { CustomerReview, CustomerReviewInput } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { bookings, customerReviews, organizations } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, type Actor } from "../../shared/authz.js";
import { DomainError, notFound } from "../../shared/errors.js";

/** Moyenne et nombre d'evaluations recues par chaque client (ADR-0020). */
export async function customerRatingsFor(
  db: Database,
  customerIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  if (customerIds.length === 0) return new Map();
  const rows = await db
    .select({
      customerId: customerReviews.customerId,
      average: sql<number>`round(avg(${customerReviews.rating})::numeric, 1)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(customerReviews)
    .where(inArray(customerReviews.customerId, customerIds))
    .groupBy(customerReviews.customerId);
  return new Map(rows.map((r) => [r.customerId, { average: r.average, count: r.count }]));
}

export interface CustomerReviewsService {
  create(
    actor: Actor,
    bookingId: string,
    input: CustomerReviewInput,
    requestId: string,
  ): Promise<CustomerReview>;
  listMine(
    actor: Actor,
  ): Promise<{ reviews: CustomerReview[]; average: number | null; count: number }>;
}

export function createCustomerReviewsService(db: Database): CustomerReviewsService {
  const toDto = (
    r: typeof customerReviews.$inferSelect,
    organizationName: string,
  ): CustomerReview => ({
    id: r.id,
    bookingId: r.bookingId,
    organizationId: r.organizationId,
    organizationName,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  });
  return {
    async create(actor, bookingId, input, requestId) {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
      if (!booking || !actor.memberships.has(booking.organizationId)) throw notFound("Reservation");
      assertCan(actor, "vehicle.write", { organizationId: booking.organizationId });
      if (booking.status !== "completed")
        throw new DomainError("conflict", "Un client se note apres une location terminee.");
      const [existing] = await db
        .select({ id: customerReviews.id })
        .from(customerReviews)
        .where(eq(customerReviews.bookingId, bookingId))
        .limit(1);
      if (existing)
        throw new DomainError("conflict", "Ce client a deja ete note pour cette location.");
      const [row] = await db
        .insert(customerReviews)
        .values({
          bookingId,
          organizationId: booking.organizationId,
          customerId: booking.customerId,
          authorId: actor.userId,
          rating: input.rating,
          comment: input.comment?.trim() || null,
        })
        .returning();
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, booking.organizationId))
        .limit(1);
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "customer_review.create",
        subjectType: "booking",
        subjectId: bookingId,
        organizationId: booking.organizationId,
        metadata: { rating: input.rating },
        requestId,
      });
      return toDto(row!, org?.name ?? "Loueur");
    },

    async listMine(actor) {
      const userId = actor.userId!;
      const rows = await db
        .select({ review: customerReviews, organizationName: organizations.name })
        .from(customerReviews)
        .innerJoin(organizations, eq(organizations.id, customerReviews.organizationId))
        .where(and(eq(customerReviews.customerId, userId)))
        .orderBy(desc(customerReviews.createdAt))
        .limit(50);
      const ratings = await customerRatingsFor(db, [userId]);
      const mine = ratings.get(userId);
      return {
        reviews: rows.map((r) => toDto(r.review, r.organizationName)),
        average: mine?.average ?? null,
        count: mine?.count ?? 0,
      };
    },
  };
}
