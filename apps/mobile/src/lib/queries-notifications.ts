import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { NotificationsResponseSchema } from "@lv/contracts";

import { apiRequest } from "./api";
import { useSession } from "./session";

const Empty = z.null();

export const notificationKeys = { mine: ["notifications", "mine"] as const };

/** Centre de notifications : ce qui concerne l'utilisateur, rafraichi toutes les 30 s. */
export function useNotifications() {
  const { session } = useSession();
  return useQuery({
    queryKey: notificationKeys.mine,
    queryFn: () => apiRequest("/v1/me/notifications", NotificationsResponseSchema),
    enabled: !!session,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) =>
      apiRequest("/v1/me/notifications/read", Empty, {
        method: "POST",
        body: ids ? { ids } : {},
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.mine }),
  });
}
