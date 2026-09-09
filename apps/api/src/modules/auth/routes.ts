import { SignUpBodySchema, SignUpResponseSchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { DomainError } from "../../shared/errors.js";
import type { SupabaseAdmin } from "../../shared/supabase-admin.js";

/** Inscription par le moteur (ADR-0019) : compte confirme d'office, limite par adresse IP. */
export const authRoutes: FastifyPluginAsyncZod<{ supabaseAdmin: SupabaseAdmin }> = async (
  app,
  opts,
) => {
  app.post(
    "/v1/auth/signup",
    {
      schema: { tags: ["auth"], body: SignUpBodySchema, response: { 201: SignUpResponseSchema } },
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { email, password, firstName, lastName, preferredMode } = request.body;
      const result = await opts.supabaseAdmin.createUser({
        email: email.trim().toLowerCase(),
        password,
        metadata: { first_name: firstName, last_name: lastName, preferred_mode: preferredMode },
      });
      if (result.status === "exists")
        throw new DomainError("conflict", "Un compte existe deja avec cette adresse.", {
          code: "email_exists",
        });
      if (result.status === "weak_password")
        throw new DomainError("validation_failed", "Mot de passe trop faible.", {
          code: "weak_password",
        });
      request.log.info({ userId: result.userId }, "compte cree par le moteur");
      return reply.code(201).send({ userId: result.userId });
    },
  );
};
