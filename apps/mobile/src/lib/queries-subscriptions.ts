import { useQuery } from "@tanstack/react-query";
import { PlansResponseSchema, SubscriptionOverviewSchema } from "@lv/contracts";

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
