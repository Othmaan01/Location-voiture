import { z } from "zod";
import { OfferInputSchema, OfferSchema, OffersResponseSchema, UuidSchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createOffersService } from "./service.js";

export const offersRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createOffersService(app.db);
  const tags = ["offers"];
  const orgParams = z.object({ organizationId: UuidSchema }).strict();

  app.get(
    "/v1/organizations/:organizationId/offers",
    {
      schema: { tags, params: orgParams, response: { 200: OffersResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      offers: await service.list(request.actor, request.params.organizationId),
    }),
  );

  app.post(
    "/v1/organizations/:organizationId/offers",
    {
      schema: { tags, params: orgParams, body: OfferInputSchema, response: { 201: OfferSchema } },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.create(
            request.actor,
            request.params.organizationId,
            request.body,
            request.id,
          ),
        ),
  );

  app.delete(
    "/v1/offers/:offerId",
    {
      schema: {
        tags,
        params: z.object({ offerId: UuidSchema }).strict(),
        response: { 204: z.null() },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.archive(request.actor, request.params.offerId, request.id);
      return reply.code(204).send(null);
    },
  );
};
