import { z } from "zod";
import {
  AcceptInvitationBodySchema,
  AcceptInvitationResponseSchema,
  BrandingConfirmSchema,
  BrandingUploadRequestSchema,
  CreateInvitationBodySchema,
  CreateOrganizationBodySchema,
  CreatedInvitationSchema,
  DeleteOrganizationBodySchema,
  InvitationsResponseSchema,
  OrganizationMembersResponseSchema,
  OrganizationSchema,
  SignedUploadSchema,
  UpdateMemberBodySchema,
  UpdateOrganizationBodySchema,
  UuidSchema,
} from "@lv/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { createOrganizationsService } from "./service.js";

export const organizationsRoutes: FastifyPluginAsyncZod<{ deepLinkScheme: string }> = async (
  app,
  opts,
) => {
  const service = createOrganizationsService(app.db, app.storage);
  const orgParams = z.object({ organizationId: UuidSchema }).strict();
  const memberParams = orgParams.extend({ userId: UuidSchema }).strict();
  const invitationParams = orgParams.extend({ invitationId: UuidSchema }).strict();
  const noContent = { 204: z.null() } as const;

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
    async (request, reply) =>
      reply.code(201).send(await service.create(request.actor, request.body, request.id)),
  );

  app.get(
    "/v1/organizations/:organizationId",
    {
      schema: { tags: ["organizations"], params: orgParams, response: { 200: OrganizationSchema } },
      onRequest: [app.requireAuth],
    },
    async (request) => service.getById(request.actor, request.params.organizationId),
  );

  app.patch(
    "/v1/organizations/:organizationId",
    {
      schema: {
        tags: ["organizations"],
        params: orgParams,
        body: UpdateOrganizationBodySchema,
        response: { 200: OrganizationSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.update(request.actor, request.params.organizationId, request.body, request.id),
  );

  app.post(
    "/v1/organizations/:organizationId/branding/upload-url",
    {
      schema: {
        tags: ["organizations"],
        params: orgParams,
        body: BrandingUploadRequestSchema,
        response: { 200: SignedUploadSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.createBrandingUpload(
        request.actor,
        request.params.organizationId,
        request.body.kind,
        request.body.mimeType,
      ),
  );

  app.post(
    "/v1/organizations/:organizationId/branding",
    {
      schema: {
        tags: ["organizations"],
        params: orgParams,
        body: BrandingConfirmSchema,
        response: { 200: OrganizationSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) =>
      service.confirmBranding(
        request.actor,
        request.params.organizationId,
        request.body.kind,
        request.body.path,
        request.id,
      ),
  );

  app.delete(
    "/v1/organizations/:organizationId",
    {
      schema: {
        tags: ["organizations"],
        params: orgParams,
        body: DeleteOrganizationBodySchema,
        response: noContent,
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      await service.remove(request.actor, request.params.organizationId, request.id);
      return reply.code(204).send(null);
    },
  );

  app.get(
    "/v1/organizations/:organizationId/members",
    {
      schema: {
        tags: ["organizations"],
        params: orgParams,
        response: { 200: OrganizationMembersResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      members: await service.listMembers(request.actor, request.params.organizationId),
    }),
  );

  app.patch(
    "/v1/organizations/:organizationId/members/:userId",
    {
      schema: {
        tags: ["organizations"],
        params: memberParams,
        body: UpdateMemberBodySchema,
        response: noContent,
      },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.updateMemberRole(
        request.actor,
        request.params.organizationId,
        request.params.userId,
        request.body.role,
        request.id,
      );
      return reply.code(204).send(null);
    },
  );

  app.delete(
    "/v1/organizations/:organizationId/members/:userId",
    {
      schema: { tags: ["organizations"], params: memberParams, response: noContent },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.removeMember(
        request.actor,
        request.params.organizationId,
        request.params.userId,
        request.id,
      );
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/v1/organizations/:organizationId/invitations",
    {
      schema: {
        tags: ["organizations"],
        params: orgParams,
        body: CreateInvitationBodySchema,
        response: { 201: CreatedInvitationSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) =>
      reply
        .code(201)
        .send(
          await service.createInvitation(
            request.actor,
            request.params.organizationId,
            request.body,
            opts.deepLinkScheme,
            request.id,
          ),
        ),
  );

  app.get(
    "/v1/organizations/:organizationId/invitations",
    {
      schema: {
        tags: ["organizations"],
        params: orgParams,
        response: { 200: InvitationsResponseSchema },
      },
      onRequest: [app.requireAuth],
    },
    async (request) => ({
      invitations: await service.listInvitations(request.actor, request.params.organizationId),
    }),
  );

  app.delete(
    "/v1/organizations/:organizationId/invitations/:invitationId",
    {
      schema: { tags: ["organizations"], params: invitationParams, response: noContent },
      onRequest: [app.requireAuth],
    },
    async (request, reply) => {
      await service.revokeInvitation(
        request.actor,
        request.params.organizationId,
        request.params.invitationId,
        request.id,
      );
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/v1/invitations/accept",
    {
      schema: {
        tags: ["organizations"],
        body: AcceptInvitationBodySchema,
        response: { 200: AcceptInvitationResponseSchema },
      },
      onRequest: [app.requireAuth],
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request) =>
      service.acceptInvitation(
        request.actor,
        request.identity!.email,
        request.body.token,
        request.id,
      ),
  );
};
