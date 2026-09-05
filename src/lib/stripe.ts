import Stripe from "stripe";

import { serverEnv } from "@/lib/env";
import type { PlanTier } from "@/types/database";

let cached: Stripe | null = null;

/** Instance Stripe cote serveur. Renvoie null si la cle n'est pas configuree. */
export function getStripe(): Stripe | null {
  if (!serverEnv.stripeSecretKey) return null;
  cached ??= new Stripe(serverEnv.stripeSecretKey, { typescript: true });
  return cached;
}

/** Identifiant de prix Stripe associe a un palier. */
export function priceIdForPlan(plan: PlanTier): string | null {
  if (plan === "starter") return serverEnv.stripePriceStarter || null;
  if (plan === "pro") return serverEnv.stripePricePro || null;
  return null;
}

/** Palier correspondant a un identifiant de prix Stripe. */
export function planForPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return "free";
  if (priceId === serverEnv.stripePriceStarter) return "starter";
  if (priceId === serverEnv.stripePricePro) return "pro";
  return "free";
}
