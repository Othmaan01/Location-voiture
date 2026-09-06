import { z } from "zod";
import {
  AdminOrganizationsQuerySchema,
  AdminOrganizationsResponseSchema,
  DocumentReviewSchema,
  DocumentSchema,
  UuidSchema,
  VerificationDecisionSchema,
  VerificationQueueSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createAdminService } from "./service.js";

const SuspendBody = z
  .object({ suspend: z.boolean(), reason: z.string().trim().min(3).max(500).optional() })
  .strict();

/** Routes d'administration : role plateforme obligatoire, MFA exigee (aal2) en production. */
export const adminRoutes: FastifyPluginAsyncZod<{ requireMfa: boolean }> = async (app, opts) => {
  const service = createAdminService(app.db);
  const tags = ["admin"];

  app.addHook("onRequest", async (request) => {
    await app.requireAuth(request);
    if (opts.requireMfa && request.identity?.aal !== "aal2") {
      throw Object.assign(
        new Error("Authentification a deux facteurs requise pour l'administration."),
        { statusCode: 403 },
      );
    }
  });

  app.get(
    "/v1/admin/organizations",
    {
      schema: {
        tags,
        querystring: AdminOrganizationsQuerySchema,
        response: { 200: AdminOrganizationsResponseSchema },
      },
    },
    async (request) => ({
      items: await service.listOrganizations(request.actor, request.query),
    }),
  );

  app.get(
    "/v1/admin/verifications",
    { schema: { tags, response: { 200: VerificationQueueSchema } } },
    async (request) => ({ items: await service.verificationQueue(request.actor) }),
  );

  app.post(
    "/v1/admin/verifications/:organizationId/decision",
    {
      schema: {
        tags,
        params: z.object({ organizationId: UuidSchema }).strict(),
        body: VerificationDecisionSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.decideVerification(
        request.actor,
        request.params.organizationId,
        request.body.decision,
        request.body.reason,
        request.body.notes,
        request.id,
      );
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/v1/admin/documents/:documentId/review",
    {
      schema: {
        tags,
        params: z.object({ documentId: UuidSchema }).strict(),
        body: DocumentReviewSchema,
        response: { 200: DocumentSchema },
      },
    },
    async (request) =>
      service.reviewDocument(
        request.actor,
        request.params.documentId,
        request.body.status,
        request.body.rejectionReason,
        request.id,
      ),
  );

  app.post(
    "/v1/admin/organizations/:organizationId/suspension",
    {
      schema: {
        tags,
        params: z.object({ organizationId: UuidSchema }).strict(),
        body: SuspendBody,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.suspendOrganization(
        request.actor,
        request.params.organizationId,
        request.body.suspend,
        request.body.reason,
        request.id,
      );
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/v1/admin/vehicles/:vehicleId/suspension",
    {
      schema: {
        tags,
        params: z.object({ vehicleId: UuidSchema }).strict(),
        body: SuspendBody,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.suspendVehicle(
        request.actor,
        request.params.vehicleId,
        request.body.suspend,
        request.body.reason,
        request.id,
      );
      return reply.code(204).send(null);
    },
  );
};
