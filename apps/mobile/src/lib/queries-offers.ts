import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  OfferSchema,
  OffersResponseSchema,
  type OfferInput,
  type PublicOffer,
} from "@lv/contracts";

import { apiRequest } from "./api";
import { formatEuros } from "@/features/pro/labels";

const Empty = z.null();

export const offerKeys = {
  org: (orgId: string) => ["organizations", orgId, "offers"] as const,
};

export function useOffers(orgId: string) {
  return useQuery({
    queryKey: offerKeys.org(orgId),
    queryFn: () => apiRequest(`/v1/organizations/${orgId}/offers`, OffersResponseSchema),
  });
}
export function useCreateOffer(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: OfferInput) =>
      apiRequest(`/v1/organizations/${orgId}/offers`, OfferSchema, { method: "POST", body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: offerKeys.org(orgId) });
      void client.invalidateQueries({ queryKey: ["loueurs"] });
      void client.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
export function useArchiveOffer(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) =>
      apiRequest(`/v1/offers/${offerId}`, Empty, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: offerKeys.org(orgId) });
      void client.invalidateQueries({ queryKey: ["loueurs"] });
      void client.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/** "-20 %" ou "-15 €" : le meme libelle partout. */
export function formatOffer(offer: Pick<PublicOffer, "discountType" | "discountValue">): string {
  return offer.discountType === "percent"
    ? `-${offer.discountValue} %`
    : `-${formatEuros(offer.discountValue)}`;
}
