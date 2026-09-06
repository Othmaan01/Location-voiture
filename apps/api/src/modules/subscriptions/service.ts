import { and, asc, eq, sql } from "drizzle-orm";
import type { Plan, SubscriptionOverview } from "@lv/contracts";

import type { Database } from "../../db/client.js";
import { organizations, plans, vehicles } from "../../db/schema.js";
import { assertCanOrHide, type Actor } from "../../shared/authz.js";
import { notFound } from "../../shared/errors.js";

/** Grille et etat d'abonnement (lecture seule avant Stripe, Phase 5). Les quotas restent appliques en base. */
export interface SubscriptionsService {
  listPlans(): Promise<Plan[]>;
  overview(actor: Actor, organizationId: string): Promise<SubscriptionOverview>;
}

function planDto(row: typeof plans.$inferSelect): Plan {
  return {
    code: row.code,
    name: row.name,
    minVehicles: row.minVehicles,
    maxVehicles: row.maxPublishedVehicles,
    monthlyPriceCents: row.monthlyPriceCents,
    currency: row.currency as Plan["currency"],
    isQuote: row.isQuote,
  };
}

export function createSubscriptionsService(db: Database): SubscriptionsService {
  async function activePlans() {
    const rows = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.sortOrder), asc(plans.monthlyPriceCents));
    return rows.map(planDto);
  }
  return {
    listPlans: activePlans,

    async overview(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const [org] = await db
        .select({ planCode: organizations.planCode, trialEndsAt: organizations.trialEndsAt })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!org) throw notFound("Organisation");
      const [planRow] = await db.select().from(plans).where(eq(plans.code, org.planCode)).limit(1);
      if (!planRow) throw notFound("Offre");
      const [countRow] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(vehicles)
        .where(and(eq(vehicles.organizationId, organizationId), eq(vehicles.status, "published")));
      const trialEndsAt = org.trialEndsAt ?? null;
      const status: SubscriptionOverview["status"] = trialEndsAt
        ? trialEndsAt.getTime() > Date.now()
          ? "trialing"
          : "trial_expired"
        : "active";
      return {
        plan: planDto(planRow),
        publishedCount: countRow?.n ?? 0,
        status,
        trialEndsAt: trialEndsAt?.toISOString() ?? null,
        plans: await activePlans(),
      };
    },
  };
}
