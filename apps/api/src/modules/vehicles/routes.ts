import { z } from "zod";
import {
  PhotoConfirmSchema,
  PhotoUploadRequestSchema,
  PublishCheckSchema,
  RatePlanInputSchema,
  RatePlanSchema,
  ReorderPhotosSchema,
  SignedUploadSchema,
  UuidSchema,
  VehicleInputSchema,
  VehiclePhotoSchema,
  VehicleSchema,
  VehicleUpdateSchema,
  VehiclesResponseSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createVehiclesService } from "./service.js";

export const vehiclesRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createVehiclesService(app.db, app.storage);
  const orgParams = z.object({ organizationId: UuidSchema }).strict();
  const vehicleParams = z.object({ vehicleId: UuidSchema }).strict();
  const photoParams = vehicleParams.extend({ photoId: UuidSchema }).strict();
  const tags = ["vehicles"];

  app.get(
    "/v1/organizations/:organizationId/vehicles",
    {
      schema: { tags, params: orgParams, response: { 200: VehiclesResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      vehicles: await service.list(request.actor, request.params.organizationId),
    }),
  );

  app.post(
    "/v1/organizations/:organizationId/vehicles",
    {
      schema: {
        tags,
        params: orgParams,
        body: VehicleInputSchema,
        response: { 201: VehicleSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 60, timeWindow: "1 hour" } },
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

  // Lecture : publique si publie (sans plaque), complete pour les membres.
  app.get(
    "/v1/vehicles/:vehicleId",
    { schema: { tags, params: vehicleParams, response: { 200: VehicleSchema } } },
    async (request) => service.get(request.actor, request.params.vehicleId),
  );

  app.patch(
    "/v1/vehicles/:vehicleId",
    {
      schema: {
        tags,
        params: vehicleParams,
        body: VehicleUpdateSchema,
        response: { 200: VehicleSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.update(request.actor, request.params.vehicleId, request.body, request.id),
  );

  app.delete(
    "/v1/vehicles/:vehicleId",
    {
      schema: { tags, params: vehicleParams, response: { 204: z.null() } },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.archive(request.actor, request.params.vehicleId, request.id);
      return reply.code(204).send(null);
    },
  );

  app.put(
    "/v1/vehicles/:vehicleId/rate-plan",
    {
      schema: {
        tags,
        params: vehicleParams,
        body: RatePlanInputSchema,
        response: { 200: RatePlanSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.setRatePlan(request.actor, request.params.vehicleId, request.body, request.id),
  );

  app.get(
    "/v1/vehicles/:vehicleId/publish-check",
    {
      schema: { tags, params: vehicleParams, response: { 200: PublishCheckSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.publishCheck(request.actor, request.params.vehicleId),
  );
  app.post(
    "/v1/vehicles/:vehicleId/publish",
    {
      schema: { tags, params: vehicleParams, response: { 200: VehicleSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.publish(request.actor, request.params.vehicleId, request.id),
  );
  app.post(
    "/v1/vehicles/:vehicleId/unpublish",
    {
      schema: { tags, params: vehicleParams, response: { 200: VehicleSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.unpublish(request.actor, request.params.vehicleId, request.id),
  );

  app.post(
    "/v1/vehicles/:vehicleId/photos/upload-url",
    {
      schema: {
        tags,
        params: vehicleParams,
        body: PhotoUploadRequestSchema,
        response: { 200: SignedUploadSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 120, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.createPhotoUpload(request.actor, request.params.vehicleId, request.body.mimeType),
  );
  app.post(
    "/v1/vehicles/:vehicleId/photos",
    {
      schema: {
        tags,
        params: vehicleParams,
        body: PhotoConfirmSchema,
        response: { 201: VehiclePhotoSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.confirmPhoto(
            request.actor,
            request.params.vehicleId,
            request.body,
            request.id,
          ),
        ),
  );
  app.put(
    "/v1/vehicles/:vehicleId/photos/order",
    {
      schema: {
        tags,
        params: vehicleParams,
        body: ReorderPhotosSchema,
        response: { 200: z.object({ photos: z.array(VehiclePhotoSchema) }).strict() },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      photos: await service.reorderPhotos(
        request.actor,
        request.params.vehicleId,
        request.body.photoIds,
        request.id,
      ),
    }),
  );
  app.delete(
    "/v1/vehicles/:vehicleId/photos/:photoId",
    {
      schema: { tags, params: photoParams, response: { 204: z.null() } },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.deletePhoto(
        request.actor,
        request.params.vehicleId,
        request.params.photoId,
        request.id,
      );
      return reply.code(204).send(null);
    },
  );
};
