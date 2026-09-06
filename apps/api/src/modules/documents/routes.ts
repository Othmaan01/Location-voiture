import { z } from "zod";
import {
  DocumentConfirmSchema,
  DocumentReadUrlSchema,
  DocumentSchema,
  DocumentUploadRequestSchema,
  DocumentsResponseSchema,
  SignedUploadSchema,
  UuidSchema,
  VerificationStatusSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createDocumentsService } from "./service.js";

export const documentsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createDocumentsService(app.db, app.storage);
  const orgParams = z.object({ organizationId: UuidSchema }).strict();
  const docParams = z.object({ documentId: UuidSchema }).strict();
  const tags = ["documents"];

  app.get(
    "/v1/organizations/:organizationId/documents",
    {
      schema: { tags, params: orgParams, response: { 200: DocumentsResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      documents: await service.list(request.actor, request.params.organizationId),
    }),
  );

  app.post(
    "/v1/organizations/:organizationId/documents/upload-url",
    {
      schema: {
        tags,
        params: orgParams,
        body: DocumentUploadRequestSchema,
        response: { 200: SignedUploadSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.createUpload(
        request.actor,
        request.params.organizationId,
        request.body.kind,
        request.body.mimeType,
      ),
  );

  app.post(
    "/v1/organizations/:organizationId/documents",
    {
      schema: {
        tags,
        params: orgParams,
        body: DocumentConfirmSchema,
        response: { 201: DocumentSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.confirm(
            request.actor,
            request.params.organizationId,
            request.body,
            null,
            request.id,
          ),
        ),
  );

  app.get(
    "/v1/documents/:documentId/url",
    {
      schema: { tags, params: docParams, response: { 200: DocumentReadUrlSchema } },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 60, timeWindow: "1 hour" } },
    },
    async (request) => service.readUrl(request.actor, request.params.documentId, request.id),
  );

  app.delete(
    "/v1/documents/:documentId",
    {
      schema: { tags, params: docParams, response: { 204: z.null() } },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.remove(request.actor, request.params.documentId, request.id);
      return reply.code(204).send(null);
    },
  );

  app.get(
    "/v1/organizations/:organizationId/verification",
    {
      schema: { tags, params: orgParams, response: { 200: VerificationStatusSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.verificationStatus(request.actor, request.params.organizationId),
  );

  app.post(
    "/v1/organizations/:organizationId/verification/submit",
    {
      schema: { tags, params: orgParams, response: { 204: z.null() } },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      await service.submitVerification(request.actor, request.params.organizationId, request.id);
      return reply.code(204).send(null);
    },
  );
};
