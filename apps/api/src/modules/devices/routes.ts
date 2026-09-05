import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { DeviceSchema, RegisterDeviceBodySchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { deviceTokens } from "../../db/schema.js";

/**
 * Appareils (jetons Expo Push). Un jeton appartient a un seul utilisateur :
 * s'il est re-enregistre par un autre compte (changement d'utilisateur sur
 * le meme telephone), il change de proprietaire.
 */
export const devicesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.put(
    "/v1/devices",
    {
      schema: {
        tags: ["devices"],
        body: RegisterDeviceBodySchema,
        response: { 200: DeviceSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request) => {
      const userId = request.identity!.userId;
      const [row] = await app.db
        .insert(deviceTokens)
        .values({ userId, platform: request.body.platform, token: request.body.token })
        .onConflictDoUpdate({
          target: deviceTokens.token,
          set: { userId, platform: request.body.platform, lastSeenAt: new Date() },
        })
        .returning();
      return { id: row!.id, platform: row!.platform, lastSeenAt: row!.lastSeenAt.toISOString() };
    },
  );

  app.delete(
    "/v1/devices/:token",
    {
      schema: {
        tags: ["devices"],
        params: z.object({ token: z.string().min(10).max(200) }).strict(),
        response: { 204: { type: "null" } },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await app.db
        .delete(deviceTokens)
        .where(
          and(
            eq(deviceTokens.token, request.params.token),
            eq(deviceTokens.userId, request.identity!.userId),
          ),
        );
      return reply.code(204).send();
    },
  );
};
