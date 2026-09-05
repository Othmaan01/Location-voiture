import { eq } from "drizzle-orm";
import { MeResponseSchema, UpdateProfileBodySchema } from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { organizationMembers, organizations, profiles } from "../../db/schema.js";
import { audit } from "../../shared/audit.js";

export const identityRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/v1/me",
    {
      schema: { tags: ["identity"], response: { 200: MeResponseSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => {
      const userId = request.identity!.userId;
      const [profile] = await app.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      const rows = await app.db
        .select({
          organizationId: organizations.id,
          organizationName: organizations.name,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(eq(organizationMembers.userId, userId));
      return {
        userId,
        email: request.identity!.email,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        platformRole: request.actor.platformRole,
        memberships: rows,
      };
    },
  );

  app.patch(
    "/v1/me",
    {
      schema: {
        tags: ["identity"],
        body: UpdateProfileBodySchema,
        response: { 200: MeResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => {
      const userId = request.identity!.userId;
      const body = request.body;
      await app.db.transaction(async (tx) => {
        await tx
          .update(profiles)
          .set({
            ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
            ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
          })
          .where(eq(profiles.id, userId));
        await audit(tx, {
          actorId: userId,
          actorType: "customer",
          action: "profile.update",
          subjectType: "profile",
          subjectId: userId,
          metadata: { fields: Object.keys(body) },
          requestId: request.id,
        });
      });
      const [profile] = await app.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      const rows = await app.db
        .select({
          organizationId: organizations.id,
          organizationName: organizations.name,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(eq(organizationMembers.userId, userId));
      return {
        userId,
        email: request.identity!.email,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        platformRole: request.actor.platformRole,
        memberships: rows,
      };
    },
  );
};
