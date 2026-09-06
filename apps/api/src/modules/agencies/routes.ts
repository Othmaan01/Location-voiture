import { z } from "zod";
import {
  AgenciesResponseSchema,
  AgencyInputSchema,
  AgencySchema,
  AgencyUpdateSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createAgenciesService } from "./service.js";

export const agenciesRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createAgenciesService(app.db);
  const orgParams = z.object({ organizationId: UuidSchema }).strict();
  const agencyParams = z.object({ agencyId: UuidSchema }).strict();

  app.get(
    "/v1/organizations/:organizationId/agencies",
    {
      schema: { tags: ["agencies"], params: orgParams, response: { 200: AgenciesResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      agencies: await service.list(request.actor, request.params.organizationId),
    }),
  );

  app.post(
    "/v1/organizations/:organizationId/agencies",
    {
      schema: {
        tags: ["agencies"],
        params: orgParams,
        body: AgencyInputSchema,
        response: { 201: AgencySchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
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

  app.patch(
    "/v1/agencies/:agencyId",
    {
      schema: {
        tags: ["agencies"],
        params: agencyParams,
        body: AgencyUpdateSchema,
        response: { 200: AgencySchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.update(request.actor, request.params.agencyId, request.body, request.id),
  );

  app.delete(
    "/v1/agencies/:agencyId",
    {
      schema: { tags: ["agencies"], params: agencyParams, response: { 204: z.null() } },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.remove(request.actor, request.params.agencyId, request.id);
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/v1/agencies/:agencyId/publish",
    {
      schema: { tags: ["agencies"], params: agencyParams, response: { 200: AgencySchema } },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.setPublished(request.actor, request.params.agencyId, true, request.id),
  );

  app.post(
    "/v1/agencies/:agencyId/unpublish",
    {
      schema: { tags: ["agencies"], params: agencyParams, response: { 200: AgencySchema } },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.setPublished(request.actor, request.params.agencyId, false, request.id),
  );
};
