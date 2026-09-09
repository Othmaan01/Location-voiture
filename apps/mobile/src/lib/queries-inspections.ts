import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InspectionSchema, InspectionsResponseSchema, type InspectionInput } from "@lv/contracts";

import { apiRequest } from "./api";

export const inspectionKeys = {
  booking: (bookingId: string) => ["bookings", bookingId, "inspections"] as const,
};

/** Etats des lieux d'une reservation (ADR-0018) : PDF signes, liens de lecture d'une heure. */
export function useInspections(bookingId: string) {
  return useQuery({
    queryKey: inspectionKeys.booking(bookingId),
    queryFn: () => apiRequest(`/v1/bookings/${bookingId}/inspections`, InspectionsResponseSchema),
    staleTime: 30_000,
  });
}

export function useCreateInspection(bookingId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: InspectionInput) =>
      apiRequest(`/v1/bookings/${bookingId}/inspections`, InspectionSchema, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: inspectionKeys.booking(bookingId) });
    },
  });
}
