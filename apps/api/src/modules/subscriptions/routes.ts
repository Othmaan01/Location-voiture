import { z } from "zod";
import { PlansResponseSchema, SubscriptionOverviewSchema, UuidSchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createSubscriptionsService } from "./service.js";

export const subscriptionsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createSubscriptionsService(app.db);
  const tags = ["subscriptions"];

  app.get("/v1/plans", { schema: { tags, response: { 200: PlansResponseSchema } } }, async () => ({
    plans: await service.listPlans(),
  }));

  app.get(
    "/v1/organizations/:organizationId/subscription",
    {
      schema: {
        tags,
        params: z.object({ organizationId: UuidSchema }).strict(),
        response: { 200: SubscriptionOverviewSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => service.overview(request.actor, request.params.organizationId),
  );
};
