import { NextResponse, type NextRequest } from "next/server";

import { requirePro } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { getStripe, priceIdForPlan } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import type { PlanTier, Subscription } from "@/types/database";

/**
 * Cree une session Stripe Checkout pour l'abonnement du pro.
 * L'identifiant de l'agence est place dans les metadonnees : le webhook
 * s'en sert pour rattacher l'abonnement a la bonne agence.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe n'est pas configure sur cet environnement." },
      { status: 503 },
    );
  }

  const { session, agency } = await requirePro();
  if (!agency) {
    return NextResponse.json({ error: "Creez d'abord votre agence." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: PlanTier };
  const plan = body.plan;
  if (plan !== "starter" && plan !== "pro") {
    return NextResponse.json({ error: "Palier invalide." }, { status: 400 });
  }

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Aucun prix Stripe configure pour le palier ${plan}.` },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("agency_id", agency.id)
    .maybeSingle();

  const existingCustomer = (data as Pick<Subscription, "stripe_customer_id"> | null)
    ?.stripe_customer_id;

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(existingCustomer
      ? { customer: existingCustomer }
      : { customer_email: session.email ?? undefined }),
    client_reference_id: agency.id,
    subscription_data: {
      metadata: { agency_id: agency.id, plan },
    },
    metadata: { agency_id: agency.id, plan },
    allow_promotion_codes: true,
    success_url: `${publicEnv.siteUrl}/dashboard/abonnement?statut=succes`,
    cancel_url: `${publicEnv.siteUrl}/dashboard/abonnement?statut=annule`,
  });

  return NextResponse.json({ url: checkout.url });
}
