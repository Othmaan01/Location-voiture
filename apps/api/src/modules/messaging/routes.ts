import { z } from "zod";
import {
  ConversationDetailSchema,
  ConversationMessagesQuerySchema,
  ConversationsResponseSchema,
  MessageSchema,
  SendMessageBodySchema,
  StartConversationBodySchema,
  UnreadSummarySchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createMessagingService } from "./service.js";

export const messagingRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createMessagingService(app.db, app.storage, app.notifications);
  const tags = ["messaging"];
  const convParams = z.object({ conversationId: UuidSchema }).strict();

  app.post(
    "/v1/conversations",
    {
      schema: {
        tags,
        body: StartConversationBodySchema,
        response: { 201: ConversationDetailSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) =>
      reply.code(201).send(await service.start(request.actor, request.body, request.id)),
  );

  app.get(
    "/v1/me/conversations",
    {
      schema: { tags, response: { 200: ConversationsResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({ conversations: await service.listMine(request.actor) }),
  );

  app.get(
    "/v1/me/unread",
    { schema: { tags, response: { 200: UnreadSummarySchema } }, onRequest: [app.requireAuth] },
    async (request) => service.unread(request.actor),
  );

  app.get(
    "/v1/organizations/:organizationId/conversations",
    {
      schema: {
        tags,
        params: z.object({ organizationId: UuidSchema }).strict(),
        response: { 200: ConversationsResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      conversations: await service.listForOrganization(
        request.actor,
        request.params.organizationId,
      ),
    }),
  );

  app.get(
    "/v1/conversations/:conversationId",
    {
      schema: {
        tags,
        params: convParams,
        querystring: ConversationMessagesQuerySchema,
        response: { 200: ConversationDetailSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (request) =>
      service.get(request.actor, request.params.conversationId, request.query.after),
  );

  app.post(
    "/v1/conversations/:conversationId/messages",
    {
      schema: {
        tags,
        params: convParams,
        body: SendMessageBodySchema,
        response: { 201: MessageSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.send(
            request.actor,
            request.params.conversationId,
            request.body.body,
            request.id,
          ),
        ),
  );

  app.post(
    "/v1/conversations/:conversationId/read",
    {
      schema: { tags, params: convParams, response: { 204: z.null() } },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.markRead(request.actor, request.params.conversationId);
      return reply.code(204).send(null);
    },
  );
};
