import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CustomerReviewSchema,
  CustomerReviewsResponseSchema,
  MeResponseSchema,
  SignedUploadSchema,
  type CustomerReviewInput,
} from "@lv/contracts";

import { apiRequest } from "./api";
import { queryKeys } from "./queries";
import { bookingKeys } from "./queries-bookings";

/** Evaluations recues par le client connecte (ADR-0020). */
export function useMyReviews(enabled: boolean) {
  return useQuery({
    queryKey: ["me", "reviews"] as const,
    queryFn: () => apiRequest("/v1/me/reviews", CustomerReviewsResponseSchema),
    enabled,
    staleTime: 60_000,
  });
}

/** Le loueur note le client d'une location terminee, une seule fois. */
export function useReviewCustomer(bookingId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerReviewInput) =>
      apiRequest(`/v1/bookings/${bookingId}/customer-review`, CustomerReviewSchema, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: bookingKeys.one(bookingId) });
      void client.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useAvatarUploadUrl() {
  return useMutation({
    mutationFn: (body: {
      mimeType: "image/jpeg" | "image/png" | "image/webp";
      sizeBytes: number;
    }) => apiRequest("/v1/me/avatar/upload-url", SignedUploadSchema, { method: "POST", body }),
  });
}
export function useConfirmAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { path: string }) =>
      apiRequest("/v1/me/avatar", MeResponseSchema, { method: "POST", body }),
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
  });
}
