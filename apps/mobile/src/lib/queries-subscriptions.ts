import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BillingUrlSchema,
  ChoosePlanResponseSchema,
  PlansResponseSchema,
  SubscriptionOverviewSchema,
} from "@lv/contracts";

import { apiRequest } from "./api";

export const subscriptionKeys = {
  plans: ["plans"] as const,
  overview: (orgId: string) => ["organizations", orgId, "subscription"] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: () => apiRequest("/v1/plans", PlansResponseSchema),
    staleTime: 10 * 60_000,
  });
}

export function useSubscription(orgId: string) {
  return useQuery({
    queryKey: subscriptionKeys.overview(orgId),
    queryFn: () =>
      apiRequest(`/v1/organizations/${orgId}/subscription`, SubscriptionOverviewSchema),
  });
}

/** Paiement Stripe : le moteur renvoie une URL a ouvrir dans le navigateur ; le retour se fait par lien profond. */
export function useCheckout(orgId: string) {
  return useMutation({
    mutationFn: (planCode: string) =>
      apiRequest(`/v1/organizations/${orgId}/subscription/checkout`, BillingUrlSchema, {
        method: "POST",
        body: { planCode },
      }),
  });
}
export function useBillingPortal(orgId: string) {
  return useMutation({
    mutationFn: () =>
      apiRequest(`/v1/organizations/${orgId}/subscription/portal`, BillingUrlSchema, {
        method: "POST",
      }),
  });
}
/** Choix du forfait (ADR-0022) : paiement Stripe si configure, sinon enregistre avec l'essai. */
export function useChoosePlan(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planCode: string) =>
      apiRequest(`/v1/organizations/${orgId}/subscription/plan`, ChoosePlanResponseSchema, {
        method: "POST",
        body: { planCode },
      }),
    // Le garde-fou des forfaits lit `planChosenAt` sur l'organisation : on le met a jour tout de
    // suite dans le cache, puis on attend la relecture avant de laisser l'ecran naviguer
    // (sinon il renvoyait vers les forfaits et il fallait valider deux fois).
    onSuccess: async () => {
      client.setQueriesData(
        { queryKey: ["organizations", orgId], exact: true },
        (prev: { planChosenAt?: string | null } | undefined) =>
          prev && prev.planChosenAt === null
            ? { ...prev, planChosenAt: new Date().toISOString() }
            : prev,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["organizations", orgId] }),
        client.invalidateQueries({ queryKey: ["me"] }),
      ]);
    },
  });
}

export function useRefreshSubscription(orgId: string) {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: subscriptionKeys.overview(orgId) });
}
