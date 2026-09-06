import { z } from "zod";

import { CurrencySchema } from "../money.js";
import { IsoDateTimeSchema } from "./common.js";

/**
 * Grille d'abonnement (ADR-0008, D10) : paliers indexes sur le nombre de vehicules publies.
 * Affichee avant le paiement (Phase 5) ; les quotas sont deja appliques en base.
 */
export const PlanSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    minVehicles: z.number().int(),
    /** null = illimite (sur devis). */
    maxVehicles: z.number().int().nullable(),
    monthlyPriceCents: z.number().int(),
    currency: CurrencySchema,
    /** Tarif sur devis : pas de prix affiche. */
    isQuote: z.boolean(),
  })
  .strict();
export type Plan = z.infer<typeof PlanSchema>;
export const PlansResponseSchema = z.object({ plans: z.array(PlanSchema) }).strict();

export const SubscriptionOverviewSchema = z
  .object({
    plan: PlanSchema,
    publishedCount: z.number().int(),
    /**
     * trialing : essai en cours ; trial_expired : essai termine sans abonnement ; active : abonnement paye ;
     * past_due : paiement en echec ; canceled : resilie.
     */
    status: z.enum(["trialing", "trial_expired", "active", "past_due", "canceled"]),
    trialEndsAt: IsoDateTimeSchema.nullable(),
    /** Fin de la periode payee en cours (abonnement Stripe). */
    currentPeriodEnd: IsoDateTimeSchema.nullable(),
    cancelAtPeriodEnd: z.boolean(),
    /** Paiement en ligne disponible (Stripe configure) et abonnement existant (portail). */
    billingEnabled: z.boolean(),
    hasBillingAccount: z.boolean(),
    plans: z.array(PlanSchema),
  })
  .strict();

export const CheckoutBodySchema = z.object({ planCode: z.string().min(1).max(40) }).strict();
export const BillingUrlSchema = z.object({ url: z.url() }).strict();
export type SubscriptionOverview = z.infer<typeof SubscriptionOverviewSchema>;
