import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  MarkNotificationsReadBodySchema,
  NotificationsResponseSchema,
  type Notification,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { notifications } from "../../db/schema.js";

/** Fenetre affichee dans le centre de notifications ; la purge garde 90 jours (ADR-0017). */
export const NOTIFICATIONS_WINDOW_DAYS = 60;
/** Les messages ne passent pas par le centre : ils se comptent sur la bulle Messages (retour fondateur). */
const notInMessages = sql`${notifications.kind} not like 'message.%'`;

function toDto(row: typeof notifications.$inferSelect): Notification {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key !== "title" && key !== "body" && typeof value === "string") data[key] = value;
  }
  return {
    id: row.id,
    kind: row.kind,
    title: typeof payload["title"] === "string" ? payload["title"] : "",
    body: typeof payload["body"] === "string" ? payload["body"] : "",
    data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Centre de notifications : lecture des siennes, marquage lu. Les envois restent dans le service. */
export const notificationsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/v1/me/notifications",
    {
      schema: { tags: ["notifications"], response: { 200: NotificationsResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => {
      const userId = request.identity!.userId;
      const since = new Date(Date.now() - NOTIFICATIONS_WINDOW_DAYS * 86_400_000);
      const [rows, unread] = await Promise.all([
        app.db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              gte(notifications.createdAt, since),
              notInMessages,
            ),
          )
          .orderBy(desc(notifications.createdAt))
          .limit(100),
        app.db
          .select({ n: sql<number>`count(*)::int` })
          .from(notifications)
          .where(
            and(eq(notifications.userId, userId), isNull(notifications.readAt), notInMessages),
          ),
      ]);
      return { notifications: rows.map(toDto), unreadCount: unread[0]?.n ?? 0 };
    },
  );

  app.post(
    "/v1/me/notifications/read",
    {
      schema: {
        tags: ["notifications"],
        body: MarkNotificationsReadBodySchema,
        response: { 204: z.null() },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      const userId = request.identity!.userId;
      await app.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
            request.body.ids ? inArray(notifications.id, request.body.ids) : undefined,
          ),
        );
      return reply.code(204).send(null);
    },
  );
};
