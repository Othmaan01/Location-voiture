import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ConversationDetailSchema,
  ConversationsResponseSchema,
  MessageSchema,
  UnreadSummarySchema,
  type StartConversationBody,
} from "@lv/contracts";

import { apiRequest } from "./api";
import { useSession } from "./session";

const Empty = z.null();

export const messagingKeys = {
  mine: ["conversations", "mine"] as const,
  org: (orgId: string) => ["conversations", "org", orgId] as const,
  one: (id: string) => ["conversations", id] as const,
  unread: ["conversations", "unread"] as const,
};

/** Rafraichissement leger : le fil ouvert se met a jour toutes les 5 s (pas de temps reel natif en v1). */
const THREAD_POLL_MS = 5_000;

export function useConversations() {
  const { session } = useSession();
  return useQuery({
    queryKey: messagingKeys.mine,
    queryFn: () => apiRequest("/v1/me/conversations", ConversationsResponseSchema),
    enabled: !!session,
    refetchInterval: 15_000,
  });
}
export function useOrgConversations(orgId: string) {
  return useQuery({
    queryKey: messagingKeys.org(orgId),
    queryFn: () =>
      apiRequest(`/v1/organizations/${orgId}/conversations`, ConversationsResponseSchema),
    refetchInterval: 15_000,
  });
}
export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: messagingKeys.one(conversationId),
    queryFn: () => apiRequest(`/v1/conversations/${conversationId}`, ConversationDetailSchema),
    refetchInterval: THREAD_POLL_MS,
  });
}
export function useUnread() {
  const { session } = useSession();
  return useQuery({
    queryKey: messagingKeys.unread,
    queryFn: () => apiRequest("/v1/me/unread", UnreadSummarySchema),
    enabled: !!session,
    refetchInterval: 20_000,
  });
}
export function useStartConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: StartConversationBody) =>
      apiRequest("/v1/conversations", ConversationDetailSchema, { method: "POST", body }),
    onSuccess: (d) => {
      client.setQueryData(messagingKeys.one(d.conversation.id), d);
      void client.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
export function useSendMessage(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiRequest(`/v1/conversations/${conversationId}/messages`, MessageSchema, {
        method: "POST",
        body: { body },
      }),
    onSuccess: (m) => {
      client.setQueryData(
        messagingKeys.one(conversationId),
        (prev: z.infer<typeof ConversationDetailSchema> | undefined) =>
          prev ? { ...prev, messages: [...prev.messages, m] } : prev,
      );
      void client.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
export function useMarkRead(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest(`/v1/conversations/${conversationId}/read`, Empty, { method: "POST" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: messagingKeys.unread });
      void client.invalidateQueries({ queryKey: messagingKeys.mine });
    },
  });
}
