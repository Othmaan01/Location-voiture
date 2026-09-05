import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  AcceptInvitationResponseSchema,
  CreatedInvitationSchema,
  InvitationsResponseSchema,
  MeResponseSchema,
  OrganizationMembersResponseSchema,
  OrganizationSchema,
  type CreateInvitationBody,
  type CreateOrganizationBody,
  type OrganizationRole,
  type UpdateProfileBody,
} from "@lv/contracts";

import { apiRequest } from "./api";
import { useSession } from "./session";

const Empty = z.null();

export const queryKeys = {
  me: ["me"] as const,
  organization: (id: string) => ["organizations", id] as const,
  members: (id: string) => ["organizations", id, "members"] as const,
  invitations: (id: string) => ["organizations", id, "invitations"] as const,
};

export function useMe() {
  const { session } = useSession();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiRequest("/v1/me", MeResponseSchema),
    enabled: !!session,
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) =>
      apiRequest("/v1/me", MeResponseSchema, { method: "PATCH", body }),
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () =>
      apiRequest("/v1/me", Empty, { method: "DELETE", body: { confirmation: "SUPPRIMER" } }),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: queryKeys.organization(id),
    queryFn: () => apiRequest(`/v1/organizations/${id}`, OrganizationSchema),
  });
}

export function useCreateOrganization() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrganizationBody) =>
      apiRequest("/v1/organizations", OrganizationSchema, { method: "POST", body }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useMembers(id: string) {
  return useQuery({
    queryKey: queryKeys.members(id),
    queryFn: () => apiRequest(`/v1/organizations/${id}/members`, OrganizationMembersResponseSchema),
  });
}

export function useUpdateMemberRole(organizationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrganizationRole }) =>
      apiRequest(`/v1/organizations/${organizationId}/members/${userId}`, Empty, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.members(organizationId) }),
  });
}

export function useRemoveMember(organizationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/v1/organizations/${organizationId}/members/${userId}`, Empty, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.members(organizationId) });
      void client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useInvitations(organizationId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.invitations(organizationId),
    queryFn: () =>
      apiRequest(`/v1/organizations/${organizationId}/invitations`, InvitationsResponseSchema),
    enabled,
  });
}

export function useCreateInvitation(organizationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvitationBody) =>
      apiRequest(`/v1/organizations/${organizationId}/invitations`, CreatedInvitationSchema, {
        method: "POST",
        body,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.invitations(organizationId) }),
  });
}

export function useRevokeInvitation(organizationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiRequest(`/v1/organizations/${organizationId}/invitations/${invitationId}`, Empty, {
        method: "DELETE",
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.invitations(organizationId) }),
  });
}

export function useAcceptInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiRequest("/v1/invitations/accept", AcceptInvitationResponseSchema, {
        method: "POST",
        body: { token },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
