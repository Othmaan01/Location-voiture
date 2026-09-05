import { HealthResponseSchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const healthRoutes: FastifyPluginAsyncZod<{ version: string }> = async (app, opts) => {
  app.get(
    "/health",
    {
      schema: { tags: ["system"], response: { 200: HealthResponseSchema } },
      config: { rateLimit: false },
    },
    async () => ({ status: "ok" as const, version: opts.version, time: new Date().toISOString() }),
  );
};
