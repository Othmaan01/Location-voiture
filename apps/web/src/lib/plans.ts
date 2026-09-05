import type { PlanTier } from "@/types/database";

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  tagline: string;
  /** Prix mensuel TTC en euros. */
  monthlyPrice: number;
  /** Prix annuel TTC en euros (2 mois offerts). */
  yearlyPrice: number;
  /** Nombre de vehicules publiables. `null` = illimite. */
  vehicleLimit: number | null;
  /** Peut mettre des vehicules en avant dans les resultats. */
  featuredListings: boolean;
  highlighted: boolean;
  features: string[];
  limitations?: string[];
  /** Variable d'environnement contenant l'ID de prix Stripe. */
  stripePriceEnv?: "STRIPE_PRICE_STARTER" | "STRIPE_PRICE_PRO";
}

/**
 * Source de verite cote interface.
 * Les memes limites sont appliquees en base par `public.plan_vehicle_limit()`
 * et le trigger `vehicles_enforce_quota` : le front ne peut pas les contourner.
 */
export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Decouverte",
    tagline: "Testez la visibilite sans engagement",
    monthlyPrice: 0,
    yearlyPrice: 0,
    vehicleLimit: 1,
    featuredListings: false,
    highlighted: false,
    features: [
      "Fiche agence publiee et geolocalisee",
      "1 vehicule en ligne",
      "Demandes de contact illimitees",
      "Referencement sur la page de votre ville",
    ],
    limitations: ["Pas de mise en avant", "Pas de statistiques detaillees"],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour une agence de proximite",
    monthlyPrice: 29,
    yearlyPrice: 290,
    vehicleLimit: 5,
    featuredListings: false,
    highlighted: true,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    features: [
      "Tout le palier Decouverte",
      "Jusqu'a 5 vehicules en ligne",
      "Badge agence verifiee",
      "Photos illimitees par vehicule",
      "Statistiques de vues et de demandes",
      "Support par e-mail sous 48 h",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour les flottes et les reseaux",
    monthlyPrice: 79,
    yearlyPrice: 790,
    vehicleLimit: null,
    featuredListings: true,
    highlighted: false,
    stripePriceEnv: "STRIPE_PRICE_PRO",
    features: [
      "Tout le palier Starter",
      "Vehicules illimites",
      "Mise en avant en tete des resultats",
      "Plusieurs points de vente",
      "Export des demandes en CSV",
      "Support prioritaire",
    ],
  },
];

export function getPlan(id: PlanTier): PlanDefinition {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

export function vehicleLimitFor(plan: PlanTier): number | null {
  return getPlan(plan).vehicleLimit;
}

export function canPublishMore(plan: PlanTier, publishedCount: number): boolean {
  const limit = vehicleLimitFor(plan);
  return limit === null || publishedCount < limit;
}

/** Economie annuelle en euros par rapport au paiement mensuel. */
export function yearlySaving(plan: PlanDefinition): number {
  return Math.max(plan.monthlyPrice * 12 - plan.yearlyPrice, 0);
}
