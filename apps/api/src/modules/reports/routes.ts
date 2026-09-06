import { CreateReportBodySchema, ReportSchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createReportsService } from "./service.js";

export const reportsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createReportsService(app.db);
  app.post(
    "/v1/reports",
    {
      schema: { tags: ["reports"], body: CreateReportBodySchema, response: { 201: ReportSchema } },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) =>
      reply.code(201).send(await service.create(request.actor, request.body, request.id)),
  );
};
