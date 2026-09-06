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
    /** trialing : essai en cours ; trial_expired : essai termine, paiement a venir (Phase 5) ; active : paye. */
    status: z.enum(["trialing", "trial_expired", "active"]),
    trialEndsAt: IsoDateTimeSchema.nullable(),
    plans: z.array(PlanSchema),
  })
  .strict();
export type SubscriptionOverview = z.infer<typeof SubscriptionOverviewSchema>;
