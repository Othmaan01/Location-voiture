import { z } from "zod";
import {
  BookingListQuerySchema,
  BookingSchema,
  BookingsResponseSchema,
  CancelBodySchema,
  DisputeBodySchema,
  CreateBookingBodySchema,
  DecisionBodySchema,
  QuoteRequestSchema,
  QuoteSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createBookingsService } from "./service.js";

/** Corps facultatif : une requete sans corps arrive comme `null`, on la traite comme `{}`. */
const optionalBody = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => v ?? {}, schema);

export const bookingsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createBookingsService(app.db, app.storage, app.notifications);
  const tags = ["bookings"];
  const bookingParams = z.object({ bookingId: UuidSchema }).strict();

  // Devis : sans compte (affichage du prix pour des dates).
  app.post(
    "/v1/quotes",
    {
      schema: { tags, body: QuoteRequestSchema, response: { 201: QuoteSchema } },
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) =>
      reply.code(201).send(await service.createQuote(request.actor, request.body)),
  );

  // Demande : compte requis, idempotente (Idempotency-Key).
  app.post(
    "/v1/bookings",
    {
      schema: { tags, body: CreateBookingBodySchema, response: { 201: BookingSchema } },
      onRequest: [app.requireAuth],
      config: { idempotent: true, rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) =>
      reply.code(201).send(await service.create(request.actor, request.body, request.id)),
  );

  app.get(
    "/v1/me/bookings",
    {
      schema: {
        tags,
        querystring: BookingListQuerySchema,
        response: { 200: BookingsResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      bookings: await service.listMine(request.actor, request.query.scope),
    }),
  );

  app.get(
    "/v1/organizations/:organizationId/bookings",
    {
      schema: {
        tags,
        params: z.object({ organizationId: UuidSchema }).strict(),
        querystring: BookingListQuerySchema,
        response: { 200: BookingsResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      bookings: await service.listForOrganization(
        request.actor,
        request.params.organizationId,
        request.query.scope,
        request.query.status,
      ),
    }),
  );

  app.get(
    "/v1/bookings/:bookingId",
    {
      schema: { tags, params: bookingParams, response: { 200: BookingSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.get(request.actor, request.params.bookingId),
  );

  app.post(
    "/v1/bookings/:bookingId/confirm",
    {
      schema: {
        tags,
        params: bookingParams,
        body: optionalBody(DecisionBodySchema),
        response: { 200: BookingSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.decide(
        request.actor,
        request.params.bookingId,
        "confirmed",
        request.body.reason,
        request.id,
      ),
  );
  app.post(
    "/v1/bookings/:bookingId/decline",
    {
      schema: {
        tags,
        params: bookingParams,
        body: DecisionBodySchema,
        response: { 200: BookingSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.decide(
        request.actor,
        request.params.bookingId,
        "declined",
        request.body.reason,
        request.id,
      ),
  );
  app.post(
    "/v1/bookings/:bookingId/cancel",
    {
      schema: {
        tags,
        params: bookingParams,
        body: optionalBody(CancelBodySchema),
        response: { 200: BookingSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.transition(
        request.actor,
        request.params.bookingId,
        "cancelled",
        request.body.reason,
        request.id,
      ),
  );
  app.post(
    "/v1/bookings/:bookingId/start",
    {
      schema: { tags, params: bookingParams, response: { 200: BookingSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.transition(request.actor, request.params.bookingId, "active", undefined, request.id),
  );
  app.post(
    "/v1/bookings/:bookingId/complete",
    {
      schema: { tags, params: bookingParams, response: { 200: BookingSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.transition(
        request.actor,
        request.params.bookingId,
        "completed",
        undefined,
        request.id,
      ),
  );
  app.post(
    "/v1/bookings/:bookingId/dispute",
    {
      schema: {
        tags,
        params: bookingParams,
        body: DisputeBodySchema,
        response: { 200: BookingSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.transition(
        request.actor,
        request.params.bookingId,
        "disputed",
        request.body.reason,
        request.id,
      ),
  );
  app.post(
    "/v1/bookings/:bookingId/resolve",
    {
      schema: {
        tags,
        params: bookingParams,
        body: DisputeBodySchema,
        response: { 200: BookingSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.transition(
        request.actor,
        request.params.bookingId,
        "resolved",
        request.body.reason,
        request.id,
      ),
  );
  app.post(
    "/v1/bookings/:bookingId/no-show",
    {
      schema: {
        tags,
        params: bookingParams,
        body: optionalBody(DecisionBodySchema),
        response: { 200: BookingSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.transition(
        request.actor,
        request.params.bookingId,
        "no_show",
        request.body.reason,
        request.id,
      ),
  );
};
