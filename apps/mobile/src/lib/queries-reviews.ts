import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReviewSchema, ReviewsResponseSchema, type CreateReviewBody } from "@lv/contracts";

import { apiRequest } from "./api";
import { bookingKeys } from "./queries-bookings";

export const reviewKeys = {
  loueur: (orgId: string) => ["reviews", "loueur", orgId] as const,
};

export function useLoueurReviews(orgId: string, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.loueur(orgId),
    queryFn: () => apiRequest(`/v1/loueurs/${orgId}/reviews`, ReviewsResponseSchema),
    enabled,
  });
}
export function useCreateReview(bookingId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReviewBody) =>
      apiRequest(`/v1/bookings/${bookingId}/review`, ReviewSchema, { method: "POST", body }),
    onSuccess: (r) => {
      void client.invalidateQueries({ queryKey: bookingKeys.one(bookingId) });
      void client.invalidateQueries({ queryKey: reviewKeys.loueur(r.organizationId) });
      void client.invalidateQueries({ queryKey: ["loueurs"] });
    },
  });
}
export function useReplyReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      apiRequest(`/v1/reviews/${reviewId}/reply`, ReviewSchema, {
        method: "POST",
        body: { reply },
      }),
    onSuccess: (r) => {
      void client.invalidateQueries({ queryKey: reviewKeys.loueur(r.organizationId) });
    },
  });
}
