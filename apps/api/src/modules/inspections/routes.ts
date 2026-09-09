import { z } from "zod";
import {
  InspectionInputSchema,
  InspectionSchema,
  InspectionsResponseSchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import type { EmailGateway } from "../../shared/email.js";
import type { SupabaseAdmin } from "../../shared/supabase-admin.js";
import { createInspectionsService } from "./service.js";

export const inspectionsRoutes: FastifyPluginAsyncZod<{
  email: EmailGateway;
  supabaseAdmin: SupabaseAdmin;
}> = async (app, opts) => {
  const service = createInspectionsService(app.db, app.storage, opts.email, opts.supabaseAdmin);
  const tags = ["inspections"];
  const params = z.object({ bookingId: UuidSchema }).strict();

  app.get(
    "/v1/bookings/:bookingId/inspections",
    {
      schema: { tags, params, response: { 200: InspectionsResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      inspections: await service.list(request.actor, request.params.bookingId),
    }),
  );

  app.post(
    "/v1/bookings/:bookingId/inspections",
    {
      schema: { tags, params, body: InspectionInputSchema, response: { 201: InspectionSchema } },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.create(request.actor, request.params.bookingId, request.body, request.id),
        ),
  );
};
