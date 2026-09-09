import { z } from "zod";
import {
  BillingUrlSchema,
  CheckoutBodySchema,
  ChoosePlanBodySchema,
  ChoosePlanResponseSchema,
  PlansResponseSchema,
  SubscriptionOverviewSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import type { BillingGateway } from "../../shared/billing.js";
import { DomainError } from "../../shared/errors.js";
import { createSubscriptionsService } from "./service.js";

export const subscriptionsRoutes: FastifyPluginAsyncZod<{
  billing: BillingGateway | null;
  deepLinkScheme: string;
}> = async (app, opts) => {
  const service = createSubscriptionsService(
    app.db,
    opts.billing,
    app.notifications,
    opts.deepLinkScheme,
    app.log,
  );
  const tags = ["subscriptions"];
  const orgParams = z.object({ organizationId: UuidSchema }).strict();

  app.get("/v1/plans", { schema: { tags, response: { 200: PlansResponseSchema } } }, async () => ({
    plans: await service.listPlans(),
  }));

  app.get(
    "/v1/organizations/:organizationId/subscription",
    {
      schema: { tags, params: orgParams, response: { 200: SubscriptionOverviewSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.overview(request.actor, request.params.organizationId),
  );

  app.post(
    "/v1/organizations/:organizationId/subscription/checkout",
    {
      schema: {
        tags,
        params: orgParams,
        body: CheckoutBodySchema,
        response: { 200: BillingUrlSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.checkout(
        request.actor,
        request.params.organizationId,
        request.body.planCode,
        request.identity?.email ?? null,
        request.id,
      ),
  );

  app.post(
    "/v1/organizations/:organizationId/subscription/plan",
    {
      schema: {
        tags,
        params: orgParams,
        body: ChoosePlanBodySchema,
        response: { 200: ChoosePlanResponseSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.choosePlan(
        request.actor,
        request.params.organizationId,
        request.body.planCode,
        request.identity?.email ?? null,
        request.id,
      ),
  );

  app.post(
    "/v1/organizations/:organizationId/subscription/portal",
    {
      schema: { tags, params: orgParams, response: { 200: BillingUrlSchema } },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request) => service.portal(request.actor, request.params.organizationId, request.id),
  );

  /** Webhook Stripe : corps brut pour la signature ; jamais d'authentification utilisateur. */
  await app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) =>
      done(null, body),
    );
    scope.post("/v1/billing/webhook", { config: { rateLimit: false } }, async (request, reply) => {
      if (!opts.billing) throw new DomainError("unavailable", "Facturation non configuree.");
      const signature = request.headers["stripe-signature"];
      if (typeof signature !== "string") throw new DomainError("forbidden", "Signature absente.");
      let event;
      try {
        event = opts.billing.constructEvent(request.body as Buffer, signature);
      } catch {
        throw new DomainError("forbidden", "Signature invalide.");
      }
      await service.handleEvent(event);
      return reply.code(200).send({ received: true });
    });
  });
};
