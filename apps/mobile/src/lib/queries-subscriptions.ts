import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BillingUrlSchema, PlansResponseSchema, SubscriptionOverviewSchema } from "@lv/contracts";

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
export function useRefreshSubscription(orgId: string) {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: subscriptionKeys.overview(orgId) });
}
