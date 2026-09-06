import { z } from "zod";
import { AvailabilityBlockInputSchema, AvailabilityBlockSchema, UuidSchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createAvailabilityService } from "./service.js";

export const availabilityRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createAvailabilityService(app.db);
  const tags = ["availability"];
  const vehicleParams = z.object({ vehicleId: UuidSchema }).strict();

  app.get(
    "/v1/vehicles/:vehicleId/blocks",
    {
      schema: {
        tags,
        params: vehicleParams,
        response: { 200: z.object({ blocks: z.array(AvailabilityBlockSchema) }).strict() },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      blocks: await service.list(request.actor, request.params.vehicleId),
    }),
  );
  app.post(
    "/v1/vehicles/:vehicleId/blocks",
    {
      schema: {
        tags,
        params: vehicleParams,
        body: AvailabilityBlockInputSchema,
        response: { 201: AvailabilityBlockSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.create(request.actor, request.params.vehicleId, request.body, request.id),
        ),
  );
  app.delete(
    "/v1/blocks/:blockId",
    {
      schema: {
        tags,
        params: z.object({ blockId: UuidSchema }).strict(),
        response: { 204: z.null() },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.remove(request.actor, request.params.blockId, request.id);
      return reply.code(204).send(null);
    },
  );
};
