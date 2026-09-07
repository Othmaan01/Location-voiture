import { z } from "zod";
import {
  OrgStoriesResponseSchema,
  SignedUploadSchema,
  StoriesResponseSchema,
  StoryConfirmSchema,
  StorySchema,
  StoryUploadRequestSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createStoriesService } from "./service.js";

export const storiesRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createStoriesService(app.db, app.storage);
  const tags = ["stories"];
  const orgParams = z.object({ organizationId: UuidSchema }).strict();

  app.get(
    "/v1/stories",
    { schema: { tags, response: { 200: StoriesResponseSchema } } },
    async () => ({ groups: await service.feed() }),
  );

  app.get(
    "/v1/organizations/:organizationId/stories",
    {
      schema: { tags, params: orgParams, response: { 200: OrgStoriesResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      stories: await service.listForOrganization(request.actor, request.params.organizationId),
    }),
  );

  app.post(
    "/v1/organizations/:organizationId/stories/upload-url",
    {
      schema: {
        tags,
        params: orgParams,
        body: StoryUploadRequestSchema,
        response: { 200: SignedUploadSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.createUpload(request.actor, request.params.organizationId, request.body.mimeType),
  );

  app.post(
    "/v1/organizations/:organizationId/stories",
    {
      schema: { tags, params: orgParams, body: StoryConfirmSchema, response: { 201: StorySchema } },
      onRequest: [app.requireAuth],
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.confirm(
            request.actor,
            request.params.organizationId,
            request.body.path,
            request.body.caption,
            request.body.durationSeconds,
            request.id,
          ),
        ),
  );

  app.delete(
    "/v1/stories/:storyId",
    {
      schema: {
        tags,
        params: z.object({ storyId: UuidSchema }).strict(),
        response: { 204: z.null() },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.remove(request.actor, request.params.storyId, request.id);
      return reply.code(204).send(null);
    },
  );
};
