import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { create } from "zustand";
import {
  OrgStoriesResponseSchema,
  SignedUploadSchema,
  StoriesResponseSchema,
  StorySchema,
  type StoryConfirm,
  type StoryUploadRequest,
} from "@lv/contracts";

import { apiRequest } from "./api";

const Empty = z.null();

export const storyKeys = {
  feed: ["stories"] as const,
  org: (orgId: string) => ["organizations", orgId, "stories"] as const,
};

/** Bulles du feed (ADR-0016) : public, sans compte. */
export function useStories() {
  return useQuery({
    queryKey: storyKeys.feed,
    queryFn: () => apiRequest("/v1/stories", StoriesResponseSchema),
    staleTime: 60_000,
  });
}

export function useOrgStories(orgId: string) {
  return useQuery({
    queryKey: storyKeys.org(orgId),
    queryFn: () => apiRequest(`/v1/organizations/${orgId}/stories`, OrgStoriesResponseSchema),
  });
}
export function useStoryUploadUrl(orgId: string) {
  return useMutation({
    mutationFn: (body: StoryUploadRequest) =>
      apiRequest(`/v1/organizations/${orgId}/stories/upload-url`, SignedUploadSchema, {
        method: "POST",
        body,
      }),
  });
}
export function useConfirmStory(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: StoryConfirm) =>
      apiRequest(`/v1/organizations/${orgId}/stories`, StorySchema, { method: "POST", body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: storyKeys.org(orgId) });
      void client.invalidateQueries({ queryKey: storyKeys.feed });
    },
  });
}
export function useDeleteStory(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) =>
      apiRequest(`/v1/stories/${storyId}`, Empty, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: storyKeys.org(orgId) });
      void client.invalidateQueries({ queryKey: storyKeys.feed });
    },
  });
}

/**
 * Bulles deja vues : cle = organisation + date du dernier contenu, donc une bulle
 * redevient « non vue » des que le loueur publie du neuf. Memoire de session, volontairement.
 */
interface SeenState {
  seen: Record<string, true>;
  markSeen: (key: string) => void;
}
export const useSeenStories = create<SeenState>((set) => ({
  seen: {},
  markSeen: (key) => set((s) => (s.seen[key] ? s : { seen: { ...s.seen, [key]: true } })),
}));
export const seenKey = (organizationId: string, latestAt: string) =>
  `${organizationId}:${latestAt}`;
