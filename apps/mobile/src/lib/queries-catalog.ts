import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  AgenciesResponseSchema,
  AgencySchema,
  DocumentSchema,
  DocumentsResponseSchema,
  PublishCheckSchema,
  RatePlanSchema,
  SignedUploadSchema,
  VehiclePhotoSchema,
  VehicleSchema,
  VehiclesResponseSchema,
  VerificationQueueSchema,
  VerificationStatusSchema,
  type AgencyInput,
  type AgencyUpdate,
  type RatePlanInput,
  type VehicleInput,
  type VehicleUpdate,
} from "@lv/contracts";

import { apiRequest } from "./api";

const Empty = z.null();

export const catalogKeys = {
  agencies: (orgId: string) => ["organizations", orgId, "agencies"] as const,
  vehicles: (orgId: string) => ["organizations", orgId, "vehicles"] as const,
  vehicle: (id: string) => ["vehicles", id] as const,
  publishCheck: (id: string) => ["vehicles", id, "publish-check"] as const,
  documents: (orgId: string) => ["organizations", orgId, "documents"] as const,
  verification: (orgId: string) => ["organizations", orgId, "verification"] as const,
  adminQueue: ["admin", "verifications"] as const,
};

// Agences
export function useAgencies(orgId: string) {
  return useQuery({
    queryKey: catalogKeys.agencies(orgId),
    queryFn: () => apiRequest(`/v1/organizations/${orgId}/agencies`, AgenciesResponseSchema),
  });
}
export function useCreateAgency(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AgencyInput) =>
      apiRequest(`/v1/organizations/${orgId}/agencies`, AgencySchema, { method: "POST", body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: catalogKeys.agencies(orgId) });
      void client.invalidateQueries({ queryKey: catalogKeys.verification(orgId) });
    },
  });
}
export function useUpdateAgency(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ agencyId, body }: { agencyId: string; body: AgencyUpdate }) =>
      apiRequest(`/v1/agencies/${agencyId}`, AgencySchema, { method: "PATCH", body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: catalogKeys.agencies(orgId) });
      void client.invalidateQueries({ queryKey: catalogKeys.verification(orgId) });
    },
  });
}
export function useSetAgencyPublished(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ agencyId, published }: { agencyId: string; published: boolean }) =>
      apiRequest(`/v1/agencies/${agencyId}/${published ? "publish" : "unpublish"}`, AgencySchema, {
        method: "POST",
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.agencies(orgId) }),
  });
}

// Vehicules
export function useVehicles(orgId: string) {
  return useQuery({
    queryKey: catalogKeys.vehicles(orgId),
    queryFn: () => apiRequest(`/v1/organizations/${orgId}/vehicles`, VehiclesResponseSchema),
  });
}
export function useVehicle(vehicleId: string) {
  return useQuery({
    queryKey: catalogKeys.vehicle(vehicleId),
    queryFn: () => apiRequest(`/v1/vehicles/${vehicleId}`, VehicleSchema),
  });
}
export function usePublishCheck(vehicleId: string) {
  return useQuery({
    queryKey: catalogKeys.publishCheck(vehicleId),
    queryFn: () => apiRequest(`/v1/vehicles/${vehicleId}/publish-check`, PublishCheckSchema),
  });
}
function invalidateVehicle(
  client: ReturnType<typeof useQueryClient>,
  orgId: string,
  vehicleId?: string,
) {
  void client.invalidateQueries({ queryKey: catalogKeys.vehicles(orgId) });
  if (vehicleId) {
    void client.invalidateQueries({ queryKey: catalogKeys.vehicle(vehicleId) });
    void client.invalidateQueries({ queryKey: catalogKeys.publishCheck(vehicleId) });
  }
}
export function useCreateVehicle(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleInput) =>
      apiRequest(`/v1/organizations/${orgId}/vehicles`, VehicleSchema, { method: "POST", body }),
    onSuccess: () => invalidateVehicle(client, orgId),
  });
}
export function useUpdateVehicle(orgId: string, vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleUpdate) =>
      apiRequest(`/v1/vehicles/${vehicleId}`, VehicleSchema, { method: "PATCH", body }),
    onSuccess: () => invalidateVehicle(client, orgId, vehicleId),
  });
}
export function useArchiveVehicle(orgId: string, vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest(`/v1/vehicles/${vehicleId}`, Empty, { method: "DELETE" }),
    onSuccess: () => invalidateVehicle(client, orgId, vehicleId),
  });
}
export function useSetRatePlan(orgId: string, vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RatePlanInput) =>
      apiRequest(`/v1/vehicles/${vehicleId}/rate-plan`, RatePlanSchema, { method: "PUT", body }),
    onSuccess: () => invalidateVehicle(client, orgId, vehicleId),
  });
}
export function useSetVehiclePublished(orgId: string, vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (published: boolean) =>
      apiRequest(
        `/v1/vehicles/${vehicleId}/${published ? "publish" : "unpublish"}`,
        VehicleSchema,
        { method: "POST" },
      ),
    onSuccess: () => invalidateVehicle(client, orgId, vehicleId),
  });
}
export function usePhotoUploadUrl(vehicleId: string) {
  return useMutation({
    mutationFn: (body: {
      mimeType: "image/jpeg" | "image/png" | "image/webp";
      sizeBytes: number;
    }) =>
      apiRequest(`/v1/vehicles/${vehicleId}/photos/upload-url`, SignedUploadSchema, {
        method: "POST",
        body,
      }),
  });
}
export function useConfirmPhoto(orgId: string, vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { path: string; width?: number; height?: number }) =>
      apiRequest(`/v1/vehicles/${vehicleId}/photos`, VehiclePhotoSchema, { method: "POST", body }),
    onSuccess: () => invalidateVehicle(client, orgId, vehicleId),
  });
}
export function useReorderPhotos(orgId: string, vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: string[]) =>
      apiRequest(
        `/v1/vehicles/${vehicleId}/photos/order`,
        z.object({ photos: z.array(VehiclePhotoSchema) }),
        { method: "PUT", body: { photoIds } },
      ),
    onSuccess: () => invalidateVehicle(client, orgId, vehicleId),
  });
}
export function useDeletePhoto(orgId: string, vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) =>
      apiRequest(`/v1/vehicles/${vehicleId}/photos/${photoId}`, Empty, { method: "DELETE" }),
    onSuccess: () => invalidateVehicle(client, orgId, vehicleId),
  });
}

// Documents et verification
export function useDocuments(orgId: string, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.documents(orgId),
    queryFn: () => apiRequest(`/v1/organizations/${orgId}/documents`, DocumentsResponseSchema),
    enabled,
  });
}
export function useVerification(orgId: string) {
  return useQuery({
    queryKey: catalogKeys.verification(orgId),
    queryFn: () => apiRequest(`/v1/organizations/${orgId}/verification`, VerificationStatusSchema),
  });
}
export function useDocumentUploadUrl(orgId: string) {
  return useMutation({
    mutationFn: (body: {
      kind: "kbis" | "insurance" | "id_card" | "driving_license" | "vehicle_registration" | "other";
      mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
      sizeBytes: number;
    }) =>
      apiRequest(`/v1/organizations/${orgId}/documents/upload-url`, SignedUploadSchema, {
        method: "POST",
        body,
      }),
  });
}
export function useConfirmDocument(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      path: string;
      kind: "kbis" | "insurance" | "id_card" | "driving_license" | "vehicle_registration" | "other";
      expiresAt?: string;
    }) =>
      apiRequest(`/v1/organizations/${orgId}/documents`, DocumentSchema, { method: "POST", body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: catalogKeys.documents(orgId) });
      void client.invalidateQueries({ queryKey: catalogKeys.verification(orgId) });
    },
  });
}
export function useDeleteDocument(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiRequest(`/v1/documents/${documentId}`, Empty, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: catalogKeys.documents(orgId) });
      void client.invalidateQueries({ queryKey: catalogKeys.verification(orgId) });
    },
  });
}
export function useDocumentReadUrl() {
  return useMutation({
    mutationFn: (documentId: string) =>
      apiRequest(
        `/v1/documents/${documentId}/url`,
        z.object({ url: z.string(), expiresAt: z.string() }),
      ),
  });
}
export function useSubmitVerification(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest(`/v1/organizations/${orgId}/verification/submit`, Empty, { method: "POST" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: catalogKeys.verification(orgId) });
      void client.invalidateQueries({ queryKey: ["organizations", orgId] });
    },
  });
}

// Administration
export function useAdminQueue(enabled: boolean) {
  return useQuery({
    queryKey: catalogKeys.adminQueue,
    queryFn: () => apiRequest("/v1/admin/verifications", VerificationQueueSchema),
    enabled,
  });
}
export function useAdminDecide() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      decision,
      reason,
      notes,
    }: {
      organizationId: string;
      decision: "verified" | "rejected";
      reason?: string;
      notes?: string;
    }) =>
      apiRequest(`/v1/admin/verifications/${organizationId}/decision`, Empty, {
        method: "POST",
        body: { decision, ...(reason ? { reason } : {}), ...(notes ? { notes } : {}) },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogKeys.adminQueue }),
  });
}
