import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

import { registerDeviceForPush } from "./notifications";
import { useSession } from "./session";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Enregistre l'appareil des qu'une session existe, et ouvre la reservation
 * concernee quand l'utilisateur touche une notification.
 */
export function PushListener() {
  const { session } = useSession();
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (session && !registered.current) {
      registered.current = true;
      void registerDeviceForPush();
    }
    if (!session) registered.current = false;
  }, [session]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        { bookingId?: string; conversationId?: string } | undefined;
      if (data?.conversationId) router.push(`/conversations/${data.conversationId}`);
      else if (data?.bookingId) router.push(`/reservations/${data.bookingId}`);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then((r) => r && open(r));
    return () => sub.remove();
  }, [router]);

  return null;
}
