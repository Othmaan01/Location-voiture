import { z } from "zod";
import {
  CreateOrganizationBodySchema,
  OrganizationMembersResponseSchema,
  OrganizationSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createOrganizationsService } from "./service.js";

export const organizationsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createOrganizationsService(app.db);
  const params = z.object({ organizationId: UuidSchema }).strict();

  app.post(
    "/v1/organizations",
    {
      schema: {
        tags: ["organizations"],
        body: CreateOrganizationBodySchema,
        response: { 201: OrganizationSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const organization = await service.create(request.actor, request.body, request.id);
      return reply.code(201).send(organization);
    },
  );

  app.get(
    "/v1/organizations/:organizationId",
    {
      schema: { tags: ["organizations"], params, response: { 200: OrganizationSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.getById(request.actor, request.params.organizationId),
  );

  app.get(
    "/v1/organizations/:organizationId/members",
    {
      schema: {
        tags: ["organizations"],
        params,
        response: { 200: OrganizationMembersResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      members: await service.listMembers(request.actor, request.params.organizationId),
    }),
  );
};
