import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type {
  CreateInvitationBody,
  CreateOrganizationBody,
  Invitation,
  Organization,
  OrganizationMember,
  OrganizationRole,
  UpdateOrganizationBody,
} from "@lv/contracts";

import type { Database } from "../../db/client.js";
import {
  organizationInvitations,
  organizationMembers,
  organizations,
  plans,
  profiles,
} from "../../db/schema.js";
import { audit } from "../../shared/audit.js";
import { assertCan, assertCanOrHide, type Actor } from "../../shared/authz.js";
import { isUniqueViolation, translateDbError } from "../../shared/db-errors.js";
import { DomainError, notFound } from "../../shared/errors.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Cle de Luhn d'un SIRET (14 chiffres). */
export function isValidSiret(siret: string): boolean {
  if (!/^[0-9]{14}$/.test(siret)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    let digit = Number(siret[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "organisation"}-${randomBytes(3).toString("hex")}`;
}

function toDto(row: typeof organizations.$inferSelect): Organization {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    siret: row.siret,
    countryCode: row.countryCode,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function invitationDto(row: typeof organizationInvitations.$inferSelect): Invitation {
  return {
    id: row.id,
    email: row.email,
    role: row.role as "manager" | "agent",
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface OrganizationsService {
  create(actor: Actor, input: CreateOrganizationBody, requestId: string): Promise<Organization>;
  getById(actor: Actor, organizationId: string): Promise<Organization>;
  update(
    actor: Actor,
    organizationId: string,
    input: UpdateOrganizationBody,
    requestId: string,
  ): Promise<Organization>;
  listMembers(actor: Actor, organizationId: string): Promise<OrganizationMember[]>;
  updateMemberRole(
    actor: Actor,
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    requestId: string,
  ): Promise<void>;
  removeMember(
    actor: Actor,
    organizationId: string,
    userId: string,
    requestId: string,
  ): Promise<void>;
  createInvitation(
    actor: Actor,
    organizationId: string,
    input: CreateInvitationBody,
    deepLinkScheme: string,
    requestId: string,
  ): Promise<Invitation & { token: string; link: string }>;
  listInvitations(actor: Actor, organizationId: string): Promise<Invitation[]>;
  revokeInvitation(
    actor: Actor,
    organizationId: string,
    invitationId: string,
    requestId: string,
  ): Promise<void>;
  acceptInvitation(
    actor: Actor,
    email: string | null,
    token: string,
    requestId: string,
  ): Promise<{ organizationId: string; organizationName: string; role: "manager" | "agent" }>;
}

export function createOrganizationsService(db: Database): OrganizationsService {
  return {
    async create(actor, input, requestId) {
      assertCan(actor, "booking.create"); // tout utilisateur authentifie peut fonder une organisation
      const userId = actor.userId!;
      if (input.siret && !isValidSiret(input.siret)) {
        throw new DomainError("validation_failed", "SIRET invalide.", { field: "siret" });
      }
      const [defaultPlan] = await db
        .select({ code: plans.code })
        .from(plans)
        .where(eq(plans.isDefault, true))
        .limit(1);
      if (!defaultPlan) throw new DomainError("internal", "Aucun plan par defaut configure.");

      return db.transaction(async (tx) => {
        let row: typeof organizations.$inferSelect | undefined;
        try {
          [row] = await tx
            .insert(organizations)
            .values({
              name: input.name,
              slug: slugify(input.name),
              legalName: input.legalName ?? null,
              siret: input.siret ?? null,
              countryCode: input.countryCode,
              planCode: defaultPlan.code,
            })
            .returning();
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new DomainError("conflict", "Une organisation avec ce SIRET existe deja.", {
              field: "siret",
            });
          }
          throw error;
        }
        if (!row) throw new DomainError("internal", "Creation impossible.");
        await tx
          .insert(organizationMembers)
          .values({ organizationId: row.id, userId, role: "owner" });
        await audit(tx, {
          actorId: userId,
          actorType: "organization_member",
          action: "organization.create",
          subjectType: "organization",
          subjectId: row.id,
          organizationId: row.id,
          requestId,
        });
        return toDto(row);
      });
    },

    async getById(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const [row] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!row) throw notFound("Organisation");
      return toDto(row);
    },

    async update(actor, organizationId, input, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.write", { organizationId });
      if (input.siret && !isValidSiret(input.siret)) {
        throw new DomainError("validation_failed", "SIRET invalide.", { field: "siret" });
      }
      try {
        const [row] = await db
          .update(organizations)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
            ...(input.siret !== undefined ? { siret: input.siret } : {}),
            ...(input.billingEmail !== undefined ? { billingEmail: input.billingEmail } : {}),
          })
          .where(eq(organizations.id, organizationId))
          .returning();
        if (!row) throw notFound("Organisation");
        await audit(db, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "organization.update",
          subjectType: "organization",
          subjectId: organizationId,
          organizationId,
          metadata: { fields: Object.keys(input) },
          requestId,
        });
        return toDto(row);
      } catch (error) {
        return translateDbError(error, "Une organisation avec ce SIRET existe deja.");
      }
    },

    async listMembers(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      const rows = await db
        .select({
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          joinedAt: organizationMembers.joinedAt,
        })
        .from(organizationMembers)
        .leftJoin(profiles, eq(profiles.id, organizationMembers.userId))
        .where(eq(organizationMembers.organizationId, organizationId));
      return rows.map((r) => ({
        userId: r.userId,
        role: r.role,
        firstName: r.firstName ?? null,
        lastName: r.lastName ?? null,
        joinedAt: r.joinedAt.toISOString(),
      }));
    },

    async updateMemberRole(actor, organizationId, userId, role, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.members.manage", { organizationId });
      try {
        await db.transaction(async (tx) => {
          const updated = await tx
            .update(organizationMembers)
            .set({ role })
            .where(
              and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.userId, userId),
              ),
            )
            .returning({ userId: organizationMembers.userId });
          if (updated.length === 0) throw notFound("Membre");
          await audit(tx, {
            actorId: actor.userId,
            actorType: "organization_member",
            action: "organization.member.role",
            subjectType: "organization_member",
            subjectId: userId,
            organizationId,
            metadata: { role },
            requestId,
          });
        });
      } catch (error) {
        translateDbError(error);
      }
    },

    async removeMember(actor, organizationId, userId, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      // Un membre peut se retirer lui-meme ; sinon il faut gerer les membres.
      if (userId !== actor.userId)
        assertCan(actor, "organization.members.manage", { organizationId });
      try {
        await db.transaction(async (tx) => {
          const deleted = await tx
            .delete(organizationMembers)
            .where(
              and(
                eq(organizationMembers.organizationId, organizationId),
                eq(organizationMembers.userId, userId),
              ),
            )
            .returning({ userId: organizationMembers.userId });
          if (deleted.length === 0) throw notFound("Membre");
          await audit(tx, {
            actorId: actor.userId,
            actorType: "organization_member",
            action: "organization.member.remove",
            subjectType: "organization_member",
            subjectId: userId,
            organizationId,
            requestId,
          });
        });
      } catch (error) {
        translateDbError(error);
      }
    },

    async createInvitation(actor, organizationId, input, deepLinkScheme, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.members.manage", { organizationId });
      const email = input.email.trim().toLowerCase();
      const token = generateInvitationToken();
      const tokenHash = hashInvitationToken(token);

      const row = await db.transaction(async (tx) => {
        // Une invitation en attente pour le meme e-mail est remplacee.
        await tx
          .delete(organizationInvitations)
          .where(
            and(
              eq(organizationInvitations.organizationId, organizationId),
              eq(organizationInvitations.email, email),
              isNull(organizationInvitations.acceptedAt),
            ),
          );
        const [created] = await tx
          .insert(organizationInvitations)
          .values({
            organizationId,
            email,
            role: input.role,
            tokenHash,
            invitedBy: actor.userId,
            expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
          })
          .returning();
        await audit(tx, {
          actorId: actor.userId,
          actorType: "organization_member",
          action: "organization.invitation.create",
          subjectType: "organization_invitation",
          subjectId: created!.id,
          organizationId,
          metadata: { role: input.role },
          requestId,
        });
        return created!;
      });
      return { ...invitationDto(row), token, link: `${deepLinkScheme}://invitations/${token}` };
    },

    async listInvitations(actor, organizationId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.members.manage", { organizationId });
      const rows = await db
        .select()
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.organizationId, organizationId),
            isNull(organizationInvitations.acceptedAt),
          ),
        );
      return rows.map(invitationDto);
    },

    async revokeInvitation(actor, organizationId, invitationId, requestId) {
      assertCanOrHide(actor, "organization.read", { organizationId }, "Organisation");
      assertCan(actor, "organization.members.manage", { organizationId });
      const deleted = await db
        .delete(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.id, invitationId),
            eq(organizationInvitations.organizationId, organizationId),
          ),
        )
        .returning({ id: organizationInvitations.id });
      if (deleted.length === 0) throw notFound("Invitation");
      await audit(db, {
        actorId: actor.userId,
        actorType: "organization_member",
        action: "organization.invitation.revoke",
        subjectType: "organization_invitation",
        subjectId: invitationId,
        organizationId,
        requestId,
      });
    },

    /**
     * Acceptation : le jeton est compare par hachage, doit etre non expire,
     * non consomme, et l'e-mail du compte connecte doit etre celui invite.
     * Toute erreur renvoie le meme 404 : on ne confirme jamais l'existence d'un jeton.
     */
    async acceptInvitation(actor, email, token, requestId) {
      if (!actor.userId) throw new DomainError("unauthenticated", "Authentification requise.");
      const userId = actor.userId;
      const [invitation] = await db
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.tokenHash, hashInvitationToken(token)))
        .limit(1);
      const invalid = notFound("Invitation");
      if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() < Date.now())
        throw invalid;
      if (!email || email.trim().toLowerCase() !== invitation.email) throw invalid;

      const [organization] = await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, invitation.organizationId))
        .limit(1);
      if (!organization) throw invalid;

      await db.transaction(async (tx) => {
        await tx
          .insert(organizationMembers)
          .values({
            organizationId: invitation.organizationId,
            userId,
            role: invitation.role,
            invitedBy: invitation.invitedBy,
          })
          .onConflictDoNothing();
        await tx
          .update(organizationInvitations)
          .set({ acceptedAt: new Date() })
          .where(eq(organizationInvitations.id, invitation.id));
        await audit(tx, {
          actorId: userId,
          actorType: "organization_member",
          action: "organization.invitation.accept",
          subjectType: "organization_invitation",
          subjectId: invitation.id,
          organizationId: invitation.organizationId,
          requestId,
        });
      });
      return {
        organizationId: organization.id,
        organizationName: organization.name,
        role: invitation.role as "manager" | "agent",
      };
    },
  };
}
