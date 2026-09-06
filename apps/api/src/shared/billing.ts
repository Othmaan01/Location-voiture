import Stripe from "stripe";

/**
 * Passerelle de facturation (ADR-0014). L'API ne connait que cette interface :
 * Stripe en production, un double en test, `null` quand aucune cle n'est configuree.
 * Le client ne voit jamais de cle ; le webhook est verifie par signature.
 */
export interface BillingEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export interface BillingGateway {
  ensureCustomer(input: {
    existingId: string | null;
    email: string | null;
    name: string;
    organizationId: string;
  }): Promise<string>;
  /** Cree le produit et le prix cote Stripe si le plan n'en a pas encore. */
  ensurePrice(plan: {
    code: string;
    name: string;
    monthlyPriceCents: number;
    currency: string;
    existingPriceId: string | null;
  }): Promise<string>;
  createCheckoutSession(input: {
    customerId: string;
    priceId: string;
    organizationId: string;
    planCode: string;
    trialEndsAt: Date | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  /** Verifie la signature et renvoie l'evenement ; jette si invalide. */
  constructEvent(rawBody: Buffer, signature: string): BillingEvent;
}

export function createStripeGateway(
  secretKey: string,
  webhookSecret: string | undefined,
): BillingGateway {
  const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });
  return {
    async ensureCustomer({ existingId, email, name, organizationId }) {
      if (existingId) return existingId;
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        name,
        metadata: { organizationId },
      });
      return customer.id;
    },
    async ensurePrice(plan) {
      if (plan.existingPriceId) return plan.existingPriceId;
      const product = await stripe.products.create({
        name: `Abonnement ${plan.name}`,
        metadata: { planCode: plan.code },
      });
      const price = await stripe.prices.create({
        product: product.id,
        currency: plan.currency.toLowerCase(),
        unit_amount: plan.monthlyPriceCents,
        recurring: { interval: "month" },
        metadata: { planCode: plan.code },
      });
      return price.id;
    },
    async createCheckoutSession(input) {
      const trialEnd =
        input.trialEndsAt && input.trialEndsAt.getTime() > Date.now() + 2 * 86_400_000
          ? Math.floor(input.trialEndsAt.getTime() / 1000)
          : undefined;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: input.customerId,
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        locale: "fr",
        allow_promotion_codes: true,
        subscription_data: {
          metadata: { organizationId: input.organizationId, planCode: input.planCode },
          ...(trialEnd ? { trial_end: trialEnd } : {}),
        },
        metadata: { organizationId: input.organizationId, planCode: input.planCode },
      });
      if (!session.url) throw new Error("stripe: session sans url");
      return { url: session.url };
    },
    async createPortalSession({ customerId, returnUrl }) {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        locale: "fr",
      });
      return { url: session.url };
    },
    constructEvent(rawBody, signature) {
      if (!webhookSecret) throw new Error("stripe: STRIPE_WEBHOOK_SECRET manquant");
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      return {
        id: event.id,
        type: event.type,
        data: { object: event.data.object as unknown as Record<string, unknown> },
      };
    },
  };
}
