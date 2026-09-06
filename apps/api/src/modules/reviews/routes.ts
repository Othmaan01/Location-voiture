import { z } from "zod";
import {
  CreateReviewBodySchema,
  ReplyReviewBodySchema,
  ReviewSchema,
  ReviewsResponseSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createReviewsService } from "./service.js";

export const reviewsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createReviewsService(app.db, app.notifications);
  const tags = ["reviews"];

  app.post(
    "/v1/bookings/:bookingId/review",
    {
      schema: {
        tags,
        params: z.object({ bookingId: UuidSchema }).strict(),
        body: CreateReviewBodySchema,
        response: { 201: ReviewSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.create(request.actor, request.params.bookingId, request.body, request.id),
        ),
  );

  app.get(
    "/v1/loueurs/:organizationId/reviews",
    {
      schema: {
        tags,
        params: z.object({ organizationId: UuidSchema }).strict(),
        response: { 200: ReviewsResponseSchema },
      },
    },
    async (request) => {
      const result = await service.listPublic(request.params.organizationId, request.actor);
      return {
        reviews: result.reviews,
        ratingAverage: result.rating.average,
        ratingCount: result.rating.count,
      };
    },
  );

  app.post(
    "/v1/reviews/:reviewId/reply",
    {
      schema: {
        tags,
        params: z.object({ reviewId: UuidSchema }).strict(),
        body: ReplyReviewBodySchema,
        response: { 200: ReviewSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.reply(request.actor, request.params.reviewId, request.body.reply, request.id),
  );
};
