import { z } from "zod";
import {
  CustomerReviewInputSchema,
  CustomerReviewSchema,
  CustomerReviewsResponseSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createCustomerReviewsService } from "./service.js";

export const customerReviewsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createCustomerReviewsService(app.db);
  const tags = ["customer-reviews"];

  app.post(
    "/v1/bookings/:bookingId/customer-review",
    {
      schema: {
        tags,
        params: z.object({ bookingId: UuidSchema }).strict(),
        body: CustomerReviewInputSchema,
        response: { 201: CustomerReviewSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.create(request.actor, request.params.bookingId, request.body, request.id),
        ),
  );

  app.get(
    "/v1/me/reviews",
    {
      schema: { tags, response: { 200: CustomerReviewsResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.listMine(request.actor),
  );
};
