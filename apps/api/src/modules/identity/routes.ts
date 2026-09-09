import { z } from "zod";
import {
  AvatarConfirmSchema,
  DeleteAccountBodySchema,
  MeResponseSchema,
  PhotoUploadRequestSchema,
  SignedUploadSchema,
  UpdateProfileBodySchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createIdentityService } from "./service.js";

export const identityRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createIdentityService(app.db, app.supabaseAdmin, app.storage);

  app.get(
    "/v1/me",
    {
      schema: { tags: ["identity"], response: { 200: MeResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.me(request.actor, request.identity!.email),
  );

  app.patch(
    "/v1/me",
    {
      schema: {
        tags: ["identity"],
        body: UpdateProfileBodySchema,
        response: { 200: MeResponseSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.updateProfile(request.actor, request.identity!.email, request.body, request.id),
  );

  app.post(
    "/v1/me/avatar/upload-url",
    {
      schema: {
        tags: ["identity"],
        body: PhotoUploadRequestSchema,
        response: { 200: SignedUploadSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request) => service.createAvatarUpload(request.actor, request.body.mimeType),
  );

  app.post(
    "/v1/me/avatar",
    {
      schema: {
        tags: ["identity"],
        body: AvatarConfirmSchema,
        response: { 200: MeResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.confirmAvatar(request.actor, request.identity!.email, request.body.path, request.id),
  );

  app.delete(
    "/v1/me",
    {
      schema: {
        tags: ["identity"],
        body: DeleteAccountBodySchema,
        response: { 204: z.null() },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 3, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      await service.deleteAccount(request.actor, request.id);
      return reply.code(204).send(null);
    },
  );
};
