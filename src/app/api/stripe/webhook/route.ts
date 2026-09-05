import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { serverEnv } from "@/lib/env";
import { getStripe, planForPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type { PlanTier, SubscriptionStatus } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Stripe : seule source d'ecriture de la table `subscriptions`.
 * Utilise la cle service_role (contourne RLS) et verifie la signature Stripe.
 *
 * En local : stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !serverEnv.stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe non configure." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, serverEnv.stripeWebhookSecret);
  } catch (error) {
    console.error("[stripe:webhook] signature invalide", error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const supabase = createAdminClient();

  async function upsertSubscription(subscription: Stripe.Subscription, agencyIdHint?: string) {
    const agencyId = (subscription.metadata?.agency_id as string | undefined) ?? agencyIdHint;
    if (!agencyId) {
      console.warn("[stripe:webhook] abonnement sans agency_id", subscription.id);
      return;
    }

    const item = subscription.items.data[0];
    const priceId = item?.price?.id ?? null;
    const plan: PlanTier = planForPriceId(priceId);
    const periodEnd = (item as unknown as { current_period_end?: number } | undefined)
      ?.current_period_end;

    await supabase.from("subscriptions").upsert(
      {
        agency_id: agencyId,
        stripe_customer_id:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        plan,
        status: subscription.status as SubscriptionStatus,
        quantity: item?.quantity ?? 1,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      },
      { onConflict: "agency_id" },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );
        await upsertSubscription(
          subscription,
          (session.metadata?.agency_id as string | undefined) ??
            session.client_reference_id ??
            undefined,
        );
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as unknown as { subscription?: string | { id: string } })
          .subscription;
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(
          typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id,
        );
        await upsertSubscription(subscription);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("[stripe:webhook] traitement en echec", error);
    return NextResponse.json({ error: "Traitement en echec." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
