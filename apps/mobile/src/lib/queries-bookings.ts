import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  AvailabilityBlockSchema,
  BookingSchema,
  BookingsResponseSchema,
  QuoteSchema,
  type BookingStatus,
  type QuoteRequest,
} from "@lv/contracts";

import { apiRequest } from "./api";
import { useSession } from "./session";

const Empty = z.null();

export const bookingKeys = {
  mine: (scope: string) => ["bookings", "mine", scope] as const,
  org: (orgId: string, scope: string, status?: string) =>
    ["bookings", "org", orgId, scope, status ?? "all"] as const,
  one: (id: string) => ["bookings", id] as const,
  blocks: (vehicleId: string) => ["vehicles", vehicleId, "blocks"] as const,
};

export function useCreateQuote() {
  return useMutation({
    mutationFn: (body: QuoteRequest) =>
      apiRequest("/v1/quotes", QuoteSchema, { method: "POST", body }),
  });
}

export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      quoteId,
      message,
      idempotencyKey,
    }: {
      quoteId: string;
      message?: string;
      idempotencyKey: string;
    }) =>
      apiRequest("/v1/bookings", BookingSchema, {
        method: "POST",
        body: { quoteId, ...(message ? { message } : {}) },
        idempotencyKey,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useMyBookings(scope: "upcoming" | "past") {
  const { session } = useSession();
  return useQuery({
    queryKey: bookingKeys.mine(scope),
    queryFn: () => apiRequest(`/v1/me/bookings?scope=${scope}`, BookingsResponseSchema),
    enabled: !!session,
    refetchInterval: 60_000,
  });
}

export function useOrgBookings(
  orgId: string,
  scope: "upcoming" | "past" | "all",
  status?: BookingStatus,
) {
  return useQuery({
    queryKey: bookingKeys.org(orgId, scope, status),
    queryFn: () =>
      apiRequest(
        `/v1/organizations/${orgId}/bookings?scope=${scope}${status ? `&status=${status}` : ""}`,
        BookingsResponseSchema,
      ),
    refetchInterval: 60_000,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.one(id),
    queryFn: () => apiRequest(`/v1/bookings/${id}`, BookingSchema),
    refetchInterval: 60_000,
  });
}

type Action = "confirm" | "decline" | "cancel" | "start" | "complete" | "no-show";
export function useBookingAction(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ action, reason }: { action: Action; reason?: string }) =>
      apiRequest(`/v1/bookings/${id}/${action}`, BookingSchema, {
        method: "POST",
        body: reason ? { reason } : {},
      }),
    onSuccess: (booking) => {
      client.setQueryData(bookingKeys.one(id), booking);
      void client.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useBlocks(vehicleId: string) {
  return useQuery({
    queryKey: bookingKeys.blocks(vehicleId),
    queryFn: () =>
      apiRequest(
        `/v1/vehicles/${vehicleId}/blocks`,
        z.object({ blocks: z.array(AvailabilityBlockSchema) }),
      ),
  });
}
export function useCreateBlock(vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      from: string;
      to: string;
      reason: "maintenance" | "external_rental" | "other";
      note?: string;
    }) =>
      apiRequest(`/v1/vehicles/${vehicleId}/blocks`, AvailabilityBlockSchema, {
        method: "POST",
        body,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: bookingKeys.blocks(vehicleId) }),
  });
}
export function useDeleteBlock(vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) =>
      apiRequest(`/v1/blocks/${blockId}`, Empty, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: bookingKeys.blocks(vehicleId) }),
  });
}
