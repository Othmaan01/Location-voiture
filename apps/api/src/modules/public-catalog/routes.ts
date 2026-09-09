import { z } from "zod";
import {
  CitiesResponseSchema,
  FavoritesResponseSchema,
  FeedQuerySchema,
  FeedResponseSchema,
  IsoDateTimeSchema,
  LoueurProfileSchema,
  PublicVehicleDetailSchema,
  SearchQuerySchema,
  SearchResponseSchema,
  UuidSchema,
  VehicleAvailabilitySchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createPublicCatalogService } from "./service.js";

/** Catalogue public : accessible sans compte. Cache court cote client, rate limiting modere. */
export const publicCatalogRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createPublicCatalogService(app.db, app.storage);
  const tags = ["catalog"];
  const publicLimit = { rateLimit: { max: 120, timeWindow: "1 minute" } };

  app.get(
    "/v1/feed",
    {
      schema: { tags, querystring: FeedQuerySchema, response: { 200: FeedResponseSchema } },
      config: publicLimit,
    },
    async (request) => service.feed(request.query),
  );

  app.get(
    "/v1/loueurs/:organizationId",
    {
      schema: {
        tags,
        params: z.object({ organizationId: UuidSchema }).strict(),
        querystring: z
          .object({ from: IsoDateTimeSchema.optional(), to: IsoDateTimeSchema.optional() })
          .strict(),
        response: { 200: LoueurProfileSchema },
      },
      config: publicLimit,
    },
    async (request) => {
      const { from, to } = request.query;
      return service.loueur(request.params.organizationId, from && to ? { from, to } : null);
    },
  );

  app.get(
    "/v1/catalog/vehicles/:vehicleId",
    {
      schema: {
        tags,
        params: z.object({ vehicleId: UuidSchema }).strict(),
        querystring: z
          .object({ from: IsoDateTimeSchema.optional(), to: IsoDateTimeSchema.optional() })
          .strict(),
        response: { 200: PublicVehicleDetailSchema },
      },
      config: publicLimit,
    },
    async (request) => {
      const { from, to } = request.query;
      return service.vehicle(request.params.vehicleId, from && to ? { from, to } : null);
    },
  );

  app.get(
    "/v1/catalog/vehicles/:vehicleId/availability",
    {
      schema: {
        tags,
        params: z.object({ vehicleId: UuidSchema }).strict(),
        querystring: z.object({ from: IsoDateTimeSchema, to: IsoDateTimeSchema }).strict(),
        response: { 200: VehicleAvailabilitySchema },
      },
      config: publicLimit,
    },
    async (request) =>
      service.availability(request.params.vehicleId, request.query.from, request.query.to),
  );

  app.get(
    "/v1/search",
    {
      schema: { tags, querystring: SearchQuerySchema, response: { 200: SearchResponseSchema } },
      config: publicLimit,
    },
    async (request) => service.search(request.query),
  );

  app.get(
    "/v1/cities",
    { schema: { tags, response: { 200: CitiesResponseSchema } }, config: publicLimit },
    async () => ({ cities: await service.cities() }),
  );

  app.get(
    "/v1/me/favorites",
    {
      schema: { tags: ["favorites"], response: { 200: FavoritesResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({ vehicles: await service.listFavorites(request.actor) }),
  );
  app.put(
    "/v1/me/favorites/:vehicleId",
    {
      schema: {
        tags: ["favorites"],
        params: z.object({ vehicleId: UuidSchema }).strict(),
        response: { 204: z.null() },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.addFavorite(request.actor, request.params.vehicleId);
      return reply.code(204).send(null);
    },
  );
  app.delete(
    "/v1/me/favorites/:vehicleId",
    {
      schema: {
        tags: ["favorites"],
        params: z.object({ vehicleId: UuidSchema }).strict(),
        response: { 204: z.null() },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.removeFavorite(request.actor, request.params.vehicleId);
      return reply.code(204).send(null);
    },
  );
};
