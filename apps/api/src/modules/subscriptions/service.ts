import { and, asc, eq, sql } from "drizzle-orm";
import type { Plan, SubscriptionOverview } from "@lv/contracts";

/** Journal minimal (pino ou fastify) : on ne depend que de `warn`. */
interface WarnLogger {
  warn: (obj: object, msg?: string) => void;
}

import type { Database } from "../../db/client.js";
import { organizations, plans, subscriptions, vehicles } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import type { BillingEvent, BillingGateway } from "../../shared/billing.js";
import { DomainError, notFound } from "../../shared/errors.js";
import type { NotificationsService } from "../notifications/service.js";

/**
 * Abonnement loueur (ADR-0008, ADR-0014). Les quotas sont appliques en base a partir de
 * `organizations.plan_code`, que le trigger `subscriptions_sync_plan` tient a jour.
 * Sans passerelle (aucune cle Stripe), tout reste consultable et rien n'est bloque.
 */
export interface SubscriptionsService {
  listPlans(): Promise<Plan[]>;
  overview(actor: Actor, organizationId: string): Promise<SubscriptionOverview>;
  /** Choix du forfait (ADR-0022) : paiement Stripe si configure, sinon choix enregistre avec l'essai. */
  choosePlan(
    actor: Actor,
    organizationId: string,
    planCode: string,
    email: string | null,
    requestId: string,
  ): Promise<{ checkoutUrl: string | null; planChosenAt: string | null }>;
  checkout(
    actor: Actor,
    organizationId: string,
    planCode: string,
    email: string | null,
    requestId: string,
  ): Promise<{ url: string }>;
  portal(actor: Actor, organizationId: string, requestId: string): Promise<{ url: string }>;
  handleEvent(event: BillingEvent): Promise<void>;
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

const STRIPE_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
  "paused",
]);

export function createSubscriptionsService(
  db: Database,
  billing: BillingGateway | null,
  notify: NotificationsService,
  deepLinkScheme: string,
  logger?: WarnLogger,
): SubscriptionsService {
  async function activePlans() {
    const rows = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.sortOrder), asc(plans.monthlyPriceCents));
    return rows.map(planDto);
  }

  function requireBilling(): BillingGateway {
    if (!billing)
      throw new DomainError(
        "unavailable",
        "Le paiement en ligne arrive bientot. Votre essai et votre offre actuelle restent valables.",
      );
    return billing;
  }

  async function loadOrg(actor: Actor, organizationId: string) {
    assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
    assertCan(actor, "organization.write", { organizationId });
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org) throw notFound("Organisation");
    return org;
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
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .limit(1);
      const trialEndsAt = org.trialEndsAt ?? null;
      let status: SubscriptionOverview["status"];
      if (sub && sub.stripeSubscriptionId) {
        status =
          sub.status === "active"
            ? "active"
            : sub.status === "trialing"
              ? "trialing"
              : sub.status === "past_due" || sub.status === "unpaid"
                ? "past_due"
                : sub.status === "canceled"
                  ? "canceled"
                  : "active";
      } else {
        status = trialEndsAt
          ? trialEndsAt.getTime() > Date.now()
            ? "trialing"
            : "trial_expired"
          : "active";
      }
      return {
        plan: planDto(planRow),
        publishedCount: countRow?.n ?? 0,
        status,
        trialEndsAt: (sub?.trialEndsAt ?? trialEndsAt)?.toISOString() ?? null,
        currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
        billingEnabled: billing !== null,
        hasBillingAccount: !!sub?.stripeCustomerId,
        plans: await activePlans(),
      };
    },

    async choosePlan(actor, organizationId, planCode, email, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.write", { organizationId });
      const [planRow] = await db.select().from(plans).where(eq(plans.code, planCode)).limit(1);
      if (!planRow || !planRow.isActive) throw notFound("Offre");
      if (planRow.isQuote)
        throw new DomainError(
          "validation_failed",
          "Cette offre se fait sur devis : contactez-nous.",
        );
      if (billing) {
        const { url } = await this.checkout(actor, organizationId, planCode, email, requestId);
        return { checkoutUrl: url, planChosenAt: null };
      }
      const now = new Date();
      await db
        .update(organizations)
        .set({
          planCode,
          planChosenAt: now,
        })
        .where(eq(organizations.id, organizationId));
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "subscription.plan_chosen",
        subjectType: "organization",
        subjectId: organizationId,
        organizationId,
        metadata: { planCode, billing: false },
        requestId,
      });
      return { checkoutUrl: null, planChosenAt: now.toISOString() };
    },

    /** Session de paiement Stripe : cree le client et le prix a la volee si besoin. */
    async checkout(actor, organizationId, planCode, email, requestId) {
      const gateway = requireBilling();
      const org = await loadOrg(actor, organizationId);
      const [plan] = await db
        .select()
        .from(plans)
        .where(and(eq(plans.code, planCode), eq(plans.isActive, true)))
        .limit(1);
      if (!plan) throw notFound("Offre");
      if (plan.isQuote)
        throw new DomainError("conflict", "Cette offre se souscrit sur devis : contactez-nous.");
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .limit(1);
      const customerId = await gateway.ensureCustomer({
        existingId: existing?.stripeCustomerId ?? null,
        email: org.billingEmail ?? email,
        name: org.legalName ?? org.name,
        organizationId,
      });
      const priceId = await gateway.ensurePrice({
        code: plan.code,
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        currency: plan.currency,
        existingPriceId: plan.stripePriceId,
      });
      if (priceId !== plan.stripePriceId)
        await db.update(plans).set({ stripePriceId: priceId }).where(eq(plans.code, plan.code));
      if (!existing) {
        await db.insert(subscriptions).values({
          organizationId,
          stripeCustomerId: customerId,
          planCode: org.planCode,
          status: "incomplete",
          trialEndsAt: org.trialEndsAt,
        });
      } else if (existing.stripeCustomerId !== customerId) {
        await db
          .update(subscriptions)
          .set({ stripeCustomerId: customerId })
          .where(eq(subscriptions.id, existing.id));
      }
      const base = `${deepLinkScheme}://organizations/${organizationId}/subscription`;
      const session = await gateway.createCheckoutSession({
        customerId,
        priceId,
        organizationId,
        planCode: plan.code,
        trialEndsAt: org.trialEndsAt,
        successUrl: `${base}?checkout=success`,
        cancelUrl: `${base}?checkout=cancel`,
      });
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "subscription.checkout",
        subjectType: "organization",
        subjectId: organizationId,
        organizationId,
        metadata: { planCode },
        requestId,
      });
      return session;
    },

    async portal(actor, organizationId, requestId) {
      const gateway = requireBilling();
      await loadOrg(actor, organizationId);
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .limit(1);
      if (!sub?.stripeCustomerId)
        throw new DomainError("conflict", "Aucun abonnement en ligne pour cette organisation.");
      const session = await gateway.createPortalSession({
        customerId: sub.stripeCustomerId,
        returnUrl: `${deepLinkScheme}://organizations/${organizationId}/subscription`,
      });
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "subscription.portal",
        subjectType: "organization",
        subjectId: organizationId,
        organizationId,
        requestId,
      });
      return session;
    },

    /**
     * Webhook Stripe : on ne fait confiance qu'a l'evenement (signature verifiee en amont).
     * L'abonnement est reflete en base ; le trigger met a jour le plan de l'organisation.
     */
    async handleEvent(event) {
      const obj = event.data.object;
      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const metadata = (obj["metadata"] ?? {}) as Record<string, string>;
        const customerId = typeof obj["customer"] === "string" ? obj["customer"] : null;
        const items = obj["items"] as { data?: { price?: { id?: string } }[] } | undefined;
        const priceId = items?.data?.[0]?.price?.id ?? null;
        let organizationId = metadata["organizationId"] ?? null;
        if (!organizationId && customerId) {
          const [row] = await db
            .select({ organizationId: subscriptions.organizationId })
            .from(subscriptions)
            .where(eq(subscriptions.stripeCustomerId, customerId))
            .limit(1);
          organizationId = row?.organizationId ?? null;
        }
        if (!organizationId) {
          logger?.warn({ eventId: event.id }, "stripe: abonnement sans organisation");
          return;
        }
        let planCode = metadata["planCode"] ?? null;
        if (priceId) {
          const [planRow] = await db
            .select({ code: plans.code })
            .from(plans)
            .where(eq(plans.stripePriceId, priceId))
            .limit(1);
          planCode = planRow?.code ?? planCode;
        }
        const rawStatus = typeof obj["status"] === "string" ? obj["status"] : "active";
        const status = (
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : STRIPE_STATUSES.has(rawStatus)
              ? rawStatus
              : "active"
        ) as typeof subscriptions.$inferInsert.status;
        const periodEnd =
          typeof obj["current_period_end"] === "number"
            ? new Date(obj["current_period_end"] * 1000)
            : null;
        const trialEnd =
          typeof obj["trial_end"] === "number" ? new Date(obj["trial_end"] * 1000) : null;
        const values = {
          organizationId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: typeof obj["id"] === "string" ? obj["id"] : "",
          stripePriceId: priceId,
          planCode: planCode ?? "starter",
          status,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: obj["cancel_at_period_end"] === true,
          trialEndsAt: trialEnd,
        };
        const [existing] = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.organizationId, organizationId))
          .limit(1);
        if (existing)
          await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
        else await db.insert(subscriptions).values(values);
        // Un abonnement Stripe cree ou mis a jour vaut choix du forfait (ADR-0022).
        await db
          .update(organizations)
          .set({ planChosenAt: sql`coalesce(${organizations.planChosenAt}, now())` })
          .where(eq(organizations.id, organizationId));
        if (status === "past_due" || status === "unpaid")
          void notify.notifyOrganization(organizationId, {
            kind: "subscription.past_due",
            title: "Paiement en echec",
            body: "Mettez a jour votre moyen de paiement pour conserver vos vehicules publies.",
            data: { organizationId },
          });
        return;
      }
      if (event.type === "invoice.payment_failed") {
        const customerId = typeof obj["customer"] === "string" ? obj["customer"] : null;
        if (!customerId) return;
        const [row] = await db
          .select({ organizationId: subscriptions.organizationId })
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);
        if (row)
          void notify.notifyOrganization(row.organizationId, {
            kind: "subscription.past_due",
            title: "Paiement en echec",
            body: "Votre derniere facture n'a pas pu etre reglee. Verifiez votre carte.",
            data: { organizationId: row.organizationId },
          });
      }
    },
  };
}
