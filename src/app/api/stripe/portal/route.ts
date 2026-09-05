import { NextResponse } from "next/server";

import { requirePro } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/types/database";

/** Ouvre le portail de facturation Stripe (changement de palier, resiliation, factures). */
export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe n'est pas configure." }, { status: 503 });
  }

  const { agency } = await requirePro();
  if (!agency) {
    return NextResponse.json({ error: "Aucune agence." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("agency_id", agency.id)
    .maybeSingle();

  const customerId = (data as Pick<Subscription, "stripe_customer_id"> | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "Aucun abonnement actif." }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${publicEnv.siteUrl}/dashboard/abonnement`,
  });

  return NextResponse.json({ url: portal.url });
}
