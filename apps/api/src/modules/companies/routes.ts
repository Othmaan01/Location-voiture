import { CompanyLookupQuerySchema, CompanyLookupSchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createCompaniesService } from "./service.js";

/** Aide a la saisie : raison sociale et etablissements depuis un SIREN ou un SIRET. */
export const companiesRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = createCompaniesService();
  app.get(
    "/v1/companies/lookup",
    {
      schema: {
        tags: ["companies"],
        querystring: CompanyLookupQuerySchema,
        response: { 200: CompanyLookupSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request) => service.lookup(request.query.q),
  );
};
