import { eq, inArray } from "drizzle-orm";
import type { Logger } from "pino";

import type { Database } from "../../db/client.js";
import { deviceTokens, notifications, organizationMembers } from "../../db/schema.js";

export interface NotificationInput {
  kind: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationsService {
  notifyUser(userId: string, input: NotificationInput): Promise<void>;
  notifyOrganization(organizationId: string, input: NotificationInput): Promise<void>;
}

/** Transport push (Expo). Injectable pour les tests. */
export interface PushSender {
  send(
    messages: { to: string; title: string; body: string; data?: Record<string, string> }[],
  ): Promise<void>;
}

export function createExpoPushSender(logger: Logger): PushSender {
  return {
    async send(messages) {
      if (messages.length === 0) return;
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(
            messages.map((m) => ({ ...m, sound: "default", channelId: "default" })),
          ),
        });
        if (!response.ok) logger.warn({ status: response.status }, "push: reponse Expo non OK");
      } catch (error) {
        logger.warn({ err: error }, "push: envoi impossible");
      }
    },
  };
}

/**
 * Notifications : une ligne en base (centre de notifications) + un push vers chaque appareil.
 * L'echec du push n'est jamais bloquant pour l'action metier.
 */
export function createNotificationsService(db: Database, push: PushSender): NotificationsService {
  async function deliver(userIds: string[], input: NotificationInput) {
    if (userIds.length === 0) return;
    await db.insert(notifications).values(
      userIds.map((userId) => ({
        userId,
        kind: input.kind,
        payload: { title: input.title, body: input.body, ...(input.data ?? {}) },
      })),
    );
    const tokens = await db
      .select({ token: deviceTokens.token })
      .from(deviceTokens)
      .where(inArray(deviceTokens.userId, userIds));
    await push.send(
      tokens.map((t) => ({
        to: t.token,
        title: input.title,
        body: input.body,
        ...(input.data ? { data: input.data } : {}),
      })),
    );
  }
  return {
    notifyUser: (userId, input) => deliver([userId], input),
    async notifyOrganization(organizationId, input) {
      const members = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, organizationId));
      await deliver(
        members.map((m) => m.userId),
        input,
      );
    },
  };
}
